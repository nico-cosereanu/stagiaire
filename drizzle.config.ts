import { defineConfig } from "drizzle-kit";

/*
 * drizzle-kit uses DIRECT_URL (port 5432) so migrations run on a
 * persistent session rather than the transaction pooler.
 */

if (!process.env.DIRECT_URL) {
  throw new Error("DIRECT_URL is not set — required by drizzle-kit");
}

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DIRECT_URL,
  },
  strict: true,
  verbose: true,
});
