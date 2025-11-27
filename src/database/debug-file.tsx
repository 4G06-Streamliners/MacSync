import { Pool } from "pg";

(async () => {
  const db = new Pool({
    connectionString: "postgresql://user:password@localhost:5432/large_event_db",
  });

  console.log("Checking tables...\n");

  // 1. List tables
  const tables = await db.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name;
  `);

  console.log("\n Tables in DB:");
  console.table(tables.rows);

  // 2. EVENTS table
  console.log("\n EVENTS TABLE CONTENT:");
  try {
    const events = await db.query(`SELECT * FROM events ORDER BY id;`);
    console.table(events.rows);
  } catch (err: any) {
    console.error(" Failed to read events:", err.message);
  }

  // 3. USERS table
  console.log("\n USERS TABLE CONTENT:");
  try {
    const users = await db.query(`SELECT * FROM users ORDER BY id;`);
    console.table(users.rows);
  } catch (err: any) {
    console.error("Failed to read users:", err.message);
  }

  // 4. PAYMENTS table
  console.log("\n💰 PAYMENTS TABLE CONTENT:");
  try {
    const pay = await db.query(`SELECT * FROM payments ORDER BY id;`);
    console.table(pay.rows);
  } catch (err: any) {
    console.error(" Failed to read payments:", err.message);
  }

  // 5. WEBHOOKS table
  console.log("\n⚡ STRIPE WEBHOOK EVENTS TABLE CONTENT:");
  try {
    const webhooks = await db.query(`SELECT * FROM stripe_webhooks ORDER BY created_at DESC;`);
    console.table(webhooks.rows);
  } catch (err: any) {
    console.error(" Failed to read stripe_webhooks:", err.message);
  }
  // 5. WEBHOOKS table
  console.log("\n⚡ STRIPE Attendees EVENTS TABLE CONTENT:");
  try {
    const webhooks = await db.query(`SELECT * FROM attendees ORDER BY created_at DESC;`);
    console.table(webhooks.rows);
  } catch (err: any) {
    console.error(" Failed to read attendees:", err.message);
  }
   console.log("\n⚡ STRIPE QR EVENTS TABLE CONTENT:");
  try {
    const webhooks = await db.query(`SELECT * FROM qr_codes ORDER BY created_at DESC;`);
    console.table(webhooks.rows);
  } catch (err: any) {
    console.error(" Failed to read attendees:", err.message);
  }

  process.exit(0);
})();
