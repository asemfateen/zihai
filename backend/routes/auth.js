import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import nodemailer from 'nodemailer'
import { db } from '../db.js'
import { requireAuth, cookieOptions, JWT_SECRET } from '../middleware/auth.js'
import { authLimiter } from '../middleware/rateLimiter.js'
import { sanitizeEmail, sanitizeString } from '../utils/textUtils.js'

const router = express.Router()

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

router.post('/register', authLimiter, async (req, res) => {
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
  const existing = await db.get('SELECT id FROM users WHERE email = $1', [email])
  if (existing) {
    return res.status(409).json({ error: 'Email already registered' })
  }
  const password_hash = await bcrypt.hash(rawPassword, 10)
  const result = await db.run('INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id', [email, password_hash])
  const token = jwt.sign({ id: result.lastInsertRowid, email }, JWT_SECRET, { expiresIn: '7d' })
  res.cookie('token', token, cookieOptions)
  res.json({ token, id: result.lastInsertRowid, email, display_name: null, is_admin: 0, gems: 0, streak_freezes: 0, xp: 0, streak: 0 })
})

router.post('/login', authLimiter, async (req, res) => {
  const rawEmail = req.body.email || ''
  const password = req.body.password || ''
  if (!rawEmail || !password) {
    return res.status(400).json({ error: 'Email and password required' })
  }
  const email = sanitizeEmail(rawEmail)
  const user = await db.get('SELECT * FROM users WHERE email = $1', [email])
  if (!user || !user.password_hash) {
    return res.status(401).json({ error: 'The email or password you entered is incorrect.' })
  }
  const valid = await bcrypt.compare(password, user.password_hash)
  if (!valid) {
    return res.status(401).json({ error: 'The email or password you entered is incorrect.' })
  }
  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' })
  res.cookie('token', token, cookieOptions)
  res.json({ token, id: user.id, email: user.email, display_name: user.display_name, is_admin: user.is_admin, gems: user.gems || 0, streak_freezes: user.streak_freezes || 0, xp: user.xp || 0, streak: user.streak_days || 0 })
})

router.post('/logout', (req, res) => {
  res.clearCookie('token')
  res.json({ message: 'Logged out' })
})

router.get('/me', requireAuth, async (req, res) => {
  const user = await db.get('SELECT id, email, display_name, created_at, is_admin, gems, streak_freezes, xp, streak_days FROM users WHERE id = $1', [req.user.id])
  if (!user) return res.status(401).json({ error: 'User not found' })
  res.json({ id: user.id, email: user.email, display_name: user.display_name, created_at: user.created_at, is_admin: user.is_admin, gems: user.gems || 0, streak_freezes: user.streak_freezes || 0, xp: user.xp || 0, streak: user.streak_days || 0 })
})

router.get('/profile', requireAuth, async (req, res) => {
  const user = await db.get('SELECT email, display_name, created_at FROM users WHERE id = $1', [req.user.id])
  if (!user) return res.status(404).json({ error: 'User not found' })
  const favRow = await db.get('SELECT COUNT(*)::integer as count FROM favorites WHERE user_id = $1', [req.user.id])
  const favorites_count = favRow?.count || 0
  const revRow = await db.get(`
    SELECT COALESCE(SUM(correct_count + incorrect_count), 0)::integer as total
    FROM flashcard_progress WHERE user_id = $1
  `, [req.user.id])
  const flashcards_reviewed = revRow?.total || 0
  const dueRow = await db.get(`
    SELECT COUNT(*)::integer as count FROM flashcard_progress
    WHERE user_id = $1 AND next_review_date <= CURRENT_TIMESTAMP
  `, [req.user.id])
  const flashcards_due = dueRow?.count || 0
  res.json({
    email: user.email,
    display_name: user.display_name,
    created_at: user.created_at,
    favorites_count,
    flashcards_reviewed,
    flashcards_due,
  })
})

router.patch('/profile', requireAuth, async (req, res) => {
  const { display_name } = req.body
  if (display_name !== undefined) {
    const sanitized = sanitizeString(display_name)
    if (sanitized.length > 50) {
      return res.status(400).json({ error: 'Display name must be 50 characters or less' })
    }
    await db.run('UPDATE users SET display_name = $1 WHERE id = $2', [sanitized || null, req.user.id])
  }
  const user = await db.get('SELECT email, display_name, created_at FROM users WHERE id = $1', [req.user.id])
  res.json({ email: user.email, display_name: user.display_name, created_at: user.created_at })
})

