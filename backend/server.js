import express from 'express'
import Database from 'better-sqlite3'
import cors from 'cors'
import helmet from 'helmet'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import cookieParser from 'cookie-parser'
import compression from 'compression'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import crypto from 'crypto'
import os from 'os'
import fs from 'fs'
import { EdgeTTS } from 'node-edge-tts'
import rateLimit from 'express-rate-limit'
import nodemailer from 'nodemailer'
import { normalizePinyin, searchNormalizePinyin, splitPinyin, generatePinyinAlternatives } from './pinyinUtils.js'
import { convertNumberedPinyin } from './utils/pinyin.js'
import RADICALS from './radicals.js'
import { fsrs, Rating, createEmptyCard } from 'ts-fsrs'

const f = fsrs()

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

// If the user specified a persistent volume DB_PATH, and it doesn't exist yet,
// we must copy the pre-populated zihai.db from the repository to the new location.
const embeddedDbPath = path.join(__dirname, 'zihai.db')
if (DB_PATH !== embeddedDbPath) {
  if (!fs.existsSync(DB_PATH) || fs.statSync(DB_PATH).size < 1000) {
    console.log(`Initializing persistent database at ${DB_PATH} from ${embeddedDbPath}`)
    
    // Ensure the target directory exists
    const targetDir = path.dirname(DB_PATH)
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true })
    }
    
    // Copy the populated database over
    fs.copyFileSync(embeddedDbPath, DB_PATH)
  }
}

const db = new Database(DB_PATH)
db.pragma('journal_mode = WAL')

const TTS_CACHE_DIR = path.join(path.dirname(DB_PATH), 'tts_cache')
if (!fs.existsSync(TTS_CACHE_DIR)) {
  fs.mkdirSync(TTS_CACHE_DIR, { recursive: true })
}
db.pragma('synchronous = NORMAL')
db.pragma('cache_size = -16000')
db.pragma('temp_store = MEMORY')
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
app.use(compression())

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
      /^chrome-extension:\/\/[a-z]{32}$/
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

function recursiveFormatPinyin(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      obj[i] = recursiveFormatPinyin(obj[i]);
    }
    return obj;
  }
  for (const key of Object.keys(obj)) {
    if (key === 'pinyin' && typeof obj[key] === 'string') {
      obj[key] = convertNumberedPinyin(obj[key]);
    } else if (typeof obj[key] === 'object') {
      obj[key] = recursiveFormatPinyin(obj[key]);
    }
  }
  return obj;
}

