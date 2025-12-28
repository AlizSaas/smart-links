import { nanoid } from "nanoid";
import { eq, and,gt, desc, count, max, sql, lte} from "drizzle-orm";

import { protectedFunctionMiddleware } from "@/lib/auth-utils";
import { createServerFn } from "@tanstack/react-start";
import { linkClicks, links } from "@/db/schema";
import {   z } from "zod";
import { 
  createLinkSchema,
  CreateLinkSchemaType,
  destinationsSchema, 
  linkSchema 
} from "@/zod/links";



 export const baseFunction = createServerFn().middleware([
  protectedFunctionMiddleware,
]);

// Create Link
export const createLink = baseFunction
  .inputValidator(createLinkSchema)
  .handler(async ({ data, context }) => {
    const db = context.db
    const id = nanoid(10);
    
    await db.insert(links).values({
      linkId: id,
      accountId: context.userId,
      name: data.name,
      // We stringify because Drizzle/SQLite usually stores JSON as text
      destinations: JSON.stringify(data.destinations),
    });
    
    return { linkId: id };
  });

// Get all links for user
export const getLinks = baseFunction.inputValidator(z.object({createdBefore:z.number().optional()}))
  .handler(async ({ context,data }) => {
  const db = context.db
    const conditions  = [eq(links.accountId, context.userId)];

    if(data.createdBefore) {
       conditions.push(gt(links.created, new Date(data.createdBefore)) );
    }


    
    const userLinks = await db
      .select({linkId: links.linkId, name: links.name, created: links.created, destinations: links.destinations})
      .from(links)
      .where(and(...conditions))
      .orderBy(desc(links.created))
      .limit(25)

    return userLinks.map((link) => ({
      ...link,
      lastSixHours: Array.from({ length: 6 }, () =>
        Math.floor(Math.random() * 100),
      ),
      linkClicks: 6,
      destinations: Object.keys(JSON.parse(link.destinations as string)).length,
    })); // 

  });

// Get single link
export const getLink = baseFunction
  .inputValidator(
    z.object({
      linkId: z.string(),
    })
  )
  .handler(async ({ data, context }) => {
    const db = context.db

    const [link] = await db
      .select()
      .from(links)
      .where(
        and(
          eq(links.linkId, data.linkId),
          eq(links.accountId, context.userId)
        )
      )
      .limit(1);

    if (!link) {
      throw new Error("Link not found");
    }

    const parsedLink  = linkSchema.safeParse({...link,
      created: link.created.toISOString(),
      updated: link.updated.toISOString(),})
    if(!parsedLink.success){
      throw new Error("Link data is invalid");
    }


        return parsedLink.data;
  });

// Update link
export const updateLinkName = baseFunction
  .inputValidator(
    z.object({
      linkId: z.string(),
      name: z.string().min(1)
    
    })
  )
  .handler(async ({ data, context }) => {
  const db = context.db
    
    await db
      .update(links)
      .set({
        name: data.name,
      updated: new Date()
      }).where(
  and(
    eq(links.linkId, data.linkId),
    eq(links.accountId, context.userId)
  )
)
        

      
    
    return { success: true };
  });
export const updateLinkDestinations = baseFunction.inputValidator(z.object({
  linkId: z.string(),
  destinations: destinationsSchema
})
).handler(async ({context,data}) =>{
     const destinationsParsed = destinationsSchema.parse(data.destinations);
const db = context.db

  await db.update(links).set({
    destinations: JSON.stringify(destinationsParsed),
    updated: new Date()
  }).where(and(eq(links.linkId, data.linkId), eq(links.accountId, context.userId)));

  return {success:true};

})

export const activeLinks = baseFunction.handler(async ({ context }) => {
const db = context.db
  const oneHourAgo = new Date();
  oneHourAgo.setHours(oneHourAgo.getHours() - 1);

  const result = await db
    .select({
      name: links.name,
      linkId: links.linkId,
      clickCount: count(linkClicks.id),
      lastClicked: max(linkClicks.clickedTime),
    })
    .from(linkClicks)
    .innerJoin(links, eq(linkClicks.id, links.linkId))
    .where(
      and(
        gt(linkClicks.clickedTime, oneHourAgo),
        eq(linkClicks.accountId, context.userId),
      ),
    )
    .groupBy(linkClicks.id, links.name, links.linkId) // ✅ Add all non-aggregated columns
    .orderBy((fields) => desc(fields.clickCount))
    .limit(10);

  return result;
});
export const totalLinClickLastHour = baseFunction.handler(async ({context}) =>{

    const db = context.db
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);
const result = await db
      .select({
        count: count(),
      })
      .from(linkClicks)
      .where(
        and(
          gt(linkClicks.clickedTime, new Date(oneHourAgo)),
          eq(linkClicks.accountId, context.userId),
        ),
      );
  
    return result[0]?.count ?? 0;




})

export const last24HourClicks = baseFunction.handler(async ({ context }) => {
  const db = context.db
  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

  // Query for last 24 hours
  const [last24Result] = await db
    .select({
      count: count(),
    })
    .from(linkClicks)
    .where(
      and(
        gt(linkClicks.clickedTime, twentyFourHoursAgo),
        eq(linkClicks.accountId, context.userId),
      ),
    );

  // Query for previous 24 hours
  const [previous24Result] = await db
    .select({
      count: count(),
    })
    .from(linkClicks)
    .where(
      and(
        gt(linkClicks.clickedTime, fortyEightHoursAgo),
        lte(linkClicks.clickedTime, twentyFourHoursAgo),
        eq(linkClicks.accountId, context.userId),
      ),
    );

  const last24Hours = last24Result?.count ?? 0;
  const previous24Hours = previous24Result?.count ?? 0;

  let percentChange = 0;
  if (previous24Hours > 0) {
    percentChange = Math.round(
      ((last24Hours - previous24Hours) / previous24Hours) * 100,
    );
  } else if (last24Hours > 0) {
    percentChange = 100;
  }

  return {
    last24Hours,
    previous24Hours,
    percentChange,
  };
});


export const last30DaysClicks = baseFunction.handler(async ({ context }) => {
 const db = context.db
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  
    const result = await db
      .select({
        count: count(),
      })
      .from(linkClicks)
      .where(
        and(
          gt(linkClicks.clickedTime, new Date(thirtyDaysAgo)),
          eq(linkClicks.accountId, context.userId),
        ),
      );
  
    return result[0]?.count ?? 0;
  }

);
 export const clicksByCountry = baseFunction.handler(async ({context}) =>{

const db = context.db
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  
    const result = await db
      .select({
        country: linkClicks.country,
        count: count(linkClicks.id).as("count"),
      })
      .from(linkClicks)
      .where(
        and(
          gt(linkClicks.clickedTime, new Date(thirtyDaysAgo)),
          eq(linkClicks.accountId, context.userId),
        ),
      )
      .groupBy(linkClicks.country)
      .orderBy(desc(sql`count`));
  
    return result;
 })







// Single query option
