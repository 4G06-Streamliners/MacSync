/**
 * Seed script: fills the database with sample data and auto-generates
 * table_seats and bus_seats for events. Run with: npm run db:seed
 * Or set RUN_SEED=true and start the app to run seed on startup.
 */
import 'dotenv/config';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';
import { runSeedDb } from './seed-data';

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema }) as import('./seed-data').SeedDb;

  console.log('🌱 Seeding database...');
  const didSeed = await runSeedDb(db);
  if (!didSeed) {
    console.log('  ⏭️  Database already has data. Skipping.');
  } else {
    console.log('  ✓ Roles, users, user_roles');
    console.log('  ✓ Events with table_count, seats_per_table, bus_count, bus_capacity');
    console.log('  ✓ Table seats and bus seats auto-generated');
    console.log('  ✓ Sample tickets and seat assignments');
    console.log('✅ Seed completed.');
  }
  await pool.end();
}

main().catch((err) => {
  const cause = err?.cause ?? err;
  const msg = String(cause?.message ?? err?.message ?? err);
  const code = cause?.code ?? err?.code;
  if (code === '42P01' || /relation .* does not exist/i.test(msg)) {
    console.error('❌ Seed failed: Database tables do not exist.');
    console.error('');
    console.error('   Run the schema first, then seed:');
    console.error('   npm run db:push');
    console.error('   npm run db:seed');
    console.error('');
    console.error('   Or do both in one step:');
    console.error('   npm run db:setup');
  } else {
    console.error('❌ Seed failed:', err);
  }
  process.exit(1);
});
