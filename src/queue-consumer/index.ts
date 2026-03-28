// src/queue-consumer/index.ts
// Separate queue consumer worker - handles queue processing
// This keeps the main worker responsive for web requests

import { WorkerEntrypoint } from "cloudflare:workers";
import { QueueMessageSchema } from "../zod/queue";
import { createDb, Database } from "../db";
import { linkClicks } from "../db/schema";
import type { LinkClickMessageType } from "../zod/queue";

export default class QueueConsumerWorker extends WorkerEntrypoint<Env> {
  private db: Database;

  constructor(ctx: ExecutionContext, env: Env) {
    super(ctx, env);
    this.db = createDb(this.env.DATABASE_URL);
  }

  // Handle queue messages - offloaded from main worker
  async queue(batch: MessageBatch<unknown>): Promise<void> {
    // Process messages in parallel for better throughput
    const processingPromises = batch.messages.map(async (message) => {
      try {
        const parsedEvent = QueueMessageSchema.safeParse(message.body);

        if (parsedEvent.success) {
          const event = parsedEvent.data;

          if (event.type === "LINK_CLICK") {
            await this.handleLinkClick(event);
          }
        } else {
          console.error(
            "Invalid message received in queue:",
            parsedEvent.error
          );
        }
      } catch (error) {
        console.error("Error processing queue message:", error);
        // Let the message retry by not acknowledging it
        throw error;
      }
    });

    // Wait for all messages to be processed
    await Promise.allSettled(processingPromises);
  }

  private async handleLinkClick(event: LinkClickMessageType): Promise<void> {
    // Insert click data into database
    await this.db.insert(linkClicks).values({
      id: event.data.id,
      accountId: event.data.accountId,
      destination: event.data.destination,
      country: event.data.country,
      clickedTime: new Date(event.data.timestamp),
      latitude: event.data.latitude,
      longitude: event.data.longitude,
    });

    // Schedule evaluation workflow via Durable Object
    await this.scheduleEvalWorkflow(event);
  }

  private async scheduleEvalWorkflow(event: LinkClickMessageType): Promise<void> {
    const doId = this.env.SCHEDULE_EVALUATION.idFromName(
      `${event.data.id}:${event.data.destination}`
    );
    const stub = this.env.SCHEDULE_EVALUATION.get(doId);

    await stub.collectLinkClick(
      event.data.accountId,
      event.data.id,
      event.data.destination,
      event.data.country || "UNKNOWN"
    );
  }

  // Required fetch handler (minimal - this worker is queue-focused)
  async fetch(): Promise<Response> {
    return new Response("Queue consumer worker - not for direct requests", {
      status: 200,
    });
  }
}
