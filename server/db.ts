import { drizzle } from "drizzle-orm/node-postgres";
import pkg from "pg";
const { Pool } = pkg;
import * as schema from "@shared/schema";
import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Initialize Postgres connection
console.log("DATABASE_URL:", process.env.DATABASE_URL);
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Create Drizzle instance with the schema
export const db = drizzle(pool, { schema });
export { pool };