import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "@/db/schema";

/*
 * Postgres client.
 *
 * - DATABASE_URL points at Supabase's Transaction Pooler (port 6543).
 * - `prepare: false` is required because pgbouncer in transaction mode
 *   does not support prepared statements.
 * - Drizzle's relational query API (`db.query.X`) needs the schema passed in,
 *   even when the schema is empty — once we add tables it just works.
 */

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

const client = postgres(process.env.DATABASE_URL, {
  prepare: false,
});

export const db = drizzle(client, { schema });
