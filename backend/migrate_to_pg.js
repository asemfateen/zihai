import Database from "better-sqlite3";
import pg from "pg";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import os from "os";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, ".env") });

let sqlitePath = process.env.DB_PATH || path.join(os.homedir(), "zihai.db");
if (!fs.existsSync(sqlitePath)) {
  sqlitePath = path.join(__dirname, "zihai.db");
}
const dbUrl = process.env.DATABASE_URL || "postgresql://zihai:zihai@localhost:5432/zihai";

console.log("Starting DB migration from SQLite to PostgreSQL...");
console.log("Source SQLite database:", sqlitePath);
console.log("Target Postgres database URL:", dbUrl);

const sqlite = new Database(sqlitePath);
const pool = new pg.Pool({ connectionString: dbUrl });

const schemas = [
  // Drop commands
  `DROP TABLE IF EXISTS user_achievements CASCADE;`,
  `DROP TABLE IF EXISTS user_progress CASCADE;`,
  `DROP TABLE IF EXISTS review_log CASCADE;`,
  `DROP TABLE IF EXISTS password_resets CASCADE;`,
  `DROP TABLE IF EXISTS search_history CASCADE;`,
  `DROP TABLE IF EXISTS favorites CASCADE;`,
  `DROP TABLE IF EXISTS flashcard_progress CASCADE;`,
  `DROP TABLE IF EXISTS custom_list_words CASCADE;`,
  `DROP TABLE IF EXISTS custom_lists CASCADE;`,
  `DROP TABLE IF EXISTS word_examples CASCADE;`,
  `DROP TABLE IF EXISTS mock_test_results CASCADE;`,
  `DROP TABLE IF EXISTS app_settings CASCADE;`,
  `DROP TABLE IF EXISTS reading_stories CASCADE;`,
  `DROP TABLE IF EXISTS radicals CASCADE;`,
  `DROP TABLE IF EXISTS achievements CASCADE;`,
  `DROP TABLE IF EXISTS dictionary CASCADE;`,
  `DROP TABLE IF EXISTS cedict_words CASCADE;`,
  `DROP TABLE IF EXISTS characters CASCADE;`,
  `DROP TABLE IF EXISTS users CASCADE;`,

  // Create commands
  `CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    display_name VARCHAR(100),
    xp INTEGER DEFAULT 0,
    streak_days INTEGER DEFAULT 0,
    last_login TIMESTAMP,
    is_admin INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );`,

  `CREATE TABLE favorites (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    word_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, word_id)
  );`,

  `CREATE TABLE search_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    query VARCHAR(255) NOT NULL,
    searched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, query)
  );`,

  `CREATE TABLE flashcard_progress (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    word_id INTEGER NOT NULL,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    stability REAL DEFAULT 0,
    difficulty REAL DEFAULT 0,
    elapsed_days INTEGER DEFAULT 0,
    scheduled_days INTEGER DEFAULT 0,
    reps INTEGER DEFAULT 0,
    lapses INTEGER DEFAULT 0,
    state INTEGER DEFAULT 0,
    last_review_date TIMESTAMP,
    next_review_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    correct_count INTEGER DEFAULT 0,
    incorrect_count INTEGER DEFAULT 0,
    UNIQUE(user_id, word_id)
  );`,

  `CREATE TABLE password_resets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );`,

  `CREATE TABLE dictionary (
    id SERIAL PRIMARY KEY,
    traditional VARCHAR(255) NOT NULL,
    simplified VARCHAR(255) NOT NULL,
    pinyin VARCHAR(255) NOT NULL,
    definitions TEXT NOT NULL
  );`,

  `CREATE TABLE cedict_words (
    id SERIAL PRIMARY KEY,
    traditional VARCHAR(255) NOT NULL,
    simplified VARCHAR(255) NOT NULL,
    pinyin VARCHAR(255) NOT NULL,
    pinyin_flat VARCHAR(255) NOT NULL,
    definition TEXT NOT NULL,
    hsk_level INTEGER DEFAULT 0
  );`,

  `CREATE TABLE characters (
    id SERIAL PRIMARY KEY,
    traditional VARCHAR(255) NOT NULL,
    simplified VARCHAR(255) NOT NULL,
    pinyin VARCHAR(255) NOT NULL,
    pinyin_flat VARCHAR(255) NOT NULL,
    definition TEXT NOT NULL,
    stroke_count INTEGER,
    radical INTEGER,
    hsk_level INTEGER DEFAULT 0
  );`,

  `CREATE TABLE custom_lists (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );`,

  `CREATE TABLE custom_list_words (
    list_id INTEGER NOT NULL REFERENCES custom_lists(id) ON DELETE CASCADE,
    word_id INTEGER NOT NULL,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (list_id, word_id)
  );`,

  `CREATE TABLE app_settings (
    key VARCHAR(255) PRIMARY KEY,
    value TEXT
  );`,

  `CREATE TABLE reading_stories (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    hsk_level INTEGER NOT NULL,
    content TEXT NOT NULL
  );`,

  `CREATE TABLE word_examples (
    id SERIAL PRIMARY KEY,
    word_id INTEGER NOT NULL,
    sentence TEXT NOT NULL,
    translation TEXT
  );`,

  `CREATE TABLE review_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    word_id INTEGER NOT NULL,
    correct INTEGER NOT NULL,
    review_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );`,

  `CREATE TABLE radicals (
    id INTEGER PRIMARY KEY,
    character VARCHAR(10) NOT NULL,
    name VARCHAR(100)
  );`,

  `CREATE TABLE achievements (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT NOT NULL,
    icon VARCHAR(100) NOT NULL,
    requirement_type VARCHAR(100) NOT NULL,
    requirement_value INTEGER NOT NULL
  );`,

  `CREATE TABLE user_achievements (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    achievement_id INTEGER NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, achievement_id)
  );`,

  `CREATE TABLE mock_test_results (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    hsk_level INTEGER NOT NULL,
    score INTEGER NOT NULL,
    total INTEGER NOT NULL,
    time_taken INTEGER,
    answers TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );`,

  // Create Indices
  `CREATE INDEX idx_password_resets_token ON password_resets(token);`,
  `CREATE INDEX idx_password_resets_user_id ON password_resets(user_id);`,
  `CREATE INDEX idx_favorites_user_word ON favorites(user_id, word_id);`,
  `CREATE INDEX idx_flashcard_due ON flashcard_progress(user_id, next_review_date);`,
  `CREATE INDEX idx_search_history_user ON search_history(user_id, searched_at);`,
  `CREATE INDEX idx_flashcard_user ON flashcard_progress(user_id, word_id);`,
  `CREATE INDEX idx_word_examples_word ON word_examples(word_id);`,
  `CREATE INDEX idx_review_log_user_date ON review_log(user_id, review_date);`,
  `CREATE INDEX idx_cedict_hsk ON cedict_words(hsk_level);`,
  `CREATE INDEX idx_characters_simplified ON characters(simplified);`,
  `CREATE INDEX idx_characters_pinyin_flat ON characters(pinyin_flat);`,
  `CREATE INDEX idx_cedict_words_simplified ON cedict_words(simplified);`,
  `CREATE INDEX idx_cedict_words_pinyin_flat ON cedict_words(pinyin_flat);`
];

