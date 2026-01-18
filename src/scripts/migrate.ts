#!/usr/bin/env tsx
/**
 * Database Migration Script
 *
 * Runs Drizzle migrations against the configured database.
 *
 * Usage:
 *   pnpm db:migrate
 *   DATABASE_PATH=./data/custom.db pnpm db:migrate
 */

import { DatabaseClient } from '../persistence/database/DatabaseClient';
import { join, dirname } from 'pathe';
import { fileURLToPath } from 'url';
import { ensureDirSync } from 'fs-extra';

const __dirname = dirname(fileURLToPath(import.meta.url));

function main(): void {
  const dbPath = process.env.DATABASE_PATH || './data/nexus.db';
  const migrationsDir = join(__dirname, '../persistence/database/migrations');

  console.log('========================================');
  console.log('Nexus Database Migration');
  console.log('========================================');
  console.log(`Database: ${dbPath}`);
  console.log(`Migrations: ${migrationsDir}`);
  console.log('');

  // Ensure data directory exists
  ensureDirSync(dirname(dbPath));

  console.log('Running migrations...');

  try {
    const client = DatabaseClient.create({
      path: dbPath,
      migrationsDir,
    });

    // Get health status
    const health = client.health();

    console.log('');
    console.log('Migration complete!');
    console.log('----------------------------------------');
    console.log(`WAL mode: ${health.walMode ? 'enabled' : 'disabled'}`);
    console.log(`Foreign keys: ${health.foreignKeys ? 'enabled' : 'disabled'}`);
    console.log(`Tables: ${health.tables.length}`);

    if (health.tables.length > 0) {
      console.log('');
      console.log('Tables created:');
      for (const table of health.tables.sort()) {
        console.log(`  - ${table}`);
      }
    }

    client.close();
    console.log('');
    console.log('Database connection closed.');
    console.log('========================================');
  } catch (error) {
    console.error('');
    console.error('Migration failed!');
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main();
