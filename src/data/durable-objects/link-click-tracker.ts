
import { DurableObject } from 'cloudflare:workers';
import { deleteClicksBefore, getRecentClicks } from './durable-queries';

// Configuration for alarm scheduling
const BROADCAST_INTERVAL_MS = 2000; // 2 seconds between broadcasts
const IDLE_TIMEOUT_MS = 60000; // Stop alarm after 1 minute of no clicks

export class LinkClickTracker extends DurableObject {
    sql: SqlStorage;
    mostRecentOffsetTime: number = 0; // timestamp of most recent click sent to clients
	leastRecentOffsetTime: number = 0; // timestamp of least recent click still in storage
    lastClickTime: number = 0; // Track when the last click was received

    constructor(ctx: DurableObjectState, env: Env) {
		super(ctx, env);
        this.sql = ctx.storage.sql;

        ctx.blockConcurrencyWhile(async () => {
            const [leastRecentOffsetTime, mostRecentOffsetTime, lastClickTime] = await Promise.all([
				ctx.storage.get<number>('leastRecentOffsetTime'),
				ctx.storage.get<number>('mostRecentOffsetTime'),
				ctx.storage.get<number>('lastClickTime'),
			]);

            this.leastRecentOffsetTime = leastRecentOffsetTime || this.leastRecentOffsetTime;
			this.mostRecentOffsetTime = mostRecentOffsetTime || this.mostRecentOffsetTime;
            this.lastClickTime = lastClickTime || this.lastClickTime;

            this.sql.exec(`
                CREATE TABLE IF NOT EXISTS geo_link_clicks (
                    latitude REAL NOT NULL,
                    longitude REAL NOT NULL,
                    country TEXT NOT NULL,
                    time INTEGER NOT NULL
                )
            `);
        })
    }

    async addClick(latitude: number, longitude: number, country: string, time: number) {
		this.sql.exec(
			`
			INSERT INTO geo_link_clicks (latitude, longitude, country, time)
			VALUES (?, ?, ?, ?)
			`,
			latitude,
			longitude,
			country,
			time,
		);
        
        // Track last click time
        this.lastClickTime = Date.now();
        await this.ctx.storage.put('lastClickTime', this.lastClickTime);
        
        // Only set alarm if not already scheduled
        const alarm = await this.ctx.storage.getAlarm();
		if (!alarm) {
            await this.ctx.storage.setAlarm(Date.now() + BROADCAST_INTERVAL_MS);
        }
    }

    async alarm() {
        const now = Date.now();
        const sockets = this.ctx.getWebSockets();
        
        // If no connected clients, skip processing but still clean up old data
        if (sockets.length === 0) {
            // Clean up old clicks to prevent storage bloat
            const clickData = getRecentClicks(this.sql, this.mostRecentOffsetTime);
            if (clickData.clicks.length > 0) {
                await this.flushOffsetTimes(clickData.mostRecentTime, clickData.oldestTime);
                await deleteClicksBefore(this.sql, clickData.oldestTime);
            }
            // Don't re-arm alarm - will be set when new click arrives
            return;
        }

        // Get recent clicks and broadcast to connected clients
        const clickData = getRecentClicks(this.sql, this.mostRecentOffsetTime);

        if (clickData.clicks.length > 0) {
            const message = JSON.stringify(clickData.clicks);
            for (const socket of sockets) {
                try {
                    socket.send(message);
                } catch (err) {
                    console.error('Failed to send to WebSocket:', err);
                }
            }

            await this.flushOffsetTimes(clickData.mostRecentTime, clickData.oldestTime);
            await deleteClicksBefore(this.sql, clickData.oldestTime);
        }

        // Smart alarm re-scheduling:
        // - If recent activity (within IDLE_TIMEOUT_MS), continue broadcasting
        // - If idle for too long, stop the alarm (saves resources)
        const timeSinceLastClick = now - this.lastClickTime;
        if (timeSinceLastClick < IDLE_TIMEOUT_MS && sockets.length > 0) {
            await this.ctx.storage.setAlarm(now + BROADCAST_INTERVAL_MS);
        }
        // Otherwise, don't re-arm - alarm will be set when new click arrives
    }


    async flushOffsetTimes(mostRecentOffsetTime: number, leastRecentOffsetTime: number) {
		this.mostRecentOffsetTime = mostRecentOffsetTime;
		this.leastRecentOffsetTime = leastRecentOffsetTime;
		await this.ctx.storage.put('mostRecentOffsetTime', this.mostRecentOffsetTime);
		await this.ctx.storage.put('leastRecentOffsetTime', this.leastRecentOffsetTime);
	} // end flushOffsetTimes 

    async fetch(_: Request) {
        const webSocketPair = new WebSocketPair();
        const [client, server] = Object.values(webSocketPair);
        this.ctx.acceptWebSocket(server);
        
        // Ensure alarm is running when a client connects
        const alarm = await this.ctx.storage.getAlarm();
        if (!alarm) {
            await this.ctx.storage.setAlarm(Date.now() + BROADCAST_INTERVAL_MS);
        }
        
        return new Response(null, {
            status: 101,
            webSocket: client
        });
	}

    webSocketClose(_ws: WebSocket, _code: number, _reason: string, _wasClean: boolean): void | Promise<void> {
        console.log("WebSocket client disconnected");
    }
}