router.post('/profile/change-password', requireAuth, async (req, res) => {
  const { current_password, new_password } = req.body
  if (!current_password || !new_password) {
    return res.status(400).json({ error: 'Current and new password required' })
  }
  if (new_password.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters' })
  }
  const user = await db.get('SELECT * FROM users WHERE id = $1', [req.user.id])
  if (!user || !user.password_hash) {
    return res.status(400).json({ error: 'Cannot change password for this account' })
  }
  const valid = await bcrypt.compare(current_password, user.password_hash)
  if (!valid) {
    return res.status(401).json({ error: 'Current password is incorrect' })
  }
  const password_hash = await bcrypt.hash(new_password, 10)
  await db.run('UPDATE users SET password_hash = $1 WHERE id = $2', [password_hash, req.user.id])
  res.json({ message: 'Password updated successfully' })
})

router.get('/dashboard', requireAuth, async (req, res) => {
  const today = new Date().toISOString().slice(0, 10)
  const searchRow = await db.get(`
    SELECT COUNT(*)::integer as count FROM search_history
    WHERE user_id = $1 AND searched_at::date = $2::date
  `, [req.user.id, today])
  const searches_today = searchRow?.count || 0
  const dueRow = await db.get(`
    SELECT COUNT(*)::integer as count FROM flashcard_progress
    WHERE user_id = $1 AND next_review_date <= CURRENT_TIMESTAMP
  `, [req.user.id])
  const flashcards_due = dueRow?.count || 0
  const favRow = await db.get('SELECT COUNT(*)::integer as count FROM favorites WHERE user_id = $1', [req.user.id])
  const favorites_count = favRow?.count || 0
  const recent_searches = await db.all(`
    SELECT query, searched_at FROM search_history
    WHERE user_id = $1 ORDER BY searched_at DESC LIMIT 5
  `, [req.user.id])
  res.json({ searches_today, flashcards_due, favorites_count, recent_searches })
})

router.post('/forgot-password', authLimiter, async (req, res) => {
  const rawEmail = req.body.email || ''
  if (!rawEmail) {
    return res.status(400).json({ error: 'Email required' })
  }
  const email = sanitizeEmail(rawEmail)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' })
  }
  const user = await db.get('SELECT id FROM users WHERE email = $1', [email])
  if (user) {
    const token = crypto.randomBytes(32).toString('hex')
    await db.run('DELETE FROM password_resets WHERE user_id = $1', [user.id])
    await db.run(`
      INSERT INTO password_resets (user_id, token, expires_at)
      VALUES ($1, $2, NOW() + INTERVAL '1 hour')
    `, [user.id, token])
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
  }
  res.json({ message: 'If an account exists a reset link has been sent' })
})

router.post('/reset-password', authLimiter, async (req, res) => {
  const { token, password } = req.body
  if (!token || !password) {
    return res.status(400).json({ error: 'Token and password required' })
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' })
  }
  const entry = await db.get(`
    SELECT pr.user_id, u.email
    FROM password_resets pr
    JOIN users u ON u.id = pr.user_id
    WHERE pr.token = $1 AND pr.used = 0 AND pr.expires_at > CURRENT_TIMESTAMP
  `, [token])
  if (!entry) {
    return res.status(400).json({ error: 'Invalid or expired reset token' })
  }
  const password_hash = await bcrypt.hash(password, 10)
  await db.transaction(async (client) => {
    await client.query('UPDATE users SET password_hash = $1 WHERE id = $2', [password_hash, entry.user_id])
    await client.query('UPDATE password_resets SET used = 1 WHERE token = $3', [token])
  })
  res.json({ message: 'Password has been reset successfully' })
})

router.get('/dev-reset-link/:token', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not available in production' })
  }
  const entry = await db.get(`
    SELECT pr.user_id, u.email, pr.expires_at
    FROM password_resets pr
    JOIN users u ON u.id = pr.user_id
    WHERE pr.token = $1 AND pr.used = 0 AND pr.expires_at > CURRENT_TIMESTAMP
  `, [req.params.token])
  if (!entry) {
    return res.status(400).json({ error: 'Invalid or expired reset token' })
  }
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
  res.json({ resetUrl: `${frontendUrl}/reset-password/${req.params.token}` })
})

export default router
