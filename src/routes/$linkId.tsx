// src/routes/$linkId.tsx
import { getDestinationForCountry } from '@/data/links/link-query'
import { getRoutingDestinations } from '@/data/route/kv-route'
import { captureLinkClickInBackground } from '@/data/route/queue'
import { cloudflareInfoSchema } from '@/zod/links'
import type { LinkClickMessageType } from '@/zod/queue'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/$linkId')({
  server: {
    handlers: {
      GET: async ({ params, context, request }) => {
        const { linkId } = params;
        const linkInfo = await getRoutingDestinations(context.env, linkId, context.db);

        if (!linkInfo) {
          return new Response('Not Found', { status: 404 });
        }

        // Access CF object from the request
        const cf = (request as any).cf ?? {};
        
        // Parse the CF headers
        const cfHeaders = cloudflareInfoSchema.safeParse(cf);

        if (!cfHeaders.success) {
          console.error('CF headers parse error:', cfHeaders.error);
        }

        const country = cfHeaders.success && cfHeaders.data.country 
          ? cfHeaders.data.country 
          : undefined;

        // Get destination based on country
        const destination = getDestinationForCountry(linkInfo, country);

        // Ensure destination is an absolute URL
        if (!destination) {
          return new Response('Destination not found', { status: 404 });
        }

        const latitude = cfHeaders.data?.latitude,
          longitude = cfHeaders.data?.longitude;

  

        // Create queue message with proper typing
        const queueMessage: LinkClickMessageType = {
          type: 'LINK_CLICK',
          data: {
            id: linkId,
            accountId: linkInfo.accountId,
            destination: destination,
            country: country,
            timestamp: new Date().toISOString(),
            latitude: latitude,
            longitude: longitude,
          }
        };

        console.log('accountId for the ', queueMessage.data.accountId)

        // Send to queue asynchronously (non-blocking)
        context.workerCtx.waitUntil(
          captureLinkClickInBackground(context.env, queueMessage)
      
        );

        // Redirect immediately
        return Response.redirect(destination, 302);
      },
    },
  },
})