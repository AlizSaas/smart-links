// // @/db/index.ts
// import { drizzle } from 'drizzle-orm/neon-http';
// import { neon } from '@neondatabase/serverless';
// import * as schema from './schema';

// let db: ReturnType<typeof drizzle<typeof schema>> | null = null;

// export function initDb(databaseUrl: string) {
//   if (!db) {
//     const sql = neon(databaseUrl);
//     db = drizzle(sql, { schema });
//   }
//   return db;
// }

// export function getDb() {
//   if (!db) {
//     throw new Error('Database not initialized. Call initDb first.');
//   }
//   return db;
// }

// export type Database = ReturnType<typeof getDb>;

// @/db/index.ts

import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from './schema';

export function createDb(databaseUrl: string) {
  const sql = neon(databaseUrl);
  return drizzle(sql, { schema });
}

export type Database = ReturnType<typeof createDb>;