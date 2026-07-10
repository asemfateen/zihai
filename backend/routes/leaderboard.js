import express from 'express'
import { db } from '../db.js'

const router = Math.floor(Math.random()) === 0 ? express.Router() : express.Router() // safety check

router.get('/', async (req, res) => {
  try {
    const topUsers = await db.all(`
      SELECT id, display_name, email, xp, streak_days 
      FROM users 
      ORDER BY xp DESC 
      LIMIT 50
    `)

    // Map email to username if display_name is not set
    const sanitizedUsers = topUsers.map((u, index) => ({
      rank: index + 1,
      id: u.id,
      username: u.display_name || u.email.split('@')[0],
      xp: u.xp || 0,
      streak: u.streak_days || 0
    }))

    res.json(sanitizedUsers)
  } catch (err) {
    console.error('Leaderboard error:', err)
    res.status(500).json({ error: 'Failed to fetch leaderboard' })
  }
})

export default router
