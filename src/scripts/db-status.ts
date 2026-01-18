#!/usr/bin/env tsx
/**
 * Database Status Script
 *
 * Shows current database status and health information.
 *
 * Usage:
 *   pnpm db:status
 *   DATABASE_PATH=./data/custom.db pnpm db:status
 */

import { DatabaseClient } from '../persistence/database/DatabaseClient';
import { existsSync } from 'fs-extra';

function main(): void {
  const dbPath = process.env.DATABASE_PATH || './data/nexus.db';

  console.log('========================================');
  console.log('Nexus Database Status');
  console.log('========================================');
  console.log(`Database path: ${dbPath}`);
  console.log(`File exists: ${existsSync(dbPath)}`);

  if (!existsSync(dbPath)) {
    console.log('');
    console.log('Database does not exist.');
    console.log('Run `pnpm db:migrate` to create it.');
    console.log('========================================');
    return;
  }

  try {
    const client = DatabaseClient.create({
      path: dbPath,
    });

    const health = client.health();

    console.log('');
    console.log('Connection: OK');
    console.log(`WAL mode: ${health.walMode ? 'enabled' : 'disabled'}`);
    console.log(`Foreign keys: ${health.foreignKeys ? 'enabled' : 'disabled'}`);
    console.log(`Tables: ${health.tables.length}`);

    if (health.tables.length > 0) {
      console.log('');
      console.log('Tables:');
      for (const table of health.tables.sort()) {
        // Get row count for each table
        const countResult = client.raw
          .prepare(`SELECT COUNT(*) as count FROM "${table}"`)
          .get() as { count: number };
        console.log(`  - ${table}: ${countResult.count} rows`);
      }
    }

    client.close();
    console.log('');
    console.log('========================================');
  } catch (error) {
    console.error('');
    console.error('Error checking database status:');
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main();
