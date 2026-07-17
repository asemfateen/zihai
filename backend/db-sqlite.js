import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, "zihai.db");
const sqlite = new Database(dbPath);

// Enable WAL mode for performance
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

// Drop-in replacement for pg-based db — same API
const db = {
  all(text, params = []) {
    const stmt = sqlite.prepare(text);
    return stmt.all(...params);
  },

  get(text, params = []) {
    const stmt = sqlite.prepare(text);
    return stmt.get(...params) || null;
  },

  run(text, params = []) {
    const stmt = sqlite.prepare(text);
    const result = stmt.run(...params);
    return {
      changes: result.changes,
      lastInsertRowid: result.lastInsertRowid,
    };
  },

  transaction(fn) {
    const txn = sqlite.transaction(fn);
    return txn();
  },
};

export { db, sqlite };
