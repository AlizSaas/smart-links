import { LinkClickMessageType } from "@/zod/queue";

export async function scheduleEvalWorkflow(env: Env, event: LinkClickMessageType) {
	const doId = env.SCHEDULE_EVALUATION.idFromName(`${event.data.id}:${event.data.destination}`);
	const stub = env.SCHEDULE_EVALUATION.get(doId)
    
	await stub.collectLinkClick(
		event.data.accountId,
		event.data.id,
		event.data.destination,
		event.data.country || "UNKNOWN"
	)
}  //this function can be used to directly schedule evaluation from other places 