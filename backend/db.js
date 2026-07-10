import pg from "pg";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, ".env") });

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  throw new Error("DATABASE_URL must be specified in the environment variables!");
}

const pool = new pg.Pool({
  connectionString: dbUrl,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false
});

// Awaitable helper wraps compatible with our route queries
const db = {
  async query(text, params) {
    return pool.query(text, params);
  },

  async all(text, params = []) {
    const res = await pool.query(text, params);
    return res.rows;
  },

  async get(text, params = []) {
    const res = await pool.query(text, params);
    return res.rows[0] || null;
  },

  async run(text, params = []) {
    const res = await pool.query(text, params);
    return {
      changes: res.rowCount,
      lastInsertRowid: res.rows[0]?.id || null
    };
  },

  async transaction(fn) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const result = await fn(client);
      await client.query("COMMIT");
      return result;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }
};

export { db, pool };
