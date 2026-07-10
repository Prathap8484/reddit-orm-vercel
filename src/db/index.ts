import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema.js';

// Ensure DATABASE_URL is available
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is missing from environment variables.');
}

// Initialize the neon connection using the connection string from env
const sql = neon(process.env.DATABASE_URL);

// Create the Drizzle ORM instance with the provided schema
export const db = drizzle(sql, { schema });
