// SQLite adapter - re-exported from db-sqlite.js
// This replaces the PostgreSQL version since pg isn't available.
import { db as sqliteDb } from "./db-sqlite.js";

// Wrapper that matches the pg-based API
// The SQLite db has synchronous methods, so we wrap them in Promises

export const db = {
  /**
   * Query rows (async)
   * @param {string} text - SQL with $1, $2 bind params (auto-converted to ? for SQLite)
   * @param {Array} params - parameter values
   * @returns {Promise<Array>} array of row objects
   */
  async query(text, params = []) {
    try {
      // Convert $1, $2 etc to ? for SQLite compatibility
      const sql = text.replace(/\$(\d+)/g, '?');
      const rows = sqliteDb.all(sql, params);
      return { rows };
    } catch (err) {
      throw err;
    }
  },

  /**
   * Single row (async)
   */
  async queryOne(text, params = []) {
    const sql = text.replace(/\$(\d+)/g, '?');
    const row = sqliteDb.get(sql, params);
    return { rows: row ? [row] : [] };
  },

  /**
   * Execute (INSERT/UPDATE/DELETE)
   */
  async execute(text, params = []) {
    const sql = text.replace(/\$(\d+)/g, '?');
    const result = sqliteDb.run(sql, params);
    return { rowCount: result.changes };
  },

  /**
   * Get a single value
   */
  async get(text, params = []) {
    const sql = text.replace(/\$(\d+)/g, '?');
    return sqliteDb.get(sql, params);
  },

  /**
   * Run a query and return all rows
   */
  all(text, params = []) {
    const sql = text.replace(/\$(\d+)/g, '?');
    return sqliteDb.all(sql, params);
  },

  /**
   * Execute (alias for run/execute - used throughout routes)
   */
  run(text, params = []) {
    const sql = text.replace(/\$(\d+)/g, '?');
    return sqliteDb.run(sql, params);
  },

  /**
   * Begin transaction wrapper
   */
  transaction(fn) {
    return sqliteDb.transaction(fn)();
  },

  /**
   * Direct access to the SQLite instance
   */
  _db: sqliteDb,
};

// Also export pool-like object for compatibility
export const pool = {
  async query(text, params = []) {
    return db.query(text, params);
  },
  end() {
    sqliteDb.close();
  }
};

export default db;
