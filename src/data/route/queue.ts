import {  Database } from "@/db";
import { linkClicks } from "@/db/schema";
import { LinkClickMessageType } from "@/zod/queue";
import { scheduleEvalWorkflow } from "../durable-objects/schedule-workflow";
import moment from "moment";

 export async function addLinkClick(db: Database, info: LinkClickMessageType["data"]) {
    await db.insert(linkClicks).values({
      id: info.id,
      accountId: info.accountId,
      destination: info.destination,
      country: info.country,
      clickedTime: new Date(info.timestamp),
      latitude: info.latitude,
      longitude: info.longitude,

    });
  }
export async function handleLinkClick(env:Env, event:LinkClickMessageType,db:Database) {
    await addLinkClick(db,event.data,);
    await scheduleEvalWorkflow(env, event);
 
} //this function will be used  in the server.ts the entry to the cloudflare workers inside of the queue method it will run the queue 
// and schedule the destinaion workflow using durable object alarm 


/**
 * Optimized background click capture
 * - Sends click to queue for async processing (DB insert + workflow scheduling)
 * - Sends to Durable Object for real-time WebSocket broadcast
 * - Non-blocking: both operations run in parallel
 */
export async function captureLinkClickInBackground(env: Env, event: LinkClickMessageType) {
  const { latitude, longitude, country, accountId } = event.data;
  
  // Only send to Durable Object if we have geo data
  const hasGeoData = latitude !== undefined && longitude !== undefined && country;
  
  // Run queue send and DO update in parallel for speed
  const promises: Promise<void>[] = [
    // Always send to queue - handled by separate queue consumer worker
    env.LINK_QUEUE.send(event).catch((err) => {
      console.error('Failed to send to queue:', err);
    }),
  ];

  // Only update DO for real-time WebSocket broadcast if we have geo data
  if (hasGeoData) {
    // Use correct binding name: LINK_CLICK_TRACKER (not LINK_CLICK_TRACKER_OBJECT)
    const doId = env.LINK_CLICK_TRACKER.idFromName(accountId);
    const stub = env.LINK_CLICK_TRACKER.get(doId);
    
    promises.push(
      stub.addClick(
        latitude as number,
        longitude as number,
        country as string,
        moment().valueOf()
      ).catch((err) => {
        console.error('Failed to send to DO:', err);
      })
    );
  }

  // Wait for both operations - they run in parallel
  await Promise.all(promises);
}