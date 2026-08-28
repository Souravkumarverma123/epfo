import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "./env";
import * as schema from "./schema";

const pool = new Pool({
  connectionString: env.DATABASE_URL,
  // Small pool: many short-lived invocations share one Postgres instance.
  max: 5,
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 10_000,
});

export const db = drizzle(pool, { schema });
export * from "drizzle-orm";
export * from "./schema";
export default db;
