import express from 'express'
import Database from 'better-sqlite3'
import cors from 'cors'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import cookieParser from 'cookie-parser'
import dotenv from 'dotenv'
import rateLimit from 'express-rate-limit'
import crypto from 'crypto'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.join(__dirname, '.env') })

const db = new Database(path.join(__dirname, 'zihai.db'))
db.pragma('journal_mode = WAL')

const app = express()
const PORT = 3002
const JWT_SECRET = process.env.JWT_SECRET

app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || 'http://localhost:5173',
  credentials: true,
}))
app.use(cookieParser())
app.use(express.json())

db.exec(`
  CREATE TABLE IF NOT EXISTS words (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    character TEXT UNIQUE NOT NULL,
    pinyin TEXT NOT NULL,
    english_definition TEXT NOT NULL,
    hsk_level INTEGER,
    pinyin_search TEXT,
    pinyin_normalized TEXT
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    word_id INTEGER NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(user_id, word_id)
  );

  CREATE TABLE IF NOT EXISTS search_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    query TEXT NOT NULL,
    searched_at TEXT DEFAULT (datetime('now')),
    UNIQUE(user_id, query)
  );

  CREATE TABLE IF NOT EXISTS vocabulary_lists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS list_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    list_id INTEGER NOT NULL,
    word_id INTEGER NOT NULL,
    UNIQUE(list_id, word_id)
  );

  CREATE TABLE IF NOT EXISTS flashcard_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    word_id INTEGER NOT NULL,
    ease_factor REAL DEFAULT 2.5,
    interval_days INTEGER DEFAULT 1,
    next_review_date TEXT DEFAULT (date('now')),
    correct_count INTEGER DEFAULT 0,
    incorrect_count INTEGER DEFAULT 0,
    UNIQUE(user_id, word_id)
  );
`)

function requireAuth(req, res, next) {
  const token = req.cookies?.token || req.headers.authorization?.replace('Bearer ', '')
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' })
  }
  try {
    req.user = jwt.verify(token, JWT_SECRET)
    next()
  } catch {
    return res.status(401).json({ error: 'Invalid token' })
  }
}

app.post('/api/register', async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' })
  }
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email)
  if (existing) {
    return res.status(409).json({ error: 'Email already registered' })
  }
  const password_hash = await bcrypt.hash(password, 10)
  const result = db.prepare('INSERT INTO users (email, password_hash) VALUES (?, ?)').run(email, password_hash)
  const token = jwt.sign({ id: result.lastInsertRowid, email }, JWT_SECRET, { expiresIn: '7d' })
  res.cookie('token', token, { httpOnly: true, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 })
  res.json({ id: result.lastInsertRowid, email })
})

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' })
  }
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email)
  if (!user || !user.password_hash) {
    return res.status(401).json({ error: 'Invalid credentials' })
  }
  const valid = await bcrypt.compare(password, user.password_hash)
  if (!valid) {
    return res.status(401).json({ error: 'Invalid credentials' })
  }
  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' })
  res.cookie('token', token, { httpOnly: true, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 })
  res.json({ id: user.id, email: user.email })
})

app.post('/api/logout', (req, res) => {
  res.clearCookie('token')
  res.json({ message: 'Logged out' })
})

app.get('/api/me', requireAuth, (req, res) => {
  res.json({ id: req.user.id, email: req.user.email })
})

app.post('/api/forgot-password', (req, res) => {
  res.json({ message: 'If an account exists a reset link has been sent' })
})

app.get('/api/search', (req, res) => {
  const q = (req.query.q || '').trim()
  if (!q) return res.json([])

  const likeQuery = q + '%'
  const rows = db.prepare(`
    SELECT id, character, pinyin, english_definition, hsk_level
    FROM words
    WHERE character LIKE ?
       OR pinyin_normalized LIKE ?
       OR REPLACE(pinyin_normalized, ' ', '') LIKE ?
    ORDER BY
      CASE
        WHEN character = ? THEN 0
        WHEN pinyin_normalized = ? THEN 0
        ELSE 1
      END,
      COALESCE(hsk_level, 999)
    LIMIT 20
  `).all(likeQuery, likeQuery, likeQuery, q, q)

  res.json(rows)
})

