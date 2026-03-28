// src/server.ts
// Main worker - handles web requests, WebSocket connections, and serves the app
// Queue processing has been moved to a separate worker (queue-consumer) for better performance

import handler from "@tanstack/react-start/server-entry";
import { WorkerEntrypoint } from "cloudflare:workers";

import { initAuth } from "./lib/initauth";
import { createDb, Database } from "./db";
import { handleClickSocket } from "./ws/click-socket";

// Export Durable Objects and Workflows for Cloudflare bindings
export { DestiEvalWorkflow } from './data/workflows/destination-evalutation-workflow';
export { EvaluationScheduler } from './data/durable-objects/schedule-evaluation';
export { LinkClickTracker } from './data/durable-objects/link-click-tracker';

console.log("[server-entry]: using custom server entry in 'src/server.ts'");

export default class MyWorker extends WorkerEntrypoint<Env> {
  private db: Database;

  constructor(ctx: ExecutionContext, env: Env) {
    super(ctx, env);
    this.db = createDb(this.env.DATABASE_URL);
  }

  async fetch(request: Request): Promise<Response> {
    // Initialize auth (lightweight, no DB connection)
    initAuth({
      db: this.db,
      googleClientId: this.env.GOOGLE_CLIENT_ID,
      googleClientSecret: this.env.GOOGLE_CLIENT_SECRET,
      betterAuthSecret: this.env.BETTER_AUTH_SECRET,
      betterAuthUrl: this.env.BETTER_AUTH_URL,
    });

    const url = new URL(request.url);
    
    // WebSocket connection for real-time click tracking
    if (url.pathname === "/click-socket") {
      return handleClickSocket(request, this.env);
    }

    // Pass to TanStack Start handler for all other routes
    return handler.fetch(request, {
      context: {
        fromFetch: true,
        db: this.db,
        workerCtx: this.ctx,
        env: this.env,
      },
    });
  }

  // Note: Queue processing has been moved to a separate worker (queue-consumer)
  // This keeps the main worker responsive for web requests
}