app.use('/api/', (req, res, next) => {
  const originalJson = res.json;
  res.json = function (body) {
    if (body) {
      body = recursiveFormatPinyin(body);
    }
    return originalJson.call(this, body);
  };
  
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


`)

// FSRS Migration
try {
  const tableInfo = db.prepare('PRAGMA table_info(flashcard_progress)').all()
  const hasEaseFactor = tableInfo.some(col => col.name === 'ease_factor')
  
  if (hasEaseFactor) {
    console.log('Migrating flashcard_progress to FSRS schema...')
    db.transaction(() => {
      // Create a temporary table with the old data
      db.exec(`
        CREATE TABLE flashcard_progress_backup AS SELECT * FROM flashcard_progress;
        DROP TABLE flashcard_progress;
      `)
      
      // Re-run the table creation from schema above
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
      
      // Copy data back, mapping old 'repetition' to new FSRS 'reps'
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
  } catch {
    return res.status(401).json({ error: 'Invalid token' })
  }
  next()
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
    WHERE user_id = ? AND next_review_date <= datetime('now')
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
    // Combine dates from review_log and search_history for streak calculation
    const historyDates = db.prepare(`
      SELECT DISTINCT date(activity_date) as date FROM (
        SELECT searched_at as activity_date FROM search_history WHERE user_id = ?
        UNION
        SELECT review_date as activity_date FROM review_log WHERE user_id = ?
      ) ORDER BY date DESC
    `).all(req.user.id, req.user.id).map(r => r.date)

    let currentStreak = 0
    let longestStreak = 0
    if (historyDates.length > 0) {
      let currentRun = 1
      longestStreak = 1
      const todayStr = new Date().toISOString().slice(0, 10)
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = yesterday.toISOString().slice(0, 10)

      if (historyDates[0] === todayStr || historyDates[0] === yesterdayStr) {
        currentStreak = 1
        let lastDate = new Date(historyDates[0])
        for (let i = 1; i < historyDates.length; i++) {
          const currentDate = new Date(historyDates[i])
          const diffDays = Math.round((lastDate - currentDate) / (1000 * 60 * 60 * 24))
          if (diffDays === 1) {
            currentStreak++
            currentRun++
            lastDate = currentDate
            longestStreak = Math.max(longestStreak, currentRun)
          } else if (diffDays > 1) {
            currentRun = 1
            lastDate = currentDate
            // don't break, continue calculating longest streak
          }
        }
      } else {
        // Find longest streak overall
        let lastDate = new Date(historyDates[0])
        for (let i = 1; i < historyDates.length; i++) {
          const currentDate = new Date(historyDates[i])
          const diffDays = Math.round((lastDate - currentDate) / (1000 * 60 * 60 * 24))
          if (diffDays === 1) {
            currentRun++
            longestStreak = Math.max(longestStreak, currentRun)
            lastDate = currentDate
          } else if (diffDays > 1) {
            currentRun = 1
            lastDate = currentDate
          }
        }
      }
    }

    // Heatmap data: counts per day over last 365 days
    const heatmap = db.prepare(`
      SELECT date(review_date) as date, COUNT(*) as count
      FROM review_log
      WHERE user_id = ? AND review_date >= date('now', '-365 days')
      GROUP BY date(review_date)
      ORDER BY date(review_date) ASC
    `).all(req.user.id)

    const totalCards = db.prepare('SELECT COUNT(*) as count FROM flashcard_progress WHERE user_id = ?').get(req.user.id).count
    const newCards = db.prepare('SELECT COUNT(*) as count FROM flashcard_progress WHERE user_id = ? AND reps = 0').get(req.user.id).count
    const learningCards = db.prepare('SELECT COUNT(*) as count FROM flashcard_progress WHERE user_id = ? AND reps > 0 AND reps < 5').get(req.user.id).count
    const masteredCards = db.prepare('SELECT COUNT(*) as count FROM flashcard_progress WHERE user_id = ? AND reps >= 5').get(req.user.id).count

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

    // Compute Badges
    const badges = []
    if (longestStreak >= 3) badges.push({ id: 'streak_3', name: '3-Day Streak', icon: '🔥', color: 'orange-500' })
    if (longestStreak >= 7) badges.push({ id: 'streak_7', name: '7-Day Streak', icon: '🔥', color: 'rose-500' })
    if (longestStreak >= 30) badges.push({ id: 'streak_30', name: '30-Day Streak', icon: '👑', color: 'amber-500' })
    
    if (totalCards >= 50) badges.push({ id: 'vocab_50', name: 'Vocab Novice', icon: '🌱', color: 'emerald-500' })
    if (totalCards >= 500) badges.push({ id: 'vocab_500', name: 'Vocab Master', icon: '🌳', color: 'emerald-600' })
    
    if (masteredCards >= 100) badges.push({ id: 'master_100', name: 'Memory Champion', icon: '🧠', color: 'indigo-500' })

    res.json({
      streak: currentStreak,
      longestStreak,
      heatmap,
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
    WHERE user_id = ? AND next_review_date <= datetime('now')
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

function resolveRowsBatch(rows) {
  if (!rows || rows.length === 0) return rows

  const targets = new Set()
  const regex = /^see\s+([^\x00-\x7F]+)(?:\|[^\x00-\x7F]+)?(?:\[[^\]]*\])?$/

  const arr = Array.isArray(rows) ? rows : [rows]

  arr.forEach(row => {
    if (!row) return
    if (row.definition) {
      const match = row.definition.trim().match(regex)
      if (match) targets.add(match[1])
    }
    if (row.english_definition) {
      const match = row.english_definition.trim().match(regex)
      if (match) targets.add(match[1])
    }
  })

  if (targets.size === 0) return rows

  const targetsArr = Array.from(targets)
  const chunkSize = 200
  const defMap = new Map()

  for (let i = 0; i < targetsArr.length; i += chunkSize) {
    const chunk = targetsArr.slice(i, i + chunkSize)
    const placeholders = chunk.map(() => '?').join(',')

    const wordDefs = db.prepare(`SELECT simplified, traditional, definition FROM cedict_words WHERE simplified IN (${placeholders}) OR traditional IN (${placeholders})`).all(...chunk, ...chunk)
    const charDefs = db.prepare(`SELECT simplified, traditional, definition FROM characters WHERE simplified IN (${placeholders}) OR traditional IN (${placeholders})`).all(...chunk, ...chunk)

    for (const row of [...wordDefs, ...charDefs]) {
      if (row.definition && !row.definition.startsWith('see ')) {
        if (row.simplified) defMap.set(row.simplified, row.definition)
        if (row.traditional) defMap.set(row.traditional, row.definition)
      }
    }
  }

  arr.forEach(row => {
    if (!row) return
    if (row.definition) {
      const match = row.definition.trim().match(regex)
      if (match && defMap.has(match[1])) row.definition = defMap.get(match[1])
    }
    if (row.english_definition) {
      const match = row.english_definition.trim().match(regex)
      if (match && defMap.has(match[1])) row.english_definition = defMap.get(match[1])
    }
  })

  return rows
}

app.get('/api/ping', (req, res) => {
  res.json({ status: 'ok' })
})

const analyzeGetWord = db.prepare(`
  SELECT id, simplified, pinyin, definition, hsk_level, 'word' as type
  FROM cedict_words 
  WHERE simplified = ? OR traditional = ? 
  ORDER BY CASE WHEN hsk_level > 0 THEN 0 ELSE 1 END ASC, hsk_level ASC 
  LIMIT 1
`);

const analyzeGetChar = db.prepare(`
  SELECT id, simplified, pinyin, definition, hsk_level, 'char' as type
  FROM characters 
  WHERE simplified = ? OR traditional = ? 
  ORDER BY CASE WHEN hsk_level > 0 THEN 0 ELSE 1 END ASC, hsk_level ASC 
  LIMIT 1
`);

app.post('/api/analyze', apiLimiter, (req, res) => {
  const text = req.body.text || '';
  if (typeof text !== 'string') return res.status(400).json({ error: 'Text must be a string' });
  if (text.length > 2000) return res.status(400).json({ error: 'Text too long (max 2000 characters)' });
  if (!text.trim()) return res.json({ tokens: [] });

  try {
    const tokens = [];
    const maxLen = 6;
    let i = 0;

    while (i < text.length) {
      let matched = false;
      for (let len = maxLen; len > 0; len--) {
        if (i + len > text.length) continue;
        const substr = text.substring(i, i + len);
        
        // Skip DB lookup for multi-char non-Chinese strings (speed optimization)
        if (len > 1 && !/[\u4e00-\u9fa5]/.test(substr)) continue;

        let row = analyzeGetWord.get(substr, substr);
        if (!row && len === 1) {
          row = analyzeGetChar.get(substr, substr);
        }

        if (row) {
          tokens.push({
            text: substr,
            isChinese: true,
            id: row.id,
            type: row.type,
            pinyin: convertNumberedPinyin(row.type === 'char' ? row.pinyin.split(/[ ,/]+/)[0] : row.pinyin) || row.pinyin,
            definition: resolveDefinition(row.definition),
            hsk_level: row.hsk_level
          });
          i += len;
          matched = true;
          break;
        }
      }

      if (!matched) {
        const char = text[i];
        const isChinese = /[\u4e00-\u9fa5]/.test(char);
        
        // Combine consecutive non-Chinese characters into single tokens
        if (!isChinese && tokens.length > 0 && !tokens[tokens.length - 1].isChinese) {
          tokens[tokens.length - 1].text += char;
        } else {
          tokens.push({
            text: char,
            isChinese,
            id: null,
            pinyin: null,
            definition: null,
            hsk_level: null
          });
        }
        i++;
      }
    }
    
    res.json({ tokens });
  } catch (err) {
    console.error('Analyzer error:', err);
    res.status(500).json({ error: 'Failed to analyze text' });
  }
});

app.get('/api/tts', async (req, res) => {
  let text = (req.query.text || '').trim()
  let toneParam = parseInt(req.query.tone, 10)
  if (isNaN(toneParam)) toneParam = null

  if (!text) return res.status(400).json({ error: 'Text is required' })
  if (text.length > 200) return res.status(400).json({ error: 'Text too long' })

  // If text is pinyin, try to find a representative character
  if (/^[a-zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜüăĕĭŏŭ1-5\s]+$/i.test(text)) {
    const toneMarks = {
      'ā': 1, 'á': 2, 'ǎ': 3, 'à': 4,
      'ē': 1, 'é': 2, 'ě': 3, 'è': 4,
      'ī': 1, 'í': 2, 'ǐ': 3, 'ì': 4,
      'ō': 1, 'ó': 2, 'ǒ': 3, 'ò': 4,
      'ū': 1, 'ú': 2, 'ǔ': 3, 'ù': 4,
      'ǖ': 1, 'ǘ': 2, 'ǚ': 3, 'ǜ': 4,
      'ă': 3, 'ĕ': 3, 'ĭ': 3, 'ŏ': 3, 'ŭ': 3,
    }
    const vowelMap = {
      'ā': 'a', 'á': 'a', 'ǎ': 'a', 'à': 'a', 'ă': 'a',
      'ē': 'e', 'é': 'e', 'ě': 'e', 'è': 'e', 'ĕ': 'e',
      'ī': 'i', 'í': 'i', 'ǐ': 'i', 'ì': 'i', 'ĭ': 'i',
      'ō': 'o', 'ó': 'o', 'ǒ': 'o', 'ò': 'o', 'ŏ': 'o',
      'ū': 'u', 'ú': 'u', 'ǔ': 'u', 'ù': 'u', 'ŭ': 'u',
      'ǖ': 'v', 'ǘ': 'v', 'ǚ': 'v', 'ǜ': 'v',
    }

    let tone = toneParam
    let clean = text.toLowerCase()

    if (tone === null) {
      for (const [mark, t] of Object.entries(toneMarks)) {
        if (clean.includes(mark)) {
          tone = t
          break
        }
      }
      const matchNum = clean.match(/(\d)$/)
      if (matchNum) {
        tone = parseInt(matchNum[1], 10)
        clean = clean.replace(/\d$/, '')
      }
    } else {
      // If tone is provided, strip any existing marks/numbers from clean
      clean = clean.replace(/\d$/, '')
    }

    // Fully strip tone marks for the lookup
    for (const [mark, replacement] of Object.entries(vowelMap)) {
      clean = clean.replaceAll(mark, replacement)
    }

    if (tone !== null) {
      const numbered = clean + tone
      const dbNumbered = numbered.replace('v', 'u:')

      // Find a character that has this exact pinyin.
      // We prioritize characters where this is the ONLY pronunciation to force clear tones.
      let charRow = db.prepare(`
        SELECT simplified FROM characters
        WHERE (' ' || lower(replace(pinyin, 'u:', 'v')) || ' ') LIKE ?
        ORDER BY
          (CASE WHEN lower(replace(pinyin, 'u:', 'v')) = ? OR lower(replace(pinyin, 'u:', 'v')) = (? || ' ' || ?) THEN 0 ELSE 1 END) ASC,
          (CASE WHEN hsk_level > 0 THEN 0 ELSE 1 END) ASC,
          hsk_level ASC,
          length(pinyin) ASC
        LIMIT 1
      `).get(`% ${numbered.toLowerCase()} %`, numbered.toLowerCase(), numbered.toLowerCase(), numbered.toLowerCase())

      if (charRow) {
        text = charRow.simplified
      }
    }
  }

  const textHash = crypto.createHash('md5').update(text).digest('hex')
  const cacheFile = path.join(TTS_CACHE_DIR, `${textHash}.mp3`)

  if (fs.existsSync(cacheFile)) {
    res.set('Content-Type', 'audio/mpeg')
    res.set('Cache-Control', 'public, max-age=31536000') // Cache for 1 year
    const stream = fs.createReadStream(cacheFile)
    return stream.pipe(res)
  }

  // Use Edge TTS (Neural Xiaoxiao) for much more natural sound
  const tts = new EdgeTTS({
    voice: 'zh-CN-XiaoxiaoNeural',
    lang: 'zh-CN',
    outputFormat: 'audio-24khz-96kbitrate-mono-mp3',
    rate: '-10%' // Slightly slower for better clarity of tones
  })

  const tmpFile = path.join(TTS_CACHE_DIR, `zihai-tts-${Date.now()}-${Math.random().toString(36).slice(2)}.mp3`)

  try {
    await tts.ttsPromise(text, tmpFile)

    // Atomically rename to cache file
    fs.renameSync(tmpFile, cacheFile)

    res.set('Content-Type', 'audio/mpeg')
    res.set('Cache-Control', 'public, max-age=31536000') // Cache for 1 year
    const stream = fs.createReadStream(cacheFile)
    stream.pipe(res)
  } catch (edgeErr) {
    console.error('Edge TTS Error, falling back to Google:', edgeErr.message)
    // Clean up temporary file if Edge TTS failed midway
    if (fs.existsSync(tmpFile)) {
      fs.unlinkSync(tmpFile)
    }

    // Fallback to Google Translate TTS
    try {
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=zh-CN&total=1&idx=0&textlen=${text.length}&client=tw-ob&prev=input`
      const response = await fetch(url, {
        headers: {
          'Referer': 'http://translate.google.com/',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        },
      })
      if (!response.ok) throw new Error(`Google TTS status: ${response.status}`)
      const buffer = await response.arrayBuffer()

      // Save Google TTS to cache
      fs.writeFileSync(tmpFile, Buffer.from(buffer))
      fs.renameSync(tmpFile, cacheFile)

      res.set('Content-Type', 'audio/mpeg')
      res.set('Cache-Control', 'public, max-age=31536000') // Cache for 1 year
      const stream = fs.createReadStream(cacheFile)
      stream.pipe(res)
    } catch (googleErr) {
      console.error('All TTS services failed:', googleErr.message)
      if (fs.existsSync(tmpFile)) {
        fs.unlinkSync(tmpFile)
      }
      res.status(502).json({ error: 'All TTS services failed' })
    }
  }
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
            WHEN (instr(' ' || replace(replace(replace(replace(replace(pinyin, '1', ''), '2', ''), '3', ''), '4', ''), '5', '') || ' ', ' ' || ? || ' ') > 0) THEN 3
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
            WHEN (instr(' ' || replace(replace(replace(replace(replace(pinyin, '1', ''), '2', ''), '3', ''), '4', ''), '5', '') || ' ', ' ' || ? || ' ') > 0) THEN 3
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

  rows.forEach(r => {
    r.pinyin = convertNumberedPinyin(r.pinyin)
  })
  resolveRowsBatch(rows)
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
    words.forEach(w => {
      w.pinyin = convertNumberedPinyin(w.pinyin)
    })
    resolveRowsBatch(words)
    res.json({ radical: radicalInfo, words, total, page, limit, totalPages: Math.ceil(total / limit) })
  } catch (err) {
    console.error('Radical detail query failed:', err.message)
    return res.status(500).json({ error: 'Failed to fetch radical details' })
  }
})

