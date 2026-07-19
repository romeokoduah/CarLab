import { Pool } from "pg";

/**
 * Single shared pg connection pool. Reused across the Node server's route
 * handlers and server components. Configured from DATABASE_URL.
 */
let pool: Pool | undefined;

export function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is not set");
    }
    pool = new Pool({ connectionString, max: 10 });
  }
  return pool;
}
