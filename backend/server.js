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
import os from 'os'
import rateLimit from 'express-rate-limit'
import nodemailer from 'nodemailer'
import { normalizePinyin, searchNormalizePinyin, splitPinyin, generatePinyinAlternatives } from './pinyinUtils.js'
import { convertNumberedPinyin } from './utils/pinyin.js'
import RADICALS from './radicals.js'

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

const DB_PATH = process.env.DB_PATH || path.join(os.homedir(), 'zihai.db')
const db = new Database(DB_PATH)
db.pragma('journal_mode = WAL')
db.pragma('synchronous = NORMAL')
db.pragma('cache_size = -16000')
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

const localIps = []
try {
  const nets = os.networkInterfaces()
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        localIps.push(net.address)
      }
    }
  }
} catch { /* ignore */ }

app.use(cors({
  origin: function(origin, callback) {
    const allowed = [
      'https://zihai.vercel.app',
      /https:\/\/zihai-.*\.vercel\.app$/,
      /https?:\/\/.*\.railway\.app$/,
      /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\]):\d+$/,
    ]
    for (const ip of localIps) {
      allowed.push(new RegExp(`^https?:\\/\\/${ip.replace(/\./g, '\\.')}:\\d+$`))
    }
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
  if (['/login', '/register', '/forgot-password', '/reset-password', '/ping'].includes(req.path)) {
    return next()
  }
  return apiLimiter(req, res, next)
})

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

