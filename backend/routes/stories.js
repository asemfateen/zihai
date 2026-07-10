import express from 'express'
import { db } from '../db.js'
import { requireAuth } from '../middleware/auth.js'

const router = express.Router()

router.get('/stories', requireAuth, async (req, res) => {
  try {
    const rows = await db.all('SELECT id, title, hsk_level FROM reading_stories ORDER BY hsk_level ASC, id ASC')
    res.json(rows)
  } catch (err) {
    console.error('Failed to get stories:', err)
    res.status(500).json({ error: 'Database error' })
  }
})

router.get('/stories/:id', requireAuth, async (req, res) => {
  try {
    const story = await db.get('SELECT * FROM reading_stories WHERE id = $1', [req.params.id])
    if (!story) return res.status(404).json({ error: 'Story not found' })
    res.json(story)
  } catch (err) {
    console.error('Failed to get story detail:', err)
    res.status(500).json({ error: 'Database error' })
  }
})

export default router
