/**
 * Seed script: fills the database with sample data and auto-generates
 * table_seats and bus_seats for events. Run with: npm run db:seed
 * Or set RUN_SEED=true and start the app to run seed on startup.
 */
import 'dotenv/config';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';
import { runSeedDb, seedPresetDemoEvents } from './seed-data';

async function main() {
  const pool = new Pool({ connectionString: 
process.env.DATABASE_URL });
  const db = drizzle(pool, { schema }) as import('./seed-data').SeedDb;

  console.log(':seedling: Seeding database...');
  const didSeed = await runSeedDb(db);
  if (!didSeed) {
    console.log('  :track_next:  Database already has data. Skipping base seed.');
  } else {
    console.log('  ✓ Roles, users, user_roles');
    console.log(
      '  ✓ Events with table_count, seats_per_table, bus_count, bus_capacity',
    );
    console.log('  ✓ Table seats and bus seats auto-generated');
    console.log('  ✓ Sample tickets and seat assignments');
    console.log(':white_check_mark: Base seed completed.');
  }

  const preset = await seedPresetDemoEvents(db);
  if (preset.inserted > 0) {
    console.log(
      `  ✓ Inserted ${preset.inserted} preset demo event(s) (paid/free, table/bus mix + image URLs).`,
    );
  }
  if (preset.skipped > 0) {
    console.log(
      `  ✓ Preset events already present (${preset.skipped} skipped by name).`,
    );
  }
  await pool.end();
}

main().catch((err: unknown) => {
  const msg =
    err instanceof Error
      ? err.message
      : typeof err === 'object' && err !== null && 'message' in err
        ? String((err as { message: unknown }).message)
        : String(err);
  const code =
    typeof err === 'object' && err !== null && 'code' in err
      ? (err as { code: string }).code
      : undefined;
  if (code === '42P01' || /relation .* does not exist/i.test(msg)) {
    console.error(':x: Seed failed: Database tables do not exist.');
    console.error('');
    console.error('   Run the schema first, then seed:');
    console.error('   npm run db:push');
    console.error('   npm run db:seed');
    console.error('');
    console.error('   Or do both in one step:');
    console.error('   npm run db:setup');
  } else {
    console.error(':x: Seed failed:', err);
  }
  process.exit(1);
});