app.get('/api/hsk/:level', (req, res) => {
  const level = parseInt(req.params.level, 10)
  if (isNaN(level) || level < 1 || level > 6) {
    return res.status(400).json({ error: 'Invalid HSK level' })
  }
  const page = Math.max(1, parseInt(req.query.page, 10) || 1)
  const limit = Math.min(Math.max(1, parseInt(req.query.limit, 10) || 50), 100)
  const offset = (page - 1) * limit
  try {
    const totalRow = db.prepare(`
      SELECT (SELECT COUNT(*) FROM characters WHERE hsk_level = ?) +
             (SELECT COUNT(*) FROM cedict_words WHERE hsk_level = ?) AS cnt
    `).get(level, level)
    const total = totalRow ? totalRow.cnt : 0

    const words = db.prepare(`
      SELECT id, character, traditional, pinyin, pinyin_display, english_definition, hsk_level, is_word
      FROM (
        SELECT id, simplified AS character, traditional, pinyin, pinyin AS pinyin_display, definition AS english_definition, hsk_level, 1 as is_word
        FROM cedict_words WHERE hsk_level = ?
        UNION ALL
        SELECT id, simplified AS character, traditional, pinyin, pinyin AS pinyin_display, definition AS english_definition, hsk_level, 0 as is_word
        FROM characters WHERE hsk_level = ?
      )
      ORDER BY length(character) ASC, character ASC
      LIMIT ? OFFSET ?
    `).all(level, level, limit, offset)

    words.forEach(w => {
      w.pinyin = convertNumberedPinyin(w.pinyin)
    })
    resolveRowsBatch(words)

    res.json({ words, total, page, limit, totalPages: Math.ceil(total / limit) })
  } catch (err) {
    console.error('HSK list query failed:', err.message)
    return res.status(500).json({ error: 'Failed to fetch HSK vocabulary' })
  }
})