`)

try {
  db.exec('ALTER TABLE flashcard_progress ADD COLUMN repetition INTEGER DEFAULT 0')
} catch {
  // Column already exists
}

try {
  db.exec('ALTER TABLE flashcard_progress ADD COLUMN added_at TEXT')
} catch {
  // Column already exists
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
  res.json({ token, id: result.lastInsertRowid, email, display_name: null })
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
  res.json({ token, id: user.id, email: user.email, display_name: user.display_name })
})

app.post('/api/logout', (req, res) => {
  res.clearCookie('token')
  res.json({ message: 'Logged out' })
})

app.get('/api/me', requireAuth, (req, res) => {
  const user = db.prepare('SELECT id, email, display_name, created_at FROM users WHERE id = ?').get(req.user.id)
  if (!user) return res.status(401).json({ error: 'User not found' })
  res.json({ id: user.id, email: user.email, display_name: user.display_name, created_at: user.created_at })
})

app.get('/api/profile', requireAuth, (req, res) => {
  const user = db.prepare('SELECT email, display_name, created_at FROM users WHERE id = ?').get(req.user.id)
  if (!user) return res.status(404).json({ error: 'User not found' })
  const favorites_count = db.prepare('SELECT COUNT(*) as count FROM favorites WHERE user_id = ?').get(req.user.id).count
  const flashcards_reviewed = db.prepare(`
    SELECT COALESCE(SUM(correct_count + incorrect_count), 0) as total
    FROM flashcard_progress WHERE user_id = ?
  `).get(req.user.id).total
  const flashcards_due = db.prepare(`
    SELECT COUNT(*) as count FROM flashcard_progress
    WHERE user_id = ? AND next_review_date <= date('now')
  `).get(req.user.id).count
  res.json({
    email: user.email,
    display_name: user.display_name,
    created_at: user.created_at,
    favorites_count,
    flashcards_reviewed,
    flashcards_due,
  })
})

app.get('/api/stats', requireAuth, (req, res) => {
  try {
    const historyDates = db.prepare(`
      SELECT DISTINCT date(searched_at) as date FROM search_history
      WHERE user_id = ? ORDER BY date DESC
    `).all(req.user.id).map(r => r.date)

    let streak = 0
    if (historyDates.length > 0) {
      const todayStr = new Date().toISOString().slice(0, 10)
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = yesterday.toISOString().slice(0, 10)

      if (historyDates[0] === todayStr || historyDates[0] === yesterdayStr) {
        streak = 1
        let lastDate = new Date(historyDates[0])
        for (let i = 1; i < historyDates.length; i++) {
          const currentDate = new Date(historyDates[i])
          const diffDays = Math.round((lastDate - currentDate) / (1000 * 60 * 60 * 24))
          if (diffDays === 1) {
            streak++
            lastDate = currentDate
          } else if (diffDays > 1) {
            break
          }
        }
      }
    }

    const totalCards = db.prepare('SELECT COUNT(*) as count FROM flashcard_progress WHERE user_id = ?').get(req.user.id).count
    const newCards = db.prepare('SELECT COUNT(*) as count FROM flashcard_progress WHERE user_id = ? AND next_review_date <= date(\'now\')').get(req.user.id).count
    const learningCards = db.prepare('SELECT COUNT(*) as count FROM flashcard_progress WHERE user_id = ? AND repetition > 0 AND repetition < 5').get(req.user.id).count
    const masteredCards = db.prepare('SELECT COUNT(*) as count FROM flashcard_progress WHERE user_id = ? AND repetition >= 5').get(req.user.id).count

    const hskProgress = db.prepare(`
      SELECT hsk_level, COUNT(*) as count
      FROM (
        SELECT fp.word_id, COALESCE(w.hsk_level, c.hsk_level) as hsk_level
        FROM flashcard_progress fp
        LEFT JOIN cedict_words w ON w.id = fp.word_id
        LEFT JOIN characters c ON c.id = fp.word_id
        WHERE fp.user_id = ?
      )
      WHERE hsk_level IS NOT NULL AND hsk_level > 0
      GROUP BY hsk_level
      ORDER BY hsk_level ASC
    `).all(req.user.id)

    res.json({
      streak,
      totalCards,
      newCards,
      learningCards,
      masteredCards,
      hskProgress,
    })
  } catch (err) {
    console.error('Failed to compile stats:', err.message)
    res.status(500).json({ error: 'Failed to fetch statistics' })
  }
})

app.patch('/api/profile', requireAuth, (req, res) => {
  const { display_name } = req.body
  if (display_name !== undefined) {
    const sanitized = sanitizeString(display_name)
    if (sanitized.length > 50) {
      return res.status(400).json({ error: 'Display name must be 50 characters or less' })
    }
    db.prepare('UPDATE users SET display_name = ? WHERE id = ?').run(sanitized || null, req.user.id)
  }
  const user = db.prepare('SELECT email, display_name, created_at FROM users WHERE id = ?').get(req.user.id)
  res.json({ email: user.email, display_name: user.display_name, created_at: user.created_at })
})

app.post('/api/profile/change-password', requireAuth, async (req, res) => {
  const { current_password, new_password } = req.body
  if (!current_password || !new_password) {
    return res.status(400).json({ error: 'Current and new password required' })
  }
  if (new_password.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters' })
  }
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id)
  if (!user || !user.password_hash) {
    return res.status(400).json({ error: 'Cannot change password for this account' })
  }
  const valid = await bcrypt.compare(current_password, user.password_hash)
  if (!valid) {
    return res.status(401).json({ error: 'Current password is incorrect' })
  }
  const password_hash = await bcrypt.hash(new_password, 10)
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(password_hash, req.user.id)
  res.json({ message: 'Password updated successfully' })
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

app.get('/api/ping', (req, res) => {
  res.json({ status: 'ok' })
})

app.get('/api/search', (req, res) => {
  const q = (typeof req.query.q === 'string' ? req.query.q : '').trim()
  if (!q) return res.json([])
  if (q.length > 50) return res.status(400).json({ error: 'Query too long' })

  const hasChinese = /[\u4e00-\u9fa5]/.test(q)
  const isAlpha = /^[A-Za-z]+$/.test(q)
  const qLower = q.toLowerCase()
  let rows = []

  try {
    if (hasChinese) {
      const pattern = q + '%'
      const ch = db.prepare(`
        SELECT id, simplified, traditional, pinyin, pinyin_flat, definition, hsk_level,
          CASE WHEN simplified = ? THEN 1 ELSE 0 END as exact_match,
          CASE WHEN definition LIKE '%variant of%' THEN 1 ELSE 0 END as is_variant
        FROM characters WHERE simplified LIKE ?
        ORDER BY is_variant, exact_match DESC, (CASE WHEN hsk_level > 0 THEN 1 ELSE 0 END) DESC, hsk_level ASC, length(simplified) ASC LIMIT 50
      `).all(q, pattern)
      const cw = db.prepare(`
        SELECT id, simplified, traditional, pinyin, pinyin_flat, definition, hsk_level,
          CASE WHEN simplified = ? THEN 1 ELSE 0 END as exact_match,
          CASE WHEN definition LIKE '%variant of%' THEN 1 ELSE 0 END as is_variant
        FROM cedict_words WHERE simplified LIKE ?
        ORDER BY is_variant, exact_match DESC, (CASE WHEN hsk_level > 0 THEN 1 ELSE 0 END) DESC, hsk_level ASC, length(simplified) ASC LIMIT 50
      `).all(q, pattern)
      rows = [...ch, ...cw]
    } else if (isAlpha) {
      const prefix = qLower + '%'
      const wildcard = '%' + qLower + '%'
      const prefixSpace = qLower + ' %'
      const prefixSemi = qLower + ';%'

      const ch = db.prepare(`
        SELECT id, simplified, traditional, pinyin, pinyin_flat, definition, hsk_level,
          CASE WHEN definition LIKE '%variant of%' THEN 1 ELSE 0 END as is_variant
        FROM characters WHERE pinyin_flat LIKE ? OR definition LIKE ?
        ORDER BY is_variant ASC,
          (CASE
            WHEN pinyin_flat = ? THEN 3
            WHEN definition = ? OR definition LIKE ? OR definition LIKE ? THEN 3
            WHEN pinyin_flat LIKE ? THEN 1
            ELSE 0
          END) DESC,
          (CASE WHEN hsk_level > 0 THEN 1 ELSE 0 END) DESC,
          hsk_level ASC,
          length(simplified) ASC
        LIMIT 50
      `).all(prefix, wildcard, qLower, qLower, prefixSpace, prefixSemi, prefix)
      const cw = db.prepare(`
        SELECT id, simplified, traditional, pinyin, pinyin_flat, definition, hsk_level,
          CASE WHEN definition LIKE '%variant of%' THEN 1 ELSE 0 END as is_variant
        FROM cedict_words WHERE pinyin_flat LIKE ? OR definition LIKE ?
        ORDER BY is_variant ASC,
          (CASE
            WHEN pinyin_flat = ? THEN 3
            WHEN definition = ? OR definition LIKE ? OR definition LIKE ? THEN 3
            WHEN pinyin_flat LIKE ? THEN 1
            ELSE 0
          END) DESC,
          (CASE WHEN hsk_level > 0 THEN 1 ELSE 0 END) DESC,
          hsk_level ASC,
          length(simplified) ASC
        LIMIT 50
      `).all(prefix, wildcard, qLower, qLower, prefixSpace, prefixSemi, prefix)
      rows = [...ch, ...cw]
    } else {
      const pattern = '%' + q + '%'
      const ch = db.prepare(`
        SELECT id, simplified, traditional, pinyin, pinyin_flat, definition, hsk_level,
          0 as exact_match,
          CASE WHEN definition LIKE '%variant of%' THEN 1 ELSE 0 END as is_variant
        FROM characters WHERE definition LIKE ?
        ORDER BY is_variant, (CASE WHEN hsk_level > 0 THEN 1 ELSE 0 END) DESC, hsk_level ASC, length(simplified) ASC LIMIT 50
      `).all(pattern)
      const cw = db.prepare(`
        SELECT id, simplified, traditional, pinyin, pinyin_flat, definition, hsk_level,
          0 as exact_match,
          CASE WHEN definition LIKE '%variant of%' THEN 1 ELSE 0 END as is_variant
        FROM cedict_words WHERE definition LIKE ?
        ORDER BY is_variant, (CASE WHEN hsk_level > 0 THEN 1 ELSE 0 END) DESC, hsk_level ASC, length(simplified) ASC LIMIT 50
      `).all(pattern)
      rows = [...ch, ...cw]
    }
  } catch (err) {
    console.error('Search query failed:', err.message)
    return res.status(500).json({ error: 'Search query failed' })
  }

  rows.forEach(r => { r.pinyin = convertNumberedPinyin(r.pinyin) })
  res.json(rows)
})

app.get('/api/radicals', (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT r.id, r.character, r.name, COALESCE(w.cnt, 0) AS count
      FROM radicals r
      LEFT JOIN (SELECT radical, COUNT(*) AS cnt FROM characters WHERE radical IS NOT NULL GROUP BY radical) w ON w.radical = r.id
      ORDER BY w.cnt DESC NULLS LAST, r.id
    `).all()
    res.json(rows)
  } catch (err) {
    console.error('Radicals query failed:', err.message)
    return res.status(500).json({ error: 'Failed to fetch radicals' })
  }
})

