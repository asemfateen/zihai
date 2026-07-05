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

router.post('/login', authLimiter, async (req, res) => {
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

router.post('/logout', (req, res) => {
  res.clearCookie('token')
  res.json({ message: 'Logged out' })
})

router.get('/me', requireAuth, (req, res) => {
  const user = db.prepare('SELECT id, email, display_name, created_at FROM users WHERE id = ?').get(req.user.id)
  if (!user) return res.status(401).json({ error: 'User not found' })
  res.json({ id: user.id, email: user.email, display_name: user.display_name, created_at: user.created_at })
})

router.get('/profile', requireAuth, (req, res) => {
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

router.patch('/profile', requireAuth, (req, res) => {
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

router.post('/profile/change-password', requireAuth, async (req, res) => {
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

router.get('/dashboard', requireAuth, (req, res) => {
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

router.get('/dev-reset-link/:token', (req, res) => {
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

export default router