app.get('/api/word/:query', (req, res) => {
  const { query } = req.params
  const isNumeric = /^\d+$/.test(query)
  let item

  try {
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
    item = resolveRowsBatch(item)
    item.pinyin = convertNumberedPinyin(item.pinyin)
    res.json({ ...item, examples: [] })
  } catch (error) {
    console.error('Word fetch error:', error.message)
    res.status(500).json({ error: 'Database error' })
  }
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
  resolveRowsBatch(rows)
  res.json(rows)
})

// Custom lists endpoints
app.get('/api/lists', requireAuth, (req, res) => {
  const rows = db.prepare(`
    SELECT cl.id, cl.name, cl.description, cl.created_at, COUNT(clw.word_id) as word_count
    FROM custom_lists cl
    LEFT JOIN custom_list_words clw ON clw.list_id = cl.id
    WHERE cl.user_id = ?
    GROUP BY cl.id
    ORDER BY cl.name ASC
  `).all(req.user.id)
  res.json(rows)
})

app.post('/api/lists', requireAuth, (req, res) => {
  const name = sanitizeString(req.body.name || '')
  const description = sanitizeString(req.body.description || '')
  if (!name) return res.status(400).json({ error: 'List name required' })
  const result = db.prepare('INSERT INTO custom_lists (user_id, name, description) VALUES (?, ?, ?)').run(req.user.id, name, description)
  res.json({ id: result.lastInsertRowid, name, description })
})

