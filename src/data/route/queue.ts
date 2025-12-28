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


export async function captureLinkClickInBackground(env: Env, event: LinkClickMessageType) {
  console.log('Capturing link click in background:', event.data.latitude, event.data.longitude);
	await env.LINK_QUEUE.send(event)
	const doId = env.LINK_CLICK_TRACKER_OBJECT.idFromName(event.data.accountId);
	const stub = env.LINK_CLICK_TRACKER_OBJECT.get(doId);
	if (!event.data.latitude || !event.data.longitude || !event.data.country) return
	await stub.addClick(
		event.data.latitude,
		event.data.longitude,
		event.data.country,
		moment().valueOf()
	)
}