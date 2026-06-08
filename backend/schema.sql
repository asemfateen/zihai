PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS dictionary (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  traditional TEXT NOT NULL,
  simplified TEXT NOT NULL,
  pinyin TEXT NOT NULL,
  definitions TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS words (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  character TEXT NOT NULL,
  pinyin TEXT NOT NULL,
  english_definition TEXT NOT NULL,
  hsk_level INTEGER,
  pinyin_search TEXT,
  pinyin_normalized TEXT,
  pinyin_display TEXT,
  pinyin_plain TEXT,
  radical INTEGER,
  stroke_count INTEGER,
  traditional TEXT,
  frequency_rank INTEGER,
  example_json TEXT
);

CREATE INDEX IF NOT EXISTS idx_words_pinyin_normalized ON words(pinyin_normalized);
CREATE INDEX IF NOT EXISTS idx_words_character ON words(character);
CREATE INDEX IF NOT EXISTS idx_words_english_definition ON words(english_definition);
CREATE INDEX IF NOT EXISTS idx_words_pinyin_plain ON words(pinyin_plain);
CREATE INDEX IF NOT EXISTS idx_words_frequency ON words(frequency_rank);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  display_name TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS favorites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  word_id INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(user_id, word_id)
);

CREATE INDEX IF NOT EXISTS idx_favorites_user_word ON favorites(user_id, word_id);

CREATE TABLE IF NOT EXISTS search_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  query TEXT NOT NULL,
  searched_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_search_history_user ON search_history(user_id, searched_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_search_history_unique ON search_history(user_id, query);

CREATE TABLE IF NOT EXISTS vocabulary_lists (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_vocabulary_lists_user ON vocabulary_lists(user_id);

CREATE TABLE IF NOT EXISTS list_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  list_id INTEGER NOT NULL,
  word_id INTEGER NOT NULL,
  UNIQUE(list_id, word_id)
);

CREATE INDEX IF NOT EXISTS idx_list_items_list ON list_items(list_id);
CREATE INDEX IF NOT EXISTS idx_list_items_word ON list_items(word_id);

CREATE TABLE IF NOT EXISTS flashcard_progress (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
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

CREATE INDEX IF NOT EXISTS idx_flashcard_due ON flashcard_progress(user_id, next_review_date);
CREATE INDEX IF NOT EXISTS idx_flashcard_user ON flashcard_progress(user_id, word_id);

CREATE TABLE IF NOT EXISTS password_resets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  token TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token);

CREATE TABLE IF NOT EXISTS radicals (
  id INTEGER PRIMARY KEY,
  character TEXT NOT NULL,
  name TEXT
);

CREATE TABLE IF NOT EXISTS word_examples (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  word_id INTEGER NOT NULL,
  sentence TEXT NOT NULL,
  translation TEXT
);

CREATE INDEX IF NOT EXISTS idx_word_examples_word ON word_examples(word_id);
