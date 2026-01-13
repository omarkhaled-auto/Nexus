import type { Config } from 'drizzle-kit';

export default {
  schema: './src/persistence/database/schema.ts',
  out: './src/persistence/database/migrations',
  dialect: 'sqlite',
  dbCredentials: {
    url: process.env.DATABASE_PATH || './data/nexus.db',
  },
} satisfies Config;
