// db/queries/links.ts
import { nanoid } from "nanoid";
import { and, eq, gt, desc, count, max, lte, sql } from "drizzle-orm";
import { links, linkClicks } from "@/db/schema";
import { destinationsSchema, LinkSchemaType } from "@/zod/links";
import { Database } from "@/db";

// ---------------- CREATE ----------------
export async function createLinkQuery(
  db: Database,
  params: {
    accountId: string;
    name: string;
    destinations: unknown;
  }
) {
  const id = nanoid(10);

  await db.insert(links).values({
    linkId: id,
    accountId: params.accountId,
    name: params.name,
    destinations: JSON.stringify(params.destinations),
  });

  return { linkId: id };
}

// ---------------- LIST ----------------
export async function getLinksQuery(
  db: Database,
  params: {
    accountId: string;
    createdBefore?: number;
  }
) {
  const conditions = [eq(links.accountId, params.accountId)];

  if (params.createdBefore) {
    conditions.push(gt(links.created, new Date(params.createdBefore)));
  }

  const rows = await db
    .select({
      linkId: links.linkId,
      name: links.name,
      created: links.created,
      destinations: links.destinations,
    })
    .from(links)
    .where(and(...conditions))
    .orderBy(desc(links.created))
    .limit(25);

  return rows;
}

// ---------------- SINGLE ----------------
export async function getLinkQuery(
  db: Database,
  params: {
    accountId: string;
    linkId: string;
  }
) {
  const [link] = await db
    .select()
    .from(links)
    .where(
      and(
        eq(links.linkId, params.linkId),
        eq(links.accountId, params.accountId)
      )
    )
    .limit(1);

  return link ?? null;
}

// ---------------- UPDATE ----------------
export async function updateLinkNameQuery(
  db: Database,
  params: {
    accountId: string;
    linkId: string;
    name: string;
  }
) {
  await db
    .update(links)
    .set({ name: params.name, updated: new Date() })
    .where(
      and(
        eq(links.linkId, params.linkId),
        eq(links.accountId, params.accountId)
      )
    );
}

export async function updateLinkDestinationsQuery(
  db: Database,
  params: {
    accountId: string;
    linkId: string;
    destinations: unknown;
  }
) {
  const parsed = destinationsSchema.parse(params.destinations);

  await db
    .update(links)
    .set({
      destinations: JSON.stringify(parsed),
      updated: new Date(),
    })
    .where(
      and(
        eq(links.linkId, params.linkId),
        eq(links.accountId, params.accountId)
      )
    );
}

// ---------------- ANALYTICS ----------------
export async function activeLinksQuery(
  db: Database,
  accountId: string
) {
  const oneHourAgo = new Date();
  oneHourAgo.setHours(oneHourAgo.getHours() - 1);

  return db
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
        eq(linkClicks.accountId, accountId)
      )
    )
    .groupBy(linkClicks.id, links.name, links.linkId)
    .orderBy((f) => desc(f.clickCount))
    .limit(10);
}

export async function totalClicksLastHourQuery(
  db: Database,
  accountId: string
) {
  const oneHourAgo = new Date();
  oneHourAgo.setHours(oneHourAgo.getHours() - 1);

  const [row] = await db
    .select({ count: count() })
    .from(linkClicks)
    .where(
      and(
        gt(linkClicks.clickedTime, oneHourAgo),
        eq(linkClicks.accountId, accountId)
      )
    );

  return row?.count ?? 0;
}

export async function clicksByCountryQuery(
  db: Database,
  accountId: string
) {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  return db
    .select({
      country: linkClicks.country,
      count: count(linkClicks.id).as("count"),
    })
    .from(linkClicks)
    .where(
      and(
        gt(linkClicks.clickedTime, thirtyDaysAgo),
        eq(linkClicks.accountId, accountId)
      )
    )
    .groupBy(linkClicks.country)
    .orderBy(desc(sql`count`));
}


export function getDestinationForCountry(linkInfo: LinkSchemaType, countryCode?: string) {
	if (!countryCode) {
		return linkInfo.destinations.default;
	} // No country code provided

	// Check if the country code exists in destinations
	if (linkInfo.destinations[countryCode]) {
		return linkInfo.destinations[countryCode];
	} // Exact match found

	// Fallback to default
	return linkInfo.destinations.default;
}