app.get('/api/word/:id', (req, res) => {
  const word = db.prepare('SELECT * FROM words WHERE id = ?').get(req.params.id)
  if (!word) return res.status(404).json({ error: 'Word not found' })
  res.json(word)
})

app.post('/api/history', requireAuth, (req, res) => {
  const { query } = req.body
  if (!query) return res.status(400).json({ error: 'Query required' })
  db.prepare(`
    INSERT INTO search_history (user_id, query, searched_at) VALUES (?, ?, datetime('now'))
    ON CONFLICT(user_id, query) DO UPDATE SET searched_at = datetime('now')
  `).run(req.user.id, query)
  res.json({ message: 'Saved' })
})

app.get('/api/history', requireAuth, (req, res) => {
  const rows = db.prepare(`
    SELECT query, searched_at FROM search_history
    WHERE user_id = ?
    ORDER BY searched_at DESC
    LIMIT 20
  `).all(req.user.id)
  res.json(rows)
})

app.delete('/api/history', requireAuth, (req, res) => {
  db.prepare('DELETE FROM search_history WHERE user_id = ?').run(req.user.id)
  res.json({ message: 'History cleared' })
})

app.post('/api/favorites/:wordId', requireAuth, (req, res) => {
  db.prepare('INSERT OR IGNORE INTO favorites (user_id, word_id) VALUES (?, ?)').run(req.user.id, req.params.wordId)
  res.json({ message: 'Added' })
})

app.delete('/api/favorites/:wordId', requireAuth, (req, res) => {
  db.prepare('DELETE FROM favorites WHERE user_id = ? AND word_id = ?').run(req.user.id, req.params.wordId)
  res.json({ message: 'Removed' })
})

app.get('/api/favorites/:wordId', requireAuth, (req, res) => {
  const fav = db.prepare('SELECT id FROM favorites WHERE user_id = ? AND word_id = ?').get(req.user.id, req.params.wordId)
  res.json({ isFavorite: !!fav })
})

app.get('/api/favorites', requireAuth, (req, res) => {
  const rows = db.prepare(`
    SELECT w.id, w.character, w.pinyin, w.english_definition, w.hsk_level
    FROM favorites f
    JOIN words w ON w.id = f.word_id
    WHERE f.user_id = ?
    ORDER BY f.created_at DESC
  `).all(req.user.id)
  res.json(rows)
})

app.get('/api/lists', requireAuth, (req, res) => {
  const rows = db.prepare(`
    SELECT vl.id, vl.name, vl.created_at,
      (SELECT COUNT(*) FROM list_items WHERE list_id = vl.id) AS word_count
    FROM vocabulary_lists vl
    WHERE vl.user_id = ?
    ORDER BY vl.created_at DESC
  `).all(req.user.id)
  res.json(rows)
})

app.post('/api/lists', requireAuth, (req, res) => {
  const { name } = req.body
  if (!name) return res.status(400).json({ error: 'Name required' })
  const result = db.prepare('INSERT INTO vocabulary_lists (user_id, name) VALUES (?, ?)').run(req.user.id, name)
  res.json({ id: result.lastInsertRowid, name })
})

app.delete('/api/lists/:listId', requireAuth, (req, res) => {
  const list = db.prepare('SELECT id FROM vocabulary_lists WHERE id = ? AND user_id = ?').get(req.params.listId, req.user.id)
  if (!list) return res.status(404).json({ error: 'List not found' })
  db.transaction(() => {
    db.prepare('DELETE FROM list_items WHERE list_id = ?').run(req.params.listId)
    db.prepare('DELETE FROM vocabulary_lists WHERE id = ?').run(req.params.listId)
  })()
  res.json({ message: 'Deleted' })
})

app.post('/api/lists/:listId/words/:wordId', requireAuth, (req, res) => {
  const list = db.prepare('SELECT id FROM vocabulary_lists WHERE id = ? AND user_id = ?').get(req.params.listId, req.user.id)
  if (!list) return res.status(404).json({ error: 'List not found' })
  db.prepare('INSERT OR IGNORE INTO list_items (list_id, word_id) VALUES (?, ?)').run(req.params.listId, req.params.wordId)
  res.json({ message: 'Added' })
})

