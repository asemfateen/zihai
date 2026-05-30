import express from 'express'
import Database from 'better-sqlite3'
import cors from 'cors'
import helmet from 'helmet'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import cookieParser from 'cookie-parser'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import crypto from 'crypto'
import rateLimit from 'express-rate-limit'
import nodemailer from 'nodemailer'
import { normalizePinyin, searchNormalizePinyin, splitPinyin } from './pinyinUtils.js'

function generateCsrfToken() {
  return crypto.randomBytes(32).toString('hex')
}

function csrfProtection(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next()
  const headerToken = req.headers['x-csrf-token']
  const cookieToken = req.cookies?.['xsrf-token']
  if (!headerToken || !cookieToken || headerToken !== cookieToken) {
    return res.status(403).json({ error: 'Invalid CSRF token' })
  }
  next()
}

function setCsrfCookie(req, res, next) {
  if (!req.cookies?.['xsrf-token']) {
    const token = generateCsrfToken()
    res.cookie('xsrf-token', token, {
      httpOnly: false,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    })
    res.set('x-csrf-token', token)
  } else {
    res.set('x-csrf-token', req.cookies['xsrf-token'])
  }
  next()
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.join(__dirname, '.env') })

let JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('CRITICAL CONFIG ERROR: JWT_SECRET must be set in production!')
  }
  console.warn('WARNING: No JWT_SECRET set. Using insecure development fallback. Do not run in production without setting JWT_SECRET.')
  JWT_SECRET = 'zihai-dev-insecure-secret-do-not-use-in-production'
}

const db = new Database(path.join(__dirname, 'zihai.db'))
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

const app = express()
app.set('trust proxy', 1)
const PORT = process.env.PORT || 3002

let mailTransporter = null
if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
  try {
    mailTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
  } catch (err) {
    console.error('Failed to create mail transporter:', err.message)
  }
}

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many attempts. Please wait a few minutes and try again.' },
  standardHeaders: true,
  legacyHeaders: false,
})

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { error: 'Too many requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
})

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false,
}))

app.use(cors({
  origin: function(origin, callback) {
    const allowed = [
      'https://zihai.vercel.app',
      /https:\/\/zihai-.*\.vercel\.app$/,
      /https?:\/\/.*\.railway\.app$/,
      /^https?:\/\/(localhost|127\.0\.0\.1):\d+$/,
    ]
    if (process.env.ALLOWED_ORIGIN) {
      allowed.push(process.env.ALLOWED_ORIGIN)
    }
    if (!origin || allowed.some(a =>
      typeof a === 'string' ? a === origin : a.test(origin)
    )) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
  exposedHeaders: ['x-csrf-token'],
}))

app.use(cookieParser())
app.use(setCsrfCookie)
app.use(express.json({ limit: '10kb' }))
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ error: 'Invalid JSON in request body' })
  }
  if (err.type === 'entity.too.large' || (err.status === 413)) {
    return res.status(413).json({ error: 'Request body too large' })
  }
  next(err)
})

app.use('/api/', (req, res, next) => {
  if (['/login', '/register', '/forgot-password', '/reset-password'].includes(req.path)) {
    return next()
  }
  return apiLimiter(req, res, next)
})

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

  CREATE INDEX IF NOT EXISTS idx_words_pinyin_normalized ON words(pinyin_normalized);
  CREATE INDEX IF NOT EXISTS idx_words_character ON words(character);

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
     added_at TEXT DEFAULT (datetime('now')),
     ease_factor REAL DEFAULT 2.5,
     interval_days INTEGER DEFAULT 0,
     repetition INTEGER DEFAULT 0,
     next_review_date TEXT DEFAULT (date('now')),
     correct_count INTEGER DEFAULT 0,
     incorrect_count INTEGER DEFAULT 0,
     UNIQUE(user_id, word_id)
   );

  CREATE TABLE IF NOT EXISTS password_resets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    used INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token);
  CREATE INDEX IF NOT EXISTS idx_favorites_user_word ON favorites(user_id, word_id);
  CREATE INDEX IF NOT EXISTS idx_flashcard_due ON flashcard_progress(user_id, next_review_date);
  CREATE INDEX IF NOT EXISTS idx_search_history_user ON search_history(user_id, searched_at);
  CREATE INDEX IF NOT EXISTS idx_list_items_list ON list_items(list_id);
  CREATE INDEX IF NOT EXISTS idx_words_english_definition ON words(english_definition);
  CREATE INDEX IF NOT EXISTS idx_flashcard_user ON flashcard_progress(user_id, word_id);
  CREATE INDEX IF NOT EXISTS idx_vocabulary_lists_user ON vocabulary_lists(user_id);
  CREATE INDEX IF NOT EXISTS idx_list_items_word ON list_items(word_id);
  CREATE UNIQUE INDEX IF NOT EXISTS idx_words_character_unique ON words(character);

