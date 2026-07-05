import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'
import os from 'os'
import fs from 'fs'
import dotenv from 'dotenv'
import RADICALS from './radicals.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.join(__dirname, '.env') })

const DB_PATH = process.env.DB_PATH || path.join(os.homedir(), 'zihai.db')

// Auto-initialize persistent SQLite volume with dictionary data
const embeddedDbPath = path.join(__dirname, 'zihai.db')
if (DB_PATH !== embeddedDbPath) {
  if (!fs.existsSync(DB_PATH) || fs.statSync(DB_PATH).size < 1000) {
    const targetDir = path.dirname(DB_PATH)
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true })
    }
    fs.copyFileSync(embeddedDbPath, DB_PATH)
  }
}

const db = new Database(DB_PATH)
db.pragma('journal_mode = WAL')
db.pragma('synchronous = NORMAL')
db.pragma('cache_size = -16000')
db.pragma('temp_store = MEMORY')
db.pragma('foreign_keys = ON')

// Initialize DB schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    word_id INTEGER NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(user_id, word_id)
  );

  CREATE TABLE IF NOT EXISTS search_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    query TEXT NOT NULL,
    searched_at TEXT DEFAULT (datetime('now')),
    UNIQUE(user_id, query)
  );

  CREATE TABLE IF NOT EXISTS flashcard_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    word_id INTEGER NOT NULL,
    added_at TEXT DEFAULT (datetime('now')),
    stability REAL DEFAULT 0,
    difficulty REAL DEFAULT 0,
    elapsed_days INTEGER DEFAULT 0,
    scheduled_days INTEGER DEFAULT 0,
    reps INTEGER DEFAULT 0,
    lapses INTEGER DEFAULT 0,
    state INTEGER DEFAULT 0,
    last_review_date TEXT,
    next_review_date TEXT DEFAULT (datetime('now')),
    correct_count INTEGER DEFAULT 0,
    incorrect_count INTEGER DEFAULT 0,
    UNIQUE(user_id, word_id)
  );

  CREATE TABLE IF NOT EXISTS password_resets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    used INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token);
  CREATE INDEX IF NOT EXISTS idx_password_resets_user_id ON password_resets(user_id);
  CREATE INDEX IF NOT EXISTS idx_favorites_user_word ON favorites(user_id, word_id);
  CREATE INDEX IF NOT EXISTS idx_flashcard_due ON flashcard_progress(user_id, next_review_date);
  CREATE INDEX IF NOT EXISTS idx_search_history_user ON search_history(user_id, searched_at);
  CREATE INDEX IF NOT EXISTS idx_flashcard_user ON flashcard_progress(user_id, word_id);
  CREATE UNIQUE INDEX IF NOT EXISTS idx_search_history_unique ON search_history(user_id, query);

  CREATE TABLE IF NOT EXISTS dictionary (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    traditional TEXT NOT NULL,
    simplified TEXT NOT NULL,
    pinyin TEXT NOT NULL,
    definitions TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS custom_lists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS custom_list_words (
    list_id INTEGER NOT NULL REFERENCES custom_lists(id) ON DELETE CASCADE,
    word_id INTEGER NOT NULL,
    added_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (list_id, word_id)
  );
`)

// FSRS Migration
try {
  const tableInfo = db.prepare('PRAGMA table_info(flashcard_progress)').all()
  const hasEaseFactor = tableInfo.some(col => col.name === 'ease_factor')
  
  if (hasEaseFactor) {
    db.transaction(() => {
      db.exec(`
        CREATE TABLE flashcard_progress_backup AS SELECT * FROM flashcard_progress;
        DROP TABLE flashcard_progress;
      `)
      
      db.exec(`
         CREATE TABLE IF NOT EXISTS flashcard_progress (
           id INTEGER PRIMARY KEY AUTOINCREMENT,
           user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
           word_id INTEGER NOT NULL,
           added_at TEXT DEFAULT (datetime('now')),
           stability REAL DEFAULT 0,
           difficulty REAL DEFAULT 0,
           elapsed_days INTEGER DEFAULT 0,
           scheduled_days INTEGER DEFAULT 0,
           reps INTEGER DEFAULT 0,
           lapses INTEGER DEFAULT 0,
           state INTEGER DEFAULT 0,
           last_review_date TEXT,
           next_review_date TEXT DEFAULT (datetime('now')),
           correct_count INTEGER DEFAULT 0,
           incorrect_count INTEGER DEFAULT 0,
           UNIQUE(user_id, word_id)
         );
      `)
      
      db.exec(`
        INSERT INTO flashcard_progress (
          id, user_id, word_id, added_at,
          stability, difficulty, elapsed_days, scheduled_days, reps, lapses, state, last_review_date, next_review_date, correct_count, incorrect_count
        )
        SELECT 
          id, user_id, word_id, added_at,
          0, 0, 0, 0, repetition, 0, CASE WHEN repetition > 0 THEN 2 ELSE 0 END, NULL, next_review_date, correct_count, incorrect_count
        FROM flashcard_progress_backup;
        
        DROP TABLE flashcard_progress_backup;
      `)
    })()
  }
} catch (e) {
  console.error('Migration error:', e)
}

try {
  db.exec('ALTER TABLE users ADD COLUMN display_name TEXT')
} catch {
  // Column already exists
}

try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS word_examples (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      word_id INTEGER NOT NULL,
      sentence TEXT NOT NULL,
      translation TEXT
    )
  `)
} catch {
  // Table may already exist
}
try { db.exec('CREATE INDEX IF NOT EXISTS idx_word_examples_word ON word_examples(word_id)') } catch {}

