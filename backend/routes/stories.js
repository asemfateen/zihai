import express from 'express'
import { db } from '../db.js'
import { requireAuth } from '../middleware/auth.js'

const router = express.Router()

router.get('/stories', requireAuth, (req, res) => {
  const rows = db.prepare('SELECT id, title, hsk_level FROM reading_stories ORDER BY hsk_level ASC, id ASC').all()
  res.json(rows)
})

router.get('/stories/:id', requireAuth, (req, res) => {
  const story = db.prepare('SELECT * FROM reading_stories WHERE id = ?').get(req.params.id)
  if (!story) return res.status(404).json({ error: 'Story not found' })
  res.json(story)
})

export default router