app.delete('/api/lists/:listId/words/:wordId', requireAuth, (req, res) => {
  db.prepare('DELETE FROM list_items WHERE list_id = ? AND word_id = ?').run(req.params.listId, req.params.wordId)
  res.json({ message: 'Removed' })
})

app.get('/api/lists/:listId', requireAuth, (req, res) => {
  const list = db.prepare('SELECT * FROM vocabulary_lists WHERE id = ? AND user_id = ?').get(req.params.listId, req.user.id)
  if (!list) return res.status(404).json({ error: 'List not found' })
  const words = db.prepare(`
    SELECT w.id, w.character, w.pinyin, w.english_definition, w.hsk_level
    FROM list_items li
    JOIN words w ON w.id = li.word_id
    WHERE li.list_id = ?
  `).all(req.params.listId)
  res.json({ ...list, words })
})

app.get('/api/flashcards/due', requireAuth, (req, res) => {
  const rows = db.prepare(`
    SELECT fp.id AS progress_id, fp.ease_factor, fp.interval_days, fp.next_review_date,
           fp.correct_count, fp.incorrect_count,
           w.id, w.character, w.pinyin, w.english_definition, w.hsk_level
    FROM flashcard_progress fp
    JOIN words w ON w.id = fp.word_id
    WHERE fp.user_id = ? AND fp.next_review_date <= date('now')
    ORDER BY fp.next_review_date ASC
  `).all(req.user.id)
  res.json(rows)
})

app.get('/api/flashcards/indeck/:wordId', requireAuth, (req, res) => {
  const entry = db.prepare('SELECT id FROM flashcard_progress WHERE user_id = ? AND word_id = ?').get(req.user.id, req.params.wordId)
  res.json({ inDeck: !!entry })
})

app.post('/api/flashcards/:wordId/init', requireAuth, (req, res) => {
  db.prepare(`
    INSERT OR IGNORE INTO flashcard_progress (user_id, word_id)
    VALUES (?, ?)
  `).run(req.user.id, req.params.wordId)
  res.json({ message: 'Initialized' })
})

app.post('/api/flashcards/:wordId/result', requireAuth, (req, res) => {
  const { wordId } = req.params
  const { correct } = req.body

  const existing = db.prepare('SELECT * FROM flashcard_progress WHERE user_id = ? AND word_id = ?').get(req.user.id, wordId)
  if (!existing) {
    db.prepare('INSERT INTO flashcard_progress (user_id, word_id) VALUES (?, ?)').run(req.user.id, wordId)
  }

  const entry = db.prepare('SELECT * FROM flashcard_progress WHERE user_id = ? AND word_id = ?').get(req.user.id, wordId)
  let { ease_factor, interval_days, correct_count, incorrect_count } = entry

  if (correct) {
    ease_factor = Math.max(1.3, ease_factor + 0.1)
    interval_days = Math.round(interval_days * ease_factor)
    correct_count++
  } else {
    ease_factor = Math.max(1.3, ease_factor - 0.2)
    interval_days = 1
    incorrect_count++
  }

  db.prepare(`
    UPDATE flashcard_progress
    SET ease_factor = ?, interval_days = ?,
        next_review_date = date('now', '+' || ? || ' days'),
        correct_count = ?, incorrect_count = ?
    WHERE user_id = ? AND word_id = ?
  `).run(ease_factor, interval_days, interval_days, correct_count, incorrect_count, req.user.id, wordId)

  res.json({ message: 'Updated' })
})

app.delete('/api/flashcards/:wordId', requireAuth, (req, res) => {
  db.prepare('DELETE FROM flashcard_progress WHERE user_id = ? AND word_id = ?').run(req.user.id, req.params.wordId)
  res.json({ message: 'Removed from deck' })
})

app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ error: 'Internal server error' })
})

app.listen(PORT, () => {
  console.log(`Zihai backend running on http://localhost:${PORT}`)
})
