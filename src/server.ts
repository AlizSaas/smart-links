// src/server.ts
import handler from "@tanstack/react-start/server-entry";
import { WorkerEntrypoint } from "cloudflare:workers";

import { initAuth } from "./lib/initauth";
import { QueueMessageSchema } from "./zod/queue";
import { handleLinkClick } from "./data/route/queue";
import { createDb, Database } from "./db";
import { handleClickSocket } from "./ws/click-socket";

export  { DestiEvalWorkflow } from './data/workflows/destination-evalutation-workflow';
export {EvaluationScheduler} from './data/durable-objects/schedule-evaluation'
export { LinkClickTracker } from './data/durable-objects/link-click-tracker';

console.log("[server-entry]: using custom server entry in 'src/server.ts'");

export default class MyWorker extends WorkerEntrypoint<Env> {
  private db: Database;

  constructor(ctx: ExecutionContext, env: Env) {
    super(ctx, env); // Must call parent first
    this.db = createDb(this.env.DATABASE_URL); // Then initialize db once
  }

  async fetch(request: Request): Promise<Response> {
    // Initialize auth (this is lightweight, no connection)
      initAuth({
      db: this.db, // Reuse the same instance
   
      googleClientId: this.env.GOOGLE_CLIENT_ID,
      googleClientSecret: this.env.GOOGLE_CLIENT_SECRET,
      betterAuthSecret: this.env.BETTER_AUTH_SECRET,
      betterAuthUrl: this.env.BETTER_AUTH_URL,
    });

 const url = new URL(request.url);
    if (url.pathname === "/click-socket") {
    return handleClickSocket(request, this.env);
  }
  
    // Pass to TanStack Start handler - reuse this.db
    return handler.fetch(request, {
      context: {
        fromFetch: true,
        db: this.db, // Reuse the same instance
        workerCtx: this.ctx,
        env: this.env,
      },
    });
  }

  async queue(batch: MessageBatch<unknown>): Promise<void> {

    for (const message of batch.messages) {
      try {
        const parsedEvent = QueueMessageSchema.safeParse(message.body);
        
        if (parsedEvent.success) {
          const event = parsedEvent.data;
          
          if (event.type === 'LINK_CLICK') {
            await handleLinkClick(this.env, event,this.db); // Use this.db
            
           
          }
        } else {
          console.error('Invalid message received in queue:', parsedEvent.error);
        
        }
      } catch (error) {
        console.error('Error processing queue message:', error);
   
      }
    }
  }

  
}