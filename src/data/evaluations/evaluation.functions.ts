
import { eq, and,gt, desc} from "drizzle-orm";


import {   z } from "zod";
import { baseFunction } from "../links/link-functions";
import { destinationEvaluations } from "@/db/schema";


export const problematicDestinations = baseFunction.handler(async ({context} ) =>{

const db  = context.db;
const result  = await db.select().from(destinationEvaluations).where(and(
  eq(destinationEvaluations.accountId, context.userId),
  eq(destinationEvaluations.status,"NOT_AVAILABLE_PRODUCT")
)).orderBy(desc(destinationEvaluations.createdAt)).limit(20);

return result;
})

export const recentEvaluations  = baseFunction.inputValidator(z.object({createdBefore:z.string().optional()})
).handler(async ({context,data}) =>{

const db  = context.db;
const conditions  = [eq(destinationEvaluations.accountId, context.userId)];
if(data.createdBefore){
  conditions.push(gt(destinationEvaluations.createdAt, new Date(data.createdBefore)));
}

const evaluations  = await db.select().from(destinationEvaluations).where(and(...conditions)).orderBy(desc(destinationEvaluations.createdAt)).limit(20);
const oldestCreatedAt =
        evaluations.length > 0
          ? evaluations[evaluations.length - 1].createdAt
          : null;

          return {
            data:evaluations,
            oldestCreatedAt:oldestCreatedAt,
          }
})

