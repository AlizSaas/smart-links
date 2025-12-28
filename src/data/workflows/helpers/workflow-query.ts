
import { Database } from "@/db";
import { destinationEvaluations } from "@/db/schema";

export async function addEvaluation(db: Database, data: {
  evaluationId: string;
  linkId: string;
  accountId: string;
  destinationUrl: string;
  status: string;
  reason: string;

}) {

  await db.insert(destinationEvaluations).values({
    id: data.evaluationId,
    linkId: data.linkId,
    accountId: data.accountId,
    destinationUrl: data.destinationUrl,
    status: data.status,
    reason: data.reason,
  });
}