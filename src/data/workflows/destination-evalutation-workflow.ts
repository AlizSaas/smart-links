
import { WorkflowEntrypoint, WorkflowEvent, WorkflowStep } from "cloudflare:workers";
import { v4 as uuidv4 } from "uuid";
import { collectDestinationInfo } from "./browser-render";
import { aiDestinationChecker } from "./helpers/ai-destination-checker";
import { addEvaluation } from "./helpers/workflow-query";
import { createDb } from "@/db";

export class DestiEvalWorkflow extends WorkflowEntrypoint<
  Env,
  DestinationStatusEvaluationParams
> {
  async run(
    event: Readonly<WorkflowEvent<DestinationStatusEvaluationParams>>,
    step: WorkflowStep
  ) {
const db = createDb(this.env.DATABASE_URL); // ✅ Create fresh instance

  const evaluationInfo =   await step.do(
      "Collect rendered destination page data",
      {
        retries: { limit: 1, delay: 1000 },
      },
      async () => {
        const evaluationId = uuidv4();
        const data = await collectDestinationInfo(
          this.env,
          event.payload.destinationUrl
        );

        const accountId = event.payload.accountId;

        const r2PathHtml = `evaluations/${accountId}/html/${evaluationId}.html`;
        const r2PathBodyText = `evaluations/${accountId}/body-text/${evaluationId}.txt`;
        const r2PathScreenshot = `evaluations/${accountId}/screenshots/${evaluationId}.png`;

        // ✅ HTML
        await this.env.R2BUCKET.put(r2PathHtml, data.html, {
          httpMetadata: { contentType: "text/html" },
        });

        // ✅ Body text
        await this.env.R2BUCKET.put(r2PathBodyText, data.bodyText, {
          httpMetadata: { contentType: "text/plain" },
        });

        // ✅ Screenshot (NO base64, NO conversion)
        await this.env.R2BUCKET.put(r2PathScreenshot, data.screenShot, {
          httpMetadata: { contentType: "image/png" },
        });

        return {
          bodyText: data.bodyText,
          evaluationId,
        };
      }
    );
    	const aiStatus = await step.do(
			'Use AI to check status of page',
			{
				retries: {
					limit: 0,
					delay: 0,
				},
			},
			async () => {
				return await aiDestinationChecker(this.env, evaluationInfo.bodyText);
			},
		);

    await step.do('Save evaluation in database', async () => {
			return await addEvaluation(db,{
             
                
				evaluationId: evaluationInfo.evaluationId,
				linkId: event.payload.linkId,
				status: aiStatus.status,
				reason: aiStatus.statusReason,
				accountId: event.payload.accountId,
				destinationUrl: event.payload.destinationUrl,
			});
		});
  }
}
