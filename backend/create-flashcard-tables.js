import Database from 'better-sqlite3'
import path from 'path'
import os from 'os'

const DB_PATH = path.join(os.homedir(), 'zihai.db')
const db = new Database(DB_PATH)

db.pragma('foreign_keys = ON')

db.exec(`
  CREATE TABLE IF NOT EXISTS decks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS flashcards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    deck_id INTEGER NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
    item_id INTEGER NOT NULL,
    item_type TEXT NOT NULL CHECK (item_type IN ('character', 'word')),
    box_level INTEGER DEFAULT 1,
    next_review DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_flashcards_deck_id ON flashcards(deck_id);
  CREATE INDEX IF NOT EXISTS idx_flashcards_next_review ON flashcards(next_review);
`)

const existing = db.prepare('SELECT id FROM decks WHERE name = ?').get('My First Deck')
if (!existing) {
  db.prepare('INSERT INTO decks (name) VALUES (?)').run('My First Deck')
  console.log('Inserted sample deck "My First Deck"')
} else {
  console.log('Sample deck "My First Deck" already exists')
}

console.log('Flashcard tables created successfully')
db.close()
