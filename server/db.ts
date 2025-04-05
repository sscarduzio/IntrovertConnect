import { drizzle } from "drizzle-orm/node-postgres";
import pkg from "pg";
const { Pool } = pkg;
import * as schema from "@shared/schema";

// Initialize Postgres connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Create Drizzle instance with the schema
export const db = drizzle(pool, { schema });
export { pool };