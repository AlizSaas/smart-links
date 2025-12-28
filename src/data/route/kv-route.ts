import { Database } from "@/db";
import { links } from "@/db/schema";
import { linkSchema, LinkSchemaType } from "@/zod/links";
import { eq } from "drizzle-orm";

export async function getLink(linkId: string, db: Database) {
  const result = await db
    .select()
    .from(links)
    .where(eq(links.linkId, linkId))
    .limit(1);

  if (!result.length) {
    return null;
  }

  const link = result[0];
  
  // Convert Date objects to ISO strings before parsing
  const linkWithStringDates = {
    ...link,
    created: link.created instanceof Date ? link.created.toISOString() : link.created,
    updated: link.updated instanceof Date ? link.updated.toISOString() : link.updated,
  };
  
  const parsedLink = linkSchema.safeParse(linkWithStringDates);
  
  if (!parsedLink.success) {
    console.error('Error parsing link from DB:', parsedLink.error);
    throw new Error("BAD_REQUEST Error Parsing Link");
  }
  
  return parsedLink.data;
}

async function getLinkInfoFromKv(env: Env, id: string) {
  const linkInfo = await env.KVCACHE.get(id);
  if (!linkInfo) return null;
  
  try {
    const parsedLinkInfo = JSON.parse(linkInfo);
    const validated = linkSchema.safeParse(parsedLinkInfo);
    
    if (!validated.success) {
      console.error('Invalid link data in KV cache:', validated.error);
      return null;
    }
    
    return validated.data;
  } catch (error) {
    console.error('Error parsing link from KV:', error);
    return null;
  }
}

const TTL_TIME = 60 * 60 * 24; // 1 day

async function saveLinkInfoToKv(env: Env, id: string, linkInfo: LinkSchemaType) {
  try {
    await env.KVCACHE.put(
      id, 
      JSON.stringify(linkInfo),
      {
        expirationTtl: TTL_TIME
      }
    );
  } catch (error) {
    console.error('Error saving link info to KV:', error);
  }
}

export async function getRoutingDestinations(env: Env, id: string, db: Database) {
  // Try KV cache first
  const linkInfo = await getLinkInfoFromKv(env, id);
  if (linkInfo) return linkInfo;
  
  // Fall back to database
  const linkInfoFromDb = await getLink(id, db);
  if (!linkInfoFromDb) return null;
  
  // Cache for next time
  await saveLinkInfoToKv(env, id, linkInfoFromDb);
  
  return linkInfoFromDb;
}