async function migrate() {
  const client = await pool.connect();
  try {
    console.log("Creating PostgreSQL tables and indices...");
    for (const sql of schemas) {
      await client.query(sql);
    }
    console.log("Database schema built successfully.");

    // Migrate Users
    console.log("Migrating users...");
    const users = sqlite.prepare("SELECT * FROM users").all();
    for (const u of users) {
      await client.query(
        `INSERT INTO users (id, email, password_hash, display_name, xp, streak_days, last_login, is_admin, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [u.id, u.email, u.password_hash, u.display_name, u.xp || 0, u.streak_days || 0, u.last_login, u.is_admin || 0, u.created_at]
      );
    }
    await client.query("SELECT setval('users_id_seq', COALESCE((SELECT MAX(id)+1 FROM users), 1), false);");
    console.log(`Migrated ${users.length} users.`);

    // Migrate Radicals
    console.log("Migrating radicals...");
    const radicals = sqlite.prepare("SELECT * FROM radicals").all();
    for (const r of radicals) {
      await client.query(
        `INSERT INTO radicals (id, character, name) VALUES ($1, $2, $3)`,
        [r.id, r.character, r.name]
      );
    }
    console.log(`Migrated ${radicals.length} radicals.`);

    // Migrate Achievements
    console.log("Migrating achievements...");
    const achievements = sqlite.prepare("SELECT * FROM achievements").all();
    for (const a of achievements) {
      await client.query(
        `INSERT INTO achievements (id, name, description, icon, requirement_type, requirement_value)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [a.id, a.name, a.description, a.icon, a.requirement_type, a.requirement_value]
      );
    }
    await client.query("SELECT setval('achievements_id_seq', COALESCE((SELECT MAX(id)+1 FROM achievements), 1), false);");
    console.log(`Migrated ${achievements.length} achievements.`);

    // Migrate Dictionary (if present)
    console.log("Migrating dictionary...");
    const dict = sqlite.prepare("SELECT * FROM dictionary").all();
    for (const d of dict) {
      await client.query(
        `INSERT INTO dictionary (id, traditional, simplified, pinyin, definitions) VALUES ($1, $2, $3, $4, $5)`,
        [d.id, d.traditional, d.simplified, d.pinyin, d.definitions]
      );
    }
    await client.query("SELECT setval('dictionary_id_seq', COALESCE((SELECT MAX(id)+1 FROM dictionary), 1), false);");
    console.log(`Migrated ${dict.length} custom definitions.`);

    // Migrate Stories
    console.log("Migrating stories...");
    const stories = sqlite.prepare("SELECT * FROM reading_stories").all();
    for (const s of stories) {
      await client.query(
        `INSERT INTO reading_stories (id, title, hsk_level, content) VALUES ($1, $2, $3, $4)`,
        [s.id, s.title, s.hsk_level, s.content]
      );
    }
    await client.query("SELECT setval('reading_stories_id_seq', COALESCE((SELECT MAX(id)+1 FROM reading_stories), 1), false);");
    console.log(`Migrated ${stories.length} reading stories.`);

    // Migrate word_examples
    console.log("Migrating word_examples...");
    const examples = sqlite.prepare("SELECT * FROM word_examples").all();
    for (const ex of examples) {
      await client.query(
        `INSERT INTO word_examples (id, word_id, sentence, translation) VALUES ($1, $2, $3, $4)`,
        [ex.id, ex.word_id, ex.sentence, ex.translation]
      );
    }
    await client.query("SELECT setval('word_examples_id_seq', COALESCE((SELECT MAX(id)+1 FROM word_examples), 1), false);");
    console.log(`Migrated ${examples.length} word examples.`);

    // Migrate app_settings
    console.log("Migrating app_settings...");
    const settings = sqlite.prepare("SELECT * FROM app_settings").all();
    for (const s of settings) {
      await client.query(
        `INSERT INTO app_settings (key, value) VALUES ($1, $2)`,
        [s.key, s.value]
      );
    }
    console.log(`Migrated settings.`);

    // Batch Migrate characters (huge table)
    console.log("Migrating characters (large table)...");
    const charStmt = sqlite.prepare("SELECT * FROM characters");
    let charBatch = [];
    let charCount = 0;
    for (const charRow of charStmt.iterate()) {
      charBatch.push(charRow);
      if (charBatch.length >= 1000) {
        await insertCharactersBatch(client, charBatch);
        charCount += charBatch.length;
        charBatch = [];
      }
    }
    if (charBatch.length > 0) {
      await insertCharactersBatch(client, charBatch);
      charCount += charBatch.length;
    }
    await client.query("SELECT setval('characters_id_seq', COALESCE((SELECT MAX(id)+1 FROM characters), 1), false);");
    console.log(`Migrated ${charCount} characters.`);

    // Batch Migrate cedict_words (huge table: ~120,000+ entries)
    console.log("Migrating cedict_words (very large table)...");
    const wordStmt = sqlite.prepare("SELECT * FROM cedict_words");
    let wordBatch = [];
    let wordCount = 0;
    for (const wordRow of wordStmt.iterate()) {
      wordBatch.push(wordRow);
      if (wordBatch.length >= 2000) {
        await insertCedictWordsBatch(client, wordBatch);
        wordCount += wordBatch.length;
        wordBatch = [];
        if (wordCount % 20000 === 0) {
          console.log(`  Progress: ${wordCount} words imported...`);
        }
      }
    }
    if (wordBatch.length > 0) {
      await insertCedictWordsBatch(client, wordBatch);
      wordCount += wordBatch.length;
    }
    await client.query("SELECT setval('cedict_words_id_seq', COALESCE((SELECT MAX(id)+1 FROM cedict_words), 1), false);");
    console.log(`Migrated ${wordCount} cedict_words.`);

    // Migrate User Stats and History
    console.log("Migrating favorites...");
    const favorites = sqlite.prepare("SELECT * FROM favorites").all();
    for (const f of favorites) {
      await client.query(
        `INSERT INTO favorites (id, user_id, word_id, created_at) VALUES ($1, $2, $3, $4)`,
        [f.id, f.user_id, f.word_id, f.created_at]
      );
    }
    await client.query("SELECT setval('favorites_id_seq', COALESCE((SELECT MAX(id)+1 FROM favorites), 1), false);");

    console.log("Migrating search history...");
    const history = sqlite.prepare("SELECT * FROM search_history").all();
    for (const h of history) {
      await client.query(
        `INSERT INTO search_history (id, user_id, query, searched_at) VALUES ($1, $2, $3, $4)`,
        [h.id, h.user_id, h.query, h.searched_at]
      );
    }
    await client.query("SELECT setval('search_history_id_seq', COALESCE((SELECT MAX(id)+1 FROM search_history), 1), false);");

    console.log("Migrating custom lists...");
    const lists = sqlite.prepare("SELECT * FROM custom_lists").all();
    for (const l of lists) {
      await client.query(
        `INSERT INTO custom_lists (id, user_id, name, description, created_at) VALUES ($1, $2, $3, $4, $5)`,
        [l.id, l.user_id, l.name, l.description, l.created_at]
      );
    }
    await client.query("SELECT setval('custom_lists_id_seq', COALESCE((SELECT MAX(id)+1 FROM custom_lists), 1), false);");

    console.log("Migrating custom_list_words...");
    const listWords = sqlite.prepare("SELECT * FROM custom_list_words").all();
    for (const lw of listWords) {
      await client.query(
        `INSERT INTO custom_list_words (list_id, word_id, added_at) VALUES ($1, $2, $3)`,
        [lw.list_id, lw.word_id, lw.added_at]
      );
    }

    console.log("Migrating review logs...");
    const reviews = sqlite.prepare("SELECT * FROM review_log").all();
    for (const r of reviews) {
      await client.query(
        `INSERT INTO review_log (id, user_id, word_id, correct, review_date) VALUES ($1, $2, $3, $4, $5)`,
        [r.id, r.user_id, r.word_id, r.correct, r.review_date]
      );
    }
    await client.query("SELECT setval('review_log_id_seq', COALESCE((SELECT MAX(id)+1 FROM review_log), 1), false);");

    console.log("Migrating user achievements...");
    const userAchs = sqlite.prepare("SELECT * FROM user_achievements").all();
    for (const ua of userAchs) {
      await client.query(
        `INSERT INTO user_achievements (user_id, achievement_id, unlocked_at) VALUES ($1, $2, $3)`,
        [ua.user_id, ua.achievement_id, ua.unlocked_at]
      );
    }

    console.log("Migrating mock test results...");
    const testResults = sqlite.prepare("SELECT * FROM mock_test_results").all();
    for (const tr of testResults) {
      await client.query(
        `INSERT INTO mock_test_results (id, user_id, hsk_level, score, total, time_taken, answers, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [tr.id, tr.user_id, tr.hsk_level, tr.score, tr.total, tr.time_taken, tr.answers, tr.created_at]
      );
    }
    await client.query("SELECT setval('mock_test_results_id_seq', COALESCE((SELECT MAX(id)+1 FROM mock_test_results), 1), false);");

    console.log("Migrating FSRS flashcard progress...");
    const progress = sqlite.prepare("SELECT * FROM flashcard_progress").all();
    for (const p of progress) {
      await client.query(
        `INSERT INTO flashcard_progress (
          id, user_id, word_id, added_at, stability, difficulty,
          elapsed_days, scheduled_days, reps, lapses, state, last_review_date, next_review_date, correct_count, incorrect_count
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
        [
          p.id, p.user_id, p.word_id, p.added_at, p.stability || 0, p.difficulty || 0,
          p.elapsed_days || 0, p.scheduled_days || 0, p.reps || 0, p.lapses || 0, p.state || 0,
          p.last_review_date, p.next_review_date, p.correct_count || 0, p.incorrect_count || 0
        ]
      );
    }
    await client.query("SELECT setval('flashcard_progress_id_seq', COALESCE((SELECT MAX(id)+1 FROM flashcard_progress), 1), false);");

    console.log("\nDATABASE MIGRATION COMPLETED SUCCESSFULLY!");

  } catch (err) {
    console.error("Migration fatal error:", err);
  } finally {
    client.release();
    sqlite.close();
    await pool.end();
  }
}

async function insertCharactersBatch(client, batch) {
  const values = [];
  let paramIdx = 1;
  const valRows = [];
  for (const c of batch) {
    valRows.push(`($${paramIdx}, $${paramIdx+1}, $${paramIdx+2}, $${paramIdx+3}, $${paramIdx+4}, $${paramIdx+5}, $${paramIdx+6}, $${paramIdx+7}, $${paramIdx+8})`);
    values.push(c.id, c.traditional || null, c.simplified, c.pinyin, c.pinyin_flat, c.definition, c.stroke_count || null, c.radical || null, c.hsk_level || 0);
    paramIdx += 9;
  }
  const query = `INSERT INTO characters (id, traditional, simplified, pinyin, pinyin_flat, definition, stroke_count, radical, hsk_level) VALUES ${valRows.join(",")}`;
  await client.query(query, values);
}

async function insertCedictWordsBatch(client, batch) {
  const values = [];
  let paramIdx = 1;
  const valRows = [];
  for (const w of batch) {
    valRows.push(`($${paramIdx}, $${paramIdx+1}, $${paramIdx+2}, $${paramIdx+3}, $${paramIdx+4}, $${paramIdx+5}, $${paramIdx+6})`);
    values.push(w.id, w.traditional || null, w.simplified, w.pinyin, w.pinyin_flat, w.definition, w.hsk_level || 0);
    paramIdx += 7;
  }
  const query = `INSERT INTO cedict_words (id, traditional, simplified, pinyin, pinyin_flat, definition, hsk_level) VALUES ${valRows.join(",")}`;
  await client.query(query, values);
}

migrate();
