// DISABLED — requires PostgreSQL pool, not compatible with SQLite
import { pool } from "../db.js";

async function migrate() {
  console.log("This migration is disabled — requires PostgreSQL pool.connect(), not compatible with SQLite.");
  process.exit(0);
}

migrate();