`)

try {
  db.exec('ALTER TABLE flashcard_progress ADD COLUMN repetition INTEGER DEFAULT 0')
} catch {
  // Column already exists
}

const isSecure = process.env.NODE_ENV === 'production'
const cookieOptions = {
  httpOnly: true,
  sameSite: isSecure ? 'none' : 'lax',
  secure: isSecure,
  maxAge: 7 * 24 * 60 * 60 * 1000,
}

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

function sanitizeEmail(email) {
  return email.trim().toLowerCase()
}

function sanitizeString(str) {
  if (typeof str !== 'string') return ''
  return str.replace(/[<>]/g, '').trim()
}

app.post('/api/register', authLimiter, async (req, res) => {
  const rawEmail = req.body.email || ''
  const rawPassword = req.body.password || ''
  if (!rawEmail || !rawPassword) {
    return res.status(400).json({ error: 'Email and password required' })
  }
  const email = sanitizeEmail(rawEmail)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' })
  }
  if (rawPassword.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' })
  }
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email)
  if (existing) {
    return res.status(409).json({ error: 'Email already registered' })
  }
  const password_hash = await bcrypt.hash(rawPassword, 10)
  const result = db.prepare('INSERT INTO users (email, password_hash) VALUES (?, ?)').run(email, password_hash)
  const token = jwt.sign({ id: result.lastInsertRowid, email }, JWT_SECRET, { expiresIn: '7d' })
  res.cookie('token', token, cookieOptions)
  res.json({ id: result.lastInsertRowid, email })
})

app.post('/api/login', authLimiter, async (req, res) => {
  const rawEmail = req.body.email || ''
  const password = req.body.password || ''
  if (!rawEmail || !password) {
    return res.status(400).json({ error: 'Email and password required' })
  }
  const email = sanitizeEmail(rawEmail)
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email)
  if (!user || !user.password_hash) {
    return res.status(401).json({ error: 'Invalid credentials' })
  }
  const valid = await bcrypt.compare(password, user.password_hash)
  if (!valid) {
    return res.status(401).json({ error: 'Invalid credentials' })
  }
  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' })
  res.cookie('token', token, cookieOptions)
  res.json({ id: user.id, email: user.email })
})

app.post('/api/logout', (req, res) => {
  res.clearCookie('token')
  res.json({ message: 'Logged out' })
})

app.get('/api/me', requireAuth, (req, res) => {
  const user = db.prepare('SELECT id, email, created_at FROM users WHERE id = ?').get(req.user.id)
  if (!user) return res.status(401).json({ error: 'User not found' })
  res.json({ id: user.id, email: user.email, created_at: user.created_at })
})

app.get('/api/profile', requireAuth, (req, res) => {
  const user = db.prepare('SELECT email, created_at FROM users WHERE id = ?').get(req.user.id)
  if (!user) return res.status(404).json({ error: 'User not found' })
  const favorites_count = db.prepare('SELECT COUNT(*) as count FROM favorites WHERE user_id = ?').get(req.user.id).count
  const flashcards_reviewed = db.prepare(`
    SELECT COALESCE(SUM(correct_count + incorrect_count), 0) as total
    FROM flashcard_progress WHERE user_id = ?
  `).get(req.user.id).total
  const vocabulary_lists_count = db.prepare('SELECT COUNT(*) as count FROM vocabulary_lists WHERE user_id = ?').get(req.user.id).count
  res.json({
    email: user.email,
    created_at: user.created_at,
    favorites_count,
    flashcards_reviewed,
    vocabulary_lists_count,
  })
})

app.get('/api/dashboard', requireAuth, (req, res) => {
  const today = new Date().toISOString().slice(0, 10)
  const searches_today = db.prepare(`
    SELECT COUNT(*) as count FROM search_history
    WHERE user_id = ? AND date(searched_at) = ?
  `).get(req.user.id, today).count
  const flashcards_due = db.prepare(`
    SELECT COUNT(*) as count FROM flashcard_progress
    WHERE user_id = ? AND next_review_date <= date('now')
  `).get(req.user.id).count
  const favorites_count = db.prepare('SELECT COUNT(*) as count FROM favorites WHERE user_id = ?').get(req.user.id).count
  const recent_searches = db.prepare(`
    SELECT query, searched_at FROM search_history
    WHERE user_id = ? ORDER BY searched_at DESC LIMIT 5
  `).all(req.user.id)
  res.json({ searches_today, flashcards_due, favorites_count, recent_searches })
})

app.post('/api/forgot-password', authLimiter, async (req, res) => {
  const rawEmail = req.body.email || ''
  if (!rawEmail) {
    return res.status(400).json({ error: 'Email required' })
  }
  const email = sanitizeEmail(rawEmail)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' })
  }
  const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email)
  if (user) {
    const token = crypto.randomBytes(32).toString('hex')
    db.prepare('DELETE FROM password_resets WHERE user_id = ?').run(user.id)
    db.prepare(`
      INSERT INTO password_resets (user_id, token, expires_at)
      VALUES (?, ?, datetime('now', '+1 hour'))
    `).run(user.id, token)
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
    const resetUrl = `${frontendUrl}/reset-password/${token}`

    if (mailTransporter) {
      try {
        await mailTransporter.sendMail({
          from: process.env.SMTP_FROM || 'noreply@zihai.app',
          to: email,
          subject: 'Zihai Password Reset',
          text: `Reset your password here: ${resetUrl}`,
          html: `<p>Click <a href="${resetUrl}">here</a> to reset your password. This link expires in 1 hour.</p>`,
        })
      } catch (err) {
        console.error('Failed to send password reset email:', err)
      }
    }
    if (!mailTransporter || process.env.NODE_ENV !== 'production') {
      console.log(`[DEV] Password reset link for ${email}: ${resetUrl}`)
    }
  }
  res.json({ message: 'If an account exists a reset link has been sent' })
})

app.post('/api/reset-password', authLimiter, async (req, res) => {
  const { token, password } = req.body
  if (!token || !password) {
    return res.status(400).json({ error: 'Token and password required' })
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' })
  }
  const entry = db.prepare(`
    SELECT pr.user_id, u.email
    FROM password_resets pr
    JOIN users u ON u.id = pr.user_id
    WHERE pr.token = ? AND pr.used = 0 AND pr.expires_at > datetime('now')
  `).get(token)
  if (!entry) {
    return res.status(400).json({ error: 'Invalid or expired reset token' })
  }
  const password_hash = await bcrypt.hash(password, 10)
  db.transaction(() => {
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(password_hash, entry.user_id)
    db.prepare('UPDATE password_resets SET used = 1 WHERE token = ?').run(token)
  })()
  res.json({ message: 'Password has been reset successfully' })
})

app.get('/api/dev-reset-link/:token', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not available in production' })
  }
  const entry = db.prepare(`
    SELECT pr.user_id, u.email, pr.expires_at
    FROM password_resets pr
    JOIN users u ON u.id = pr.user_id
    WHERE pr.token = ? AND pr.used = 0 AND pr.expires_at > datetime('now')
  `).get(req.params.token)
  if (!entry) {
    return res.status(400).json({ error: 'Invalid or expired reset token' })
  }
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
  res.json({ resetUrl: `${frontendUrl}/reset-password/${req.params.token}` })
})

app.get('/api/search', (req, res) => {
  const q = (req.query.q || '').trim()
  if (!q) return res.json([])

  const escapedQuery = q.replace(/[%_]/g, '\\$&')
  const pinyinNorm = normalizePinyin(escapedQuery)
  const pinyinNormQuery = pinyinNorm ? '% ' + pinyinNorm + ' %' : null
  const pinyinConcat = pinyinNorm ? pinyinNorm.replace(/\s+/g, '') : null
  const pinyinConcatQuery = pinyinConcat && pinyinConcat !== pinyinNorm ? '%' + pinyinConcat + '%' : null
  const pinyinSearchNorm = searchNormalizePinyin(escapedQuery)
  const pinyinSearchQuery = pinyinSearchNorm ? '% ' + pinyinSearchNorm + ' %' : null
  const pinyinSplit = pinyinNorm && !pinyinNorm.includes(' ') ? splitPinyin(pinyinNorm) : null
  const pinyinSplitQuery = pinyinSplit && pinyinSplit !== pinyinNorm ? '% ' + pinyinSplit + ' %' : null

  const defWordQuery = '% ' + escapedQuery + ' %'
  const defStartQuery = escapedQuery + ' %'
  const defEndQuery = '% ' + escapedQuery

  const whereParts = [
    'character = ?',
    "(' ' || pinyin_normalized || ' ') LIKE ?",
    "(' ' || pinyin_search || ' ') LIKE ?",
  ]
  const whereParams = [q, pinyinNormQuery, pinyinSearchQuery]

  if (pinyinConcatQuery) {
    whereParts.push("(REPLACE(pinyin_normalized, ' ', '') LIKE ?)")
    whereParams.push(pinyinConcatQuery)
  }
  if (pinyinSplitQuery) {
    whereParts.push("(' ' || pinyin_normalized || ' ') LIKE ?")
    whereParams.push(pinyinSplitQuery)
  }

  whereParts.push('english_definition = ?', 'english_definition LIKE ?', 'english_definition LIKE ?', 'english_definition LIKE ?')
  whereParams.push(escapedQuery, defWordQuery, defStartQuery, defEndQuery)

  const orderBy = [
    'CASE WHEN character = ? THEN 0 ELSE 1 END',
    "CASE WHEN english_definition = ? OR (' ' || pinyin_normalized || ' ') LIKE ? THEN 0 ELSE 1 END",
    'LENGTH(character)',
    'COALESCE(hsk_level, 999)',
    'CASE WHEN english_definition = ? THEN 0 ELSE 1 END',
    "CASE WHEN (' ' || pinyin_search || ' ') LIKE ? THEN 0 ELSE 1 END",
    'CASE WHEN english_definition LIKE ? THEN 0 ELSE 1 END',
  ]
  const orderParams = [q, q, pinyinNormQuery, q, pinyinSearchQuery, defStartQuery]

  const rows = db.prepare(`
    SELECT id, character, COALESCE(pinyin_display, pinyin_normalized, pinyin) AS pinyin, english_definition, hsk_level
    FROM words
    WHERE ${whereParts.join(' OR ')}
    ORDER BY ${orderBy.join(', ')},
      LENGTH(character),
      CASE WHEN LENGTH(english_definition) > 100 OR (LENGTH(english_definition) - LENGTH(REPLACE(english_definition, ',', ''))) > 3 THEN 1 ELSE 0 END,
      id
    LIMIT 100
  `).all(...whereParams, ...orderParams)

  const filtered = rows.filter(r =>
    r.character
    && !r.character.includes('\uFFFD')
    && r.english_definition
    && r.character.length <= 8
    && r.english_definition.length <= 300
    && /^[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]+$/.test(r.character)
  )
  res.json(filtered)
})

app.get('/api/word/:id', (req, res) => {
  const word = db.prepare(`
    SELECT id, character, COALESCE(pinyin_display, pinyin_normalized, pinyin) AS pinyin,
           english_definition, hsk_level, pinyin_search
    FROM words WHERE id = ?
  `).get(req.params.id)
  if (!word) return res.status(404).json({ error: 'Word not found' })
  res.json(word)
})

app.post('/api/history', requireAuth, (req, res) => {
  const { query } = req.body
  if (!query) return res.status(400).json({ error: 'Query required' })
  try {
    db.prepare(`
      INSERT INTO search_history (user_id, query, searched_at) VALUES (?, ?, datetime('now'))
      ON CONFLICT(user_id, query) DO UPDATE SET searched_at = datetime('now')
    `).run(req.user.id, query)
  } catch {
    db.prepare(`
      INSERT INTO search_history (user_id, query, searched_at) VALUES (?, ?, datetime('now'))
    `).run(req.user.id, query)
  }
  res.json({ message: 'Saved' })
})

app.get('/api/history', requireAuth, (req, res) => {
  const rows = db.prepare(`
    SELECT id, query, searched_at FROM search_history
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
    SELECT w.id, w.character, COALESCE(w.pinyin_display, w.pinyin_normalized, w.pinyin) AS pinyin, w.english_definition, w.hsk_level
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
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: 'Name is required' })
  }
  const trimmed = name.trim().replace(/<[^>]*>/g, '').replace(/[<>]/g, '')
  if (trimmed.length === 0) {
    return res.status(400).json({ error: 'Name is required' })
  }
  if (trimmed.length > 100) {
    return res.status(400).json({ error: 'Name must be 100 characters or less' })
  }
  const result = db.prepare('INSERT INTO vocabulary_lists (user_id, name) VALUES (?, ?)').run(req.user.id, trimmed)
  res.json({ id: result.lastInsertRowid, name: trimmed })
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
    SELECT w.id, w.character, COALESCE(w.pinyin_display, w.pinyin_normalized, w.pinyin) AS pinyin, w.english_definition, w.hsk_level
    FROM list_items li
    JOIN words w ON w.id = li.word_id
    WHERE li.list_id = ?
  `).all(req.params.listId)
  res.json({ ...list, words })
})

const FLASHCARD_STATIC_ROUTES = {
  due: true,
}

app.get('/api/flashcards/due', requireAuth, (req, res) => {
  const rows = db.prepare(`
    SELECT fp.id AS progress_id, fp.ease_factor, fp.interval_days, fp.repetition, fp.next_review_date,
         fp.correct_count, fp.incorrect_count,
         w.id, w.character, COALESCE(w.pinyin_display, w.pinyin_normalized, w.pinyin) AS pinyin, w.english_definition, w.hsk_level
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
  if (FLASHCARD_STATIC_ROUTES[req.params.wordId]) {
    return res.status(400).json({ error: 'Invalid word ID' })
  }
  db.prepare(`
    INSERT OR IGNORE INTO flashcard_progress (user_id, word_id, added_at, next_review_date)
    VALUES (?, ?, datetime('now'), date('now'))
  `).run(req.user.id, req.params.wordId)
  res.json({ message: 'Initialized' })
})

