import { pool } from "../db.js";

async function migrate() {
  const client = await pool.connect();
  try {
    console.log("Running migration to add gamification columns...");
    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS gems INTEGER DEFAULT 0;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS streak_freezes INTEGER DEFAULT 0;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS previous_streak INTEGER DEFAULT 0;
    `);
    console.log("Migration successful!");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