try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS review_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      word_id INTEGER NOT NULL,
      correct INTEGER NOT NULL,
      review_date TEXT DEFAULT (datetime('now'))
    )
  `)
  db.exec('CREATE INDEX IF NOT EXISTS idx_review_log_user_date ON review_log(user_id, review_date)')
} catch {}

try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS reading_stories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      hsk_level INTEGER NOT NULL,
      content TEXT NOT NULL
    )
  `)

  const storyCount = db.prepare('SELECT COUNT(*) as c FROM reading_stories').get().c
  if (storyCount === 0) {
    const insertStory = db.prepare('INSERT INTO reading_stories (title, hsk_level, content) VALUES (?, ?, ?)')
    insertStory.run('我的猫 (My Cat)', 1, '我有一个猫。它很大。它喜欢吃鱼。我爱我的猫。')
    insertStory.run('买苹果 (Buying Apples)', 1, '今天我去商店。我买三个苹果。一个苹果五块钱。')
    insertStory.run('北京的天气 (Beijing Weather)', 2, '北京的秋天很漂亮。天气不冷也不热。很多旅游的人来北京。')
    insertStory.run('周末计划 (Weekend Plans)', 3, '这个周末我打算跟朋友一起去看电影。看完电影以后，我们要去一家新开的中国饭馆吃晚饭。')
  }
} catch (err) {
  console.error('Failed to init reading_stories', err)
}

// Radicals table
db.exec(`
  CREATE TABLE IF NOT EXISTS radicals (
    id INTEGER PRIMARY KEY,
    character TEXT NOT NULL,
    name TEXT
  )
`)
const insertRadical = db.prepare('INSERT OR IGNORE INTO radicals (id, character, name) VALUES (?, ?, ?)')
const insertMany = db.transaction((rads) => {
  for (const r of rads) insertRadical.run(r.id, r.character, r.name)
})
insertMany(RADICALS)

// Achievements System
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS achievements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      description TEXT NOT NULL,
      icon TEXT NOT NULL,
      requirement_type TEXT NOT NULL,
      requirement_value INTEGER NOT NULL
    )
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS user_achievements (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      achievement_id INTEGER NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
      unlocked_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, achievement_id)
    )
  `)

  const count = db.prepare('SELECT COUNT(*) as c FROM achievements').get().c
  if (count === 0) {
    const insertAch = db.prepare('INSERT INTO achievements (name, description, icon, requirement_type, requirement_value) VALUES (?, ?, ?, ?, ?)')
    insertAch.run('First Steps', 'Sign up and log in for the first time', 'Footprints', 'first_login', 1)
    insertAch.run('Vocab Collector', 'Favorite 10 words', 'Star', 'favorites_count', 10)
    insertAch.run('Flashcard Novice', 'Review 50 flashcards', 'Brain', 'review_count', 50)
    insertAch.run('Dedicated Scholar', 'Review 500 flashcards', 'GraduationCap', 'review_count', 500)
    insertAch.run('Curious Explorer', 'Search for 20 different words', 'Search', 'search_count', 20)
  }
} catch (err) {
  console.error('Failed to init achievements system', err)
}

export { db, DB_PATH }