app.post('/api/flashcards/:wordId/add', requireAuth, (req, res) => {
  if (FLASHCARD_STATIC_ROUTES[req.params.wordId]) {
    return res.status(400).json({ error: 'Invalid word ID' })
  }
  db.prepare(`
    INSERT OR IGNORE INTO flashcard_progress (user_id, word_id, added_at, next_review_date)
    VALUES (?, ?, datetime('now'), date('now'))
  `).run(req.user.id, req.params.wordId)
  res.json({ message: 'Added to flashcards' })
})

app.post('/api/flashcards/:wordId/result', requireAuth, (req, res) => {
  const { wordId } = req.params
  const { quality } = req.body

  if (FLASHCARD_STATIC_ROUTES[wordId]) {
    return res.status(400).json({ error: 'Invalid word ID' })
  }

  if (quality === undefined || !Number.isInteger(quality) || quality < 0 || quality > 5) {
    return res.status(400).json({ error: 'Quality must be an integer between 0 and 5' })
  }

  let entry = db.prepare('SELECT * FROM flashcard_progress WHERE user_id = ? AND word_id = ?').get(req.user.id, wordId)
  if (!entry) {
    db.prepare('INSERT INTO flashcard_progress (user_id, word_id, next_review_date) VALUES (?, ?, date(\'now\'))').run(req.user.id, wordId)
    entry = db.prepare('SELECT * FROM flashcard_progress WHERE user_id = ? AND word_id = ?').get(req.user.id, wordId)
  }

  let { ease_factor, interval_days, repetition, correct_count, incorrect_count } = entry

  // SM-2 algorithm
  ease_factor = ease_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  ease_factor = Math.max(1.3, ease_factor)

  if (quality >= 3) {
    repetition++
    if (repetition === 1) {
      interval_days = 1
    } else if (repetition === 2) {
      interval_days = 6
    } else {
      interval_days = Math.round(interval_days * ease_factor)
    }
    correct_count++
  } else {
    repetition = 0
    interval_days = 1
    incorrect_count++
  }

  db.prepare(`
    UPDATE flashcard_progress
    SET ease_factor = ?, interval_days = ?, repetition = ?,
        next_review_date = date('now', '+' || ? || ' days'),
        correct_count = ?, incorrect_count = ?
    WHERE user_id = ? AND word_id = ?
  `).run(ease_factor, Math.max(1, interval_days), repetition, Math.max(1, interval_days), correct_count, incorrect_count, req.user.id, wordId)

  res.json({ message: 'Updated' })
})

app.delete('/api/flashcards/:wordId', requireAuth, (req, res) => {
  if (FLASHCARD_STATIC_ROUTES[req.params.wordId]) {
    return res.status(400).json({ error: 'Invalid word ID' })
  }
  db.prepare('DELETE FROM flashcard_progress WHERE user_id = ? AND word_id = ?').run(req.user.id, req.params.wordId)
  res.json({ message: 'Removed from deck' })
})

app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ error: 'Internal server error' })
})

const shutdown = () => {
  console.log('Shutting down gracefully...')
  try { db.close() } catch {}
  process.exit(0)
}
process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)

app.listen(PORT, () => {
  console.log(`Zihai backend running on http://localhost:${PORT}`)
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`)
})
