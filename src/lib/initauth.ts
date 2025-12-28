import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';

import * as schema from '../db/schema';
import { Database } from '@/db';

let authInstance: ReturnType<typeof betterAuth> | null = null;

interface AuthConfig {
  db: Database; 

  googleClientId: string;
  googleClientSecret: string;
  betterAuthSecret: string;
  betterAuthUrl: string;
}

export function initAuth(config: AuthConfig) {
  if (!authInstance) {
    authInstance = betterAuth({
      database: drizzleAdapter(config.db, {
        provider: 'pg',
        schema,
      }),
      socialProviders: {
        google: {
          clientId: config.googleClientId,
          clientSecret: config.googleClientSecret,
        },
      },
      secret: config.betterAuthSecret,
      baseURL: config.betterAuthUrl,
    });
  }
  
  return authInstance;
}

export function getAuth() {
  if (!authInstance) {
    throw new Error('Auth not initialized. Call initAuth first.');
  }
  return authInstance;
}

export type Auth = ReturnType<typeof getAuth>;