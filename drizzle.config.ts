import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';

// Load .env if running locally for drizzle-kit
dotenv.config();
dotenv.config({ path: '.env.local' });

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL as string,
  },
  verbose: true,
  strict: true,
});