app.get('/api/radicals/:radical', (req, res) => {
  const radical = parseInt(req.params.radical, 10)
  if (isNaN(radical) || radical < 1 || radical > 214) {
    return res.status(400).json({ error: 'Radical must be an integer between 1 and 214' })
  }
  const page = Math.max(1, parseInt(req.query.page, 10) || 1)
  const limit = Math.min(Math.max(1, parseInt(req.query.limit, 10) || 50), 100)
  const offset = (page - 1) * limit
  try {
    const radicalInfo = db.prepare('SELECT id, character, name FROM radicals WHERE id = ?').get(radical)
    if (!radicalInfo) return res.status(404).json({ error: 'Radical not found' })
    const total = db.prepare('SELECT COUNT(*) AS cnt FROM characters WHERE radical = ?').get(radical).cnt
    const words = db.prepare(`
      SELECT id, simplified, traditional, pinyin, pinyin AS pinyin_display, definition, hsk_level, radical, stroke_count
      FROM characters WHERE radical = ?
      ORDER BY (CASE WHEN hsk_level > 0 THEN 1 ELSE 0 END) DESC, hsk_level ASC, LENGTH(simplified)
      LIMIT ? OFFSET ?
    `).all(radical, limit, offset)
    words.forEach(w => { w.pinyin = convertNumberedPinyin(w.pinyin) })
    res.json({ radical: radicalInfo, words, total, page, limit, totalPages: Math.ceil(total / limit) })
  } catch (err) {
    console.error('Radical detail query failed:', err.message)
    return res.status(500).json({ error: 'Failed to fetch radical details' })
  }
})

