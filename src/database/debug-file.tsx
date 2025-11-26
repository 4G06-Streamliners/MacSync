import { Pool } from "pg";

(async () => {
  const db = new Pool({
    connectionString: "postgresql://user:password@localhost:5432/large_event_db",
  });

  console.log("Checking tables...\n");

  // -------------------------
  // 1. List all tables
  // -------------------------
  const tables = await db.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name;
  `);

  console.log("Tables in DB:");
  console.table(tables.rows);

  // -------------------------
  // 2. Print EVENTS rows
  // -------------------------
  console.log("\nEVENTS TABLE CONTENT:");
  try {
    const events = await db.query(`SELECT * FROM events ORDER BY id;`);
    console.table(events.rows);
  } catch (err) {
    console.error("Failed to read events:", err.message);
  }

  // -------------------------
  // 3. Print USERS rows
  // -------------------------
  console.log("\n👤 USERS TABLE CONTENT:");
  try {
    const users = await db.query(`SELECT * FROM users ORDER BY id;`);
    console.table(users.rows);
  } catch (err) {
    console.error("Failed to read users:", err.message);
  }

  process.exit(0);
})();
