/**
 * Database connection — Neon PostgreSQL via @neondatabase/serverless
 * Uses the WebSocket (neon-serverless) driver which is compatible with drizzle-orm 0.39+.
 */
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

// Required for WebSocket support in Node.js (not needed in browser/edge runtimes)
neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });
export type DB = typeof db;