app.get('/api/word/:query', (req, res) => {
  const { query } = req.params
  const isNumeric = /^\d+$/.test(query)
  let item

  if (isNumeric) {
    const id = parseInt(query, 10)
    item = db.prepare(`
      SELECT id, simplified AS character, traditional, pinyin, pinyin AS pinyin_display, pinyin_flat,
             definition AS english_definition, hsk_level
      FROM cedict_words WHERE id = ?
    `).get(id)
    if (!item) {
      item = db.prepare(`
        SELECT id, simplified AS character, traditional, pinyin, pinyin AS pinyin_display, pinyin_flat,
               definition AS english_definition, hsk_level, radical, stroke_count
        FROM characters WHERE id = ?
      `).get(id)
    }
  } else {
    item = db.prepare(`
      SELECT id, simplified AS character, traditional, pinyin, pinyin AS pinyin_display, pinyin_flat,
             definition AS english_definition, hsk_level
      FROM cedict_words WHERE simplified = ?
    `).get(query)
    if (!item) {
      item = db.prepare(`
        SELECT id, simplified AS character, traditional, pinyin, pinyin AS pinyin_display, pinyin_flat,
               definition AS english_definition, hsk_level, radical, stroke_count
        FROM characters WHERE simplified = ?
      `).get(query)
    }
  }

  if (!item) return res.status(404).json({ error: 'Word not found' })
  item.pinyin = convertNumberedPinyin(item.pinyin)
  res.json({ ...item, examples: [] })
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
    SELECT w.id, w.simplified AS character, w.pinyin, w.definition AS english_definition, w.hsk_level
    FROM favorites f
    JOIN cedict_words w ON w.id = f.word_id
    WHERE f.user_id = ?
    ORDER BY f.created_at DESC
  `).all(req.user.id)
  res.json(rows)
})

const FLASHCARD_STATIC_ROUTES = {
  due: true,
}

app.get('/api/flashcards/due', requireAuth, (req, res) => {
  const rows = db.prepare(`
    SELECT fp.id AS progress_id, fp.ease_factor, fp.interval_days, fp.repetition, fp.next_review_date,
         fp.correct_count, fp.incorrect_count,
         w.id, w.simplified AS character, w.pinyin, w.definition AS english_definition, w.hsk_level
    FROM flashcard_progress fp
    JOIN cedict_words w ON w.id = fp.word_id
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

  let entry = db.prepare(`
    SELECT *, COALESCE(repetition, 0) as repetition FROM flashcard_progress
    WHERE user_id = ? AND word_id = ?
  `).get(req.user.id, wordId)
  if (!entry) {
    db.prepare('INSERT INTO flashcard_progress (user_id, word_id, next_review_date) VALUES (?, ?, date(\'now\'))').run(req.user.id, wordId)
    entry = db.prepare(`
      SELECT *, COALESCE(repetition, 0) as repetition FROM flashcard_progress
      WHERE user_id = ? AND word_id = ?
    `).get(req.user.id, wordId)
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

// Deck management
app.get('/api/decks', (req, res) => {
  try {
    const decks = db.prepare('SELECT id, name, created_at FROM decks ORDER BY created_at DESC').all()
    res.json(decks)
  } catch (err) {
    console.error('Failed to fetch decks:', err.message)
    res.status(500).json({ error: 'Failed to fetch decks' })
  }
})

app.post('/api/decks', (req, res) => {
  const name = (req.body.name || '').trim()
  if (!name) return res.status(400).json({ error: 'Name is required' })
  if (name.length > 200) return res.status(400).json({ error: 'Name too long' })
  try {
    const result = db.prepare('INSERT INTO decks (name) VALUES (?)').run(name)
    res.json({ id: result.lastInsertRowid, name })
  } catch (err) {
    console.error('Failed to create deck:', err.message)
    res.status(500).json({ error: 'Failed to create deck' })
  }
})

// Flashcard lifecycle
app.post('/api/flashcards', (req, res) => {
  const { deck_id, item_id, item_type } = req.body
  if (!deck_id || !item_id || !item_type) return res.status(400).json({ error: 'deck_id, item_id, and item_type required' })
  if (!['character', 'word'].includes(item_type)) return res.status(400).json({ error: 'item_type must be character or word' })
  try {
    db.prepare('INSERT INTO flashcards (deck_id, item_id, item_type) VALUES (?, ?, ?)').run(deck_id, item_id, item_type)
    res.json({ message: 'Flashcard added' })
  } catch (err) {
    console.error('Failed to add flashcard:', err.message)
    res.status(500).json({ error: 'Failed to add flashcard' })
  }
})

app.get('/api/decks/:id/review', (req, res) => {
  try {
    const flashcards = db.prepare(`
      SELECT id, deck_id, item_id, item_type, box_level, next_review, created_at
      FROM flashcards WHERE deck_id = ? AND next_review <= CURRENT_TIMESTAMP
      ORDER BY next_review ASC
    `).all(req.params.id)

    const enriched = flashcards.map(fc => {
      const table = fc.item_type === 'character' ? 'characters' : 'cedict_words'
      const row = db.prepare(`SELECT simplified, pinyin, definition FROM ${table} WHERE id = ?`).get(fc.item_id)
      return { ...fc, ...(row || {}) }
    })

    res.json(enriched)
  } catch (err) {
    console.error('Failed to fetch review cards:', err.message)
    res.status(500).json({ error: 'Failed to fetch review cards' })
  }
})

app.post('/api/flashcards/:id/grade', (req, res) => {
  const { score } = req.body
  if (!score || !['correct', 'incorrect'].includes(score)) {
    return res.status(400).json({ error: 'score must be "correct" or "incorrect"' })
  }
  try {
    const card = db.prepare('SELECT id, box_level FROM flashcards WHERE id = ?').get(req.params.id)
    if (!card) return res.status(404).json({ error: 'Flashcard not found' })

    let newBox
    let interval
    if (score === 'incorrect') {
      newBox = 1
      interval = '+1 day'
    } else {
      newBox = Math.min(card.box_level + 1, 5)
      const gaps = { 2: '+3 days', 3: '+7 days', 4: '+14 days' }
      interval = gaps[newBox] || '+30 days'
    }

    db.prepare('UPDATE flashcards SET box_level = ?, next_review = datetime(\'now\', ?) WHERE id = ?').run(newBox, interval, req.params.id)
    res.json({ message: 'Graded', box_level: newBox })
  } catch (err) {
    console.error('Failed to grade flashcard:', err.message)
    res.status(500).json({ error: 'Failed to grade flashcard' })
  }
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

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err)
  process.exit(1)
})

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason)
})

const server = app.listen(PORT, () => {
  console.log(`Zihai backend running on http://localhost:${PORT}`)
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`)
})

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\nPort ${PORT} is already in use.`)
    console.error(`Stop the other backend process or run: kill $(lsof -t -i:${PORT})`)
    process.exit(1)
  } else {
    console.error('Server error:', err)
    process.exit(1)
  }
})
