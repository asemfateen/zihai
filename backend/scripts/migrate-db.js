import Database from 'better-sqlite3';
import path from 'path';
import os from 'os';

const DB_PATH = process.env.DB_PATH || path.join(os.homedir(), 'zihai.db');
console.log(`Starting database migration on: ${DB_PATH}`);

const db = new Database(DB_PATH);

// Disable foreign keys temporarily during schema modification
db.pragma('foreign_keys = OFF');

try {
  db.transaction(() => {
    console.log('1. Migrating "favorites" table...');
    db.exec(`
      ALTER TABLE favorites RENAME TO favorites_old;
      
      CREATE TABLE favorites (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        word_id INTEGER NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        UNIQUE(user_id, word_id)
      );
      
      INSERT INTO favorites (id, user_id, word_id, created_at)
      SELECT id, user_id, word_id, created_at FROM favorites_old;
      
      DROP TABLE favorites_old;
      
      CREATE INDEX IF NOT EXISTS idx_favorites_user_word ON favorites(user_id, word_id);
    `);

    console.log('2. Migrating "search_history" table...');
    db.exec(`
      ALTER TABLE search_history RENAME TO search_history_old;
      
      CREATE TABLE search_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        query TEXT NOT NULL,
        searched_at TEXT DEFAULT (datetime('now')),
        UNIQUE(user_id, query)
      );
      
      INSERT INTO search_history (id, user_id, query, searched_at)
      SELECT id, user_id, query, searched_at FROM search_history_old;
      
      DROP TABLE search_history_old;
      
      CREATE INDEX IF NOT EXISTS idx_search_history_user ON search_history(user_id, searched_at);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_search_history_unique ON search_history(user_id, query);
    `);

    console.log('3. Migrating "flashcard_progress" table...');
    db.exec(`
      ALTER TABLE flashcard_progress RENAME TO flashcard_progress_old;
      
      CREATE TABLE flashcard_progress (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        word_id INTEGER NOT NULL,
        added_at TEXT DEFAULT (datetime('now')),
        ease_factor REAL DEFAULT 2.5,
        interval_days INTEGER DEFAULT 0,
        repetition INTEGER DEFAULT 0,
        next_review_date TEXT DEFAULT (date('now')),
        correct_count INTEGER DEFAULT 0,
        incorrect_count INTEGER DEFAULT 0,
        UNIQUE(user_id, word_id)
      );
      
      INSERT INTO flashcard_progress (id, user_id, word_id, added_at, ease_factor, interval_days, repetition, next_review_date, correct_count, incorrect_count)
      SELECT id, user_id, word_id, added_at, ease_factor, interval_days, repetition, next_review_date, correct_count, incorrect_count FROM flashcard_progress_old;
      
      DROP TABLE flashcard_progress_old;
      
      CREATE INDEX IF NOT EXISTS idx_flashcard_due ON flashcard_progress(user_id, next_review_date);
      CREATE INDEX IF NOT EXISTS idx_flashcard_user ON flashcard_progress(user_id, word_id);
    `);

    console.log('4. Migrating "password_resets" table...');
    db.exec(`
      ALTER TABLE password_resets RENAME TO password_resets_old;
      
      CREATE TABLE password_resets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        used INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      );
      
      INSERT INTO password_resets (id, user_id, token, expires_at, used, created_at)
      SELECT id, user_id, token, expires_at, used, created_at FROM password_resets_old;
      
      DROP TABLE password_resets_old;
      
      CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token);
      CREATE INDEX IF NOT EXISTS idx_password_resets_user_id ON password_resets(user_id);
    `);

    console.log('5. Fixing invalid reference in "word_examples" table...');
    db.exec(`
      ALTER TABLE word_examples RENAME TO word_examples_old;
      
      CREATE TABLE word_examples (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        word_id INTEGER NOT NULL,
        sentence TEXT NOT NULL,
        translation TEXT
      );
      
      INSERT INTO word_examples (id, word_id, sentence, translation)
      SELECT id, word_id, sentence, translation FROM word_examples_old;
      
      DROP TABLE word_examples_old;
      
      CREATE INDEX IF NOT EXISTS idx_word_examples_word ON word_examples(word_id);
    `);

    console.log('All migrations completed successfully in transaction.');
  })();
} catch (err) {
  console.error('Migration failed, transaction rolled back:', err.message);
  process.exit(1);
}

// Re-enable foreign keys
db.pragma('foreign_keys = ON');

console.log('Running database maintenance...');
console.log('Running VACUUM to compact database...');
db.exec('VACUUM');
console.log('Running ANALYZE to optimize index selection...');
db.exec('ANALYZE');

// Verify foreign key integrity
const fkErrors = db.prepare('PRAGMA foreign_key_check').all();
if (fkErrors.length > 0) {
  console.warn('WARNING: Foreign key violations detected:', fkErrors);
} else {
  console.log('Integrity check: 0 foreign key violations.');
}

db.close();
console.log('Migration process finished successfully.');