app.delete('/api/lists/:id', requireAuth, (req, res) => {
  db.prepare('DELETE FROM custom_lists WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id)
  res.json({ message: 'List deleted' })
})

app.get('/api/lists/:id/words', requireAuth, (req, res) => {
  const list = db.prepare('SELECT id FROM custom_lists WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id)
  if (!list) return res.status(404).json({ error: 'List not found' })
  const rows = db.prepare(`
    SELECT w.id, w.simplified AS character, w.pinyin, w.definition AS english_definition, w.hsk_level
    FROM custom_list_words clw
    JOIN cedict_words w ON w.id = clw.word_id
    WHERE clw.list_id = ?
    ORDER BY clw.added_at DESC
  `).all(req.params.id)
  resolveRowsBatch(rows)
  res.json(rows)
})

app.post('/api/lists/:id/words', requireAuth, (req, res) => {
  const wordId = parseInt(req.body.wordId, 10)
  if (isNaN(wordId)) return res.status(400).json({ error: 'Invalid word ID' })
  const list = db.prepare('SELECT id FROM custom_lists WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id)
  if (!list) return res.status(404).json({ error: 'List not found' })
  db.prepare('INSERT OR IGNORE INTO custom_list_words (list_id, word_id) VALUES (?, ?)').run(req.params.id, wordId)
  res.json({ message: 'Word added to list' })
})

app.delete('/api/lists/:id/words/:wordId', requireAuth, (req, res) => {
  const list = db.prepare('SELECT id FROM custom_lists WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id)
  if (!list) return res.status(404).json({ error: 'List not found' })
  db.prepare('DELETE FROM custom_list_words WHERE list_id = ? AND word_id = ?').run(req.params.id, req.params.wordId)
  res.json({ message: 'Word removed from list' })
})

app.get('/api/words/:wordId/lists', requireAuth, (req, res) => {
  const rows = db.prepare(`
    SELECT list_id FROM custom_list_words clw
    JOIN custom_lists cl ON cl.id = clw.list_id
    WHERE cl.user_id = ? AND clw.word_id = ?
  `).all(req.user.id, req.params.wordId)
  res.json(rows.map(r => r.list_id))
})

// Stories endpoints
app.get('/api/stories', requireAuth, (req, res) => {
  const rows = db.prepare('SELECT id, title, hsk_level FROM reading_stories ORDER BY hsk_level ASC, id ASC').all()
  res.json(rows)
})

app.get('/api/stories/:id', requireAuth, (req, res) => {
  const story = db.prepare('SELECT * FROM reading_stories WHERE id = ?').get(req.params.id)
  if (!story) return res.status(404).json({ error: 'Story not found' })
  res.json(story)
})

// Flashcard Import/Export
app.post('/api/flashcards/import', requireAuth, (req, res) => {
  const { text } = req.body
  if (!text) return res.status(400).json({ error: 'No text provided' })

  // Simple parser: assumes one character/word per line, ignoring everything else
  const lines = text.split('\n').map(l => l.trim()).filter(l => l)
  let imported = 0
  
  db.transaction(() => {
    for (const line of lines) {
      // Just extract the first sequence of Chinese characters
      const match = line.match(/([\u4e00-\u9fff]+)/)
      if (match) {
        const char = match[1]
        // Find in cedict
        const wordRow = db.prepare('SELECT id FROM cedict_words WHERE simplified = ? OR traditional = ? LIMIT 1').get(char, char)
        if (wordRow) {
          try {
            db.prepare(`
              INSERT INTO flashcard_progress (user_id, word_id, stability, difficulty, elapsed_days, scheduled_days, reps, lapses, state, next_review_date)
              VALUES (?, ?, 0, 0, 0, 0, 0, 0, 0, datetime('now'))
            `).run(req.user.id, wordRow.id)
            imported++
          } catch (e) {
            console.error('Import error for word_id:', wordRow.id, e.message)
            // Probably unique constraint (already in flashcards)
          }
        }
      }
    }
  })()

  res.json({ message: `Successfully imported ${imported} words into your flashcards.` })
})

app.get('/api/flashcards/export', requireAuth, (req, res) => {
  const words = db.prepare(`
    SELECT w.simplified, w.pinyin, w.definition
    FROM flashcard_progress fp
    JOIN cedict_words w ON w.id = fp.word_id
    WHERE fp.user_id = ?
  `).all(req.user.id)

  let csv = 'Character,Pinyin,Definition\n'
  words.forEach(w => {
    // Escape quotes in definition
    const def = w.definition.replace(/"/g, '""')
    csv += `"${w.simplified}","${w.pinyin}","${def}"\n`
  })

  res.setHeader('Content-Type', 'text/csv')
  res.setHeader('Content-Disposition', 'attachment; filename=zihai_flashcards.csv')
  res.send(csv)
})

// Quiz endpoints
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() })
})

app.get('/api/quiz/generate', requireAuth, (req, res) => {
  try {
    let words = []
    const hskLevel = parseInt(req.query.hsk, 10)

    if (!isNaN(hskLevel) && hskLevel > 0) {
      words = db.prepare(`
        SELECT id, simplified as character, pinyin, definition
        FROM cedict_words
        WHERE hsk_level = ?
        ORDER BY RANDOM() LIMIT 10
      `).all(hskLevel)
    } else {
      // Fetch up to 10 words (mix of due flashcards and random words)
      words = db.prepare(`
        SELECT w.id, w.simplified as character, w.pinyin, w.definition
        FROM flashcard_progress fp
        JOIN cedict_words w ON w.id = fp.word_id
        WHERE fp.user_id = ? AND fp.next_review_date <= datetime('now')
        ORDER BY RANDOM() LIMIT 10
      `).all(req.user.id)

      if (words.length < 10) {
        const extra = db.prepare(`
          SELECT id, simplified as character, pinyin, definition
          FROM cedict_words
          WHERE hsk_level > 0 AND id NOT IN (${words.map(w => w.id).join(',') || '0'})
          ORDER BY RANDOM() LIMIT ?
        `).all(10 - words.length)
        words = words.concat(extra)
      }
    }

    // For each word, get 3 distractors
    const quiz = words.map(word => {
      const distractors = db.prepare(`
        SELECT definition FROM cedict_words
        WHERE id != ? AND hsk_level > 0
        ORDER BY RANDOM() LIMIT 3
      `).all(word.id).map(d => d.definition)

      const options = [word.definition, ...distractors]
      // Shuffle options
      options.sort(() => Math.random() - 0.5)

      return {
        id: word.id,
        character: word.character,
        pinyin: convertNumberedPinyin(word.pinyin),
        options,
        answer: word.definition
      }
    })

    res.json(quiz)
  } catch (err) {
    console.error('Failed to generate quiz:', err)
    res.status(500).json({ error: 'Failed to generate quiz' })
  }
})

const FLASHCARD_STATIC_ROUTES = {
  due: true,
}

app.get('/api/flashcards/due', requireAuth, (req, res) => {
  const rows = db.prepare(`
    SELECT fp.id AS progress_id, fp.stability, fp.difficulty, fp.elapsed_days, fp.scheduled_days, fp.reps, fp.lapses, fp.state, fp.next_review_date,
         fp.correct_count, fp.incorrect_count,
         w.id, w.simplified AS character, w.pinyin, w.definition AS english_definition, w.hsk_level
    FROM flashcard_progress fp
    JOIN cedict_words w ON w.id = fp.word_id
    WHERE fp.user_id = ? AND fp.next_review_date <= datetime('now')
    ORDER BY fp.next_review_date ASC
  `).all(req.user.id)
  resolveRowsBatch(rows)
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
    VALUES (?, ?, datetime('now'), datetime('now'))
  `).run(req.user.id, req.params.wordId)
  res.json({ message: 'Initialized' })
})

app.post('/api/flashcards/:wordId/add', requireAuth, (req, res) => {
  if (FLASHCARD_STATIC_ROUTES[req.params.wordId]) {
    return res.status(400).json({ error: 'Invalid word ID' })
  }
  db.prepare(`
    INSERT OR IGNORE INTO flashcard_progress (user_id, word_id, added_at, next_review_date)
    VALUES (?, ?, datetime('now'), datetime('now'))
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
    SELECT * FROM flashcard_progress
    WHERE user_id = ? AND word_id = ?
  `).get(req.user.id, wordId)
  
  if (!entry) {
    db.prepare(`
      INSERT INTO flashcard_progress (user_id, word_id, next_review_date) 
      VALUES (?, ?, datetime('now'))
    `).run(req.user.id, wordId)
    entry = db.prepare(`
      SELECT * FROM flashcard_progress
      WHERE user_id = ? AND word_id = ?
    `).get(req.user.id, wordId)
  }

  // Map 0-5 quality to FSRS 1-4 rating
  let rating = Rating.Again
  if (quality === 3) rating = Rating.Hard
  else if (quality === 4) rating = Rating.Good
  else if (quality === 5) rating = Rating.Easy

  const card = {
    due: new Date(entry.next_review_date + 'Z'),
    stability: entry.stability || 0,
    difficulty: entry.difficulty || 0,
    elapsed_days: entry.elapsed_days || 0,
    scheduled_days: entry.scheduled_days || 0,
    reps: entry.reps || 0,
    lapses: entry.lapses || 0,
    state: entry.state || 0,
    last_review: entry.last_review_date ? new Date(entry.last_review_date + 'Z') : undefined
  }

  // Handle empty cards properly for FSRS
  const currentCard = card.state === 0 ? createEmptyCard() : card;

  const now = new Date()
  const scheduling_cards = f.repeat(currentCard, now)
  const next_card = scheduling_cards[rating].card

  const correct_count = entry.correct_count + (quality >= 3 ? 1 : 0)
  const incorrect_count = entry.incorrect_count + (quality < 3 ? 1 : 0)

  // SQLite doesn't have native Date, so we format due date as YYYY-MM-DD HH:MM:SS
  const next_due_iso = next_card.due.toISOString().slice(0, 19).replace('T', ' ')
  const now_iso = now.toISOString().slice(0, 19).replace('T', ' ')

  db.prepare(`
    UPDATE flashcard_progress
    SET stability = ?, difficulty = ?, elapsed_days = ?, scheduled_days = ?,
        reps = ?, lapses = ?, state = ?, last_review_date = ?, next_review_date = ?,
        correct_count = ?, incorrect_count = ?
    WHERE user_id = ? AND word_id = ?
  `).run(
    next_card.stability, next_card.difficulty, next_card.elapsed_days, next_card.scheduled_days,
    next_card.reps, next_card.lapses, next_card.state, now_iso, next_due_iso,
    correct_count, incorrect_count, req.user.id, wordId
  )

  db.prepare(`
    INSERT INTO review_log (user_id, word_id, correct, review_date)
    VALUES (?, ?, ?, datetime('now'))
  `).run(req.user.id, wordId, quality >= 3 ? 1 : 0)

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



// Achievements Endpoint
app.get('/api/achievements', requireAuth, (req, res) => {
  try {
    const userId = req.user.id;

    // Get current stats
    const firstLogin = 1; // If they are hitting this, they are logged in
    const favoritesCount = db.prepare('SELECT COUNT(*) as c FROM favorites WHERE user_id = ?').get(userId).c;
    const reviewCount = db.prepare('SELECT COUNT(*) as c FROM review_log WHERE user_id = ?').get(userId).c;
    const searchCount = db.prepare('SELECT COUNT(*) as c FROM search_history WHERE user_id = ?').get(userId).c;

    const statsMap = {
      'first_login': firstLogin,
      'favorites_count': favoritesCount,
      'review_count': reviewCount,
      'search_count': searchCount
    };

    const achievements = db.prepare('SELECT * FROM achievements').all();
    const userUnlocked = db.prepare('SELECT achievement_id, unlocked_at FROM user_achievements WHERE user_id = ?').all(userId);
    const unlockedSet = new Set(userUnlocked.map(a => a.achievement_id));

    // Calculate progress and auto-unlock
    const insertUnlock = db.prepare('INSERT OR IGNORE INTO user_achievements (user_id, achievement_id) VALUES (?, ?)');
    
    const results = achievements.map(ach => {
      let isUnlocked = unlockedSet.has(ach.id);
      let currentProgress = statsMap[ach.requirement_type] || 0;
      
      // Auto-unlock logic
      if (!isUnlocked && currentProgress >= ach.requirement_value) {
        insertUnlock.run(userId, ach.id);
        isUnlocked = true;
      }

      return {
        id: ach.id,
        name: ach.name,
        description: ach.description,
        icon: ach.icon,
        requirement_type: ach.requirement_type,
        requirement_value: ach.requirement_value,
        current_progress: Math.min(currentProgress, ach.requirement_value),
        is_unlocked: isUnlocked,
        unlocked_at: isUnlocked ? (userUnlocked.find(u => u.achievement_id === ach.id)?.unlocked_at || new Date().toISOString()) : null
      };
    });

    res.json(results);
  } catch (err) {
    console.error('Failed to fetch achievements:', err.message);
    res.status(500).json({ error: 'Failed to fetch achievements' });
  }
})

app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ error: 'Internal server error' })
})

// --------------------------------------------------------
// Production Frontend Serving
// --------------------------------------------------------
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '../dist')
  app.use(express.static(distPath))

  app.use((req, res) => {
    res.sendFile(path.join(distPath, 'index.html'))
  })
}

// --------------------------------------------------------
// Graceful Shutdown
// --------------------------------------------------------
function shutdown() {
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

if (process.env.NODE_ENV !== 'test') {
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
}

export { app, db }
