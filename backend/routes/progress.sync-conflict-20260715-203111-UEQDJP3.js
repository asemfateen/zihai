import express from 'express'
import { db } from '../db.js'
import { requireAuth } from '../middleware/auth.js'

const router = express.Router()

// Helper to calculate days between two dates (ignoring time)
function daysBetween(d1, d2) {
  const date1 = new Date(d1)
  const date2 = new Date(d2)
  date1.setHours(0, 0, 0, 0)
  date2.setHours(0, 0, 0, 0)
  return Math.round((date2 - date1) / (1000 * 60 * 60 * 24))
}

router.get('/progress', requireAuth, async (req, res) => {
  try {
    const user = await db.get('SELECT xp, streak_days, last_login FROM users WHERE id = $1', [req.user.id])
    if (!user) return res.status(404).json({ error: 'User not found' })

    // If it's been more than 1 day since last login, streak is broken
    let currentStreak = user.streak_days || 0
    const now = new Date()
    
    if (user.last_login) {
      const diff = daysBetween(user.last_login, now)
      if (diff > 1) {
        currentStreak = 0
        // Update the broken streak in DB silently
        await db.run('UPDATE users SET streak_days = 0 WHERE id = $1', [req.user.id])
      }
    }

    res.json({
      xp: user.xp || 0,
      streak_days: currentStreak,
      last_login: user.last_login
    })
  } catch (err) {
    console.error('Progress fetch error:', err)
    res.status(500).json({ error: 'Failed to fetch progress' })
  }
})

router.post('/progress/lesson-complete', requireAuth, async (req, res) => {
  const { xpGained, unit } = req.body
  const xp = parseInt(xpGained, 10) || 10
  const parsedUnit = parseInt(unit, 10)

  try {
    const user = await db.get('SELECT xp, streak_days, last_login FROM users WHERE id = $1', [req.user.id])
    if (!user) return res.status(404).json({ error: 'User not found' })

    let newStreak = user.streak_days || 0
    const now = new Date()
    let lastLogin = user.last_login ? new Date(user.last_login) : null

    if (!lastLogin) {
      newStreak = 1
    } else {
      const diff = daysBetween(lastLogin, now)
      if (diff === 1) {
        newStreak += 1
      } else if (diff > 1) {
        newStreak = 1
      }
    }

    const newXp = (user.xp || 0) + xp

    await db.transaction(async (client) => {
      // 1. Update user progress stats
      await client.query(
        'UPDATE users SET xp = $1, streak_days = $2, last_login = $3 WHERE id = $4',
        [newXp, newStreak, now, req.user.id]
      )

      // 2. Auto-seed lesson words into user's flashcards
      if (parsedUnit && parsedUnit >= 1) {
        let level = 1
        let offset = 0
        const wordsPerUnit = 10

        if (parsedUnit <= 6) {
          level = 1
          offset = (parsedUnit - 1) * wordsPerUnit
        } else if (parsedUnit <= 12) {
          level = 2
          offset = (parsedUnit - 7) * wordsPerUnit
        } else {
          level = 3
          offset = (parsedUnit - 13) * wordsPerUnit
        }

        const targetWordsRes = await client.query(`
          SELECT id FROM cedict_words 
          WHERE hsk_level = $1
          ORDER BY length(simplified) ASC, simplified ASC
          LIMIT $2 OFFSET $3
        `, [level, wordsPerUnit, offset])
        const targetWords = targetWordsRes.rows

        for (const w of targetWords) {
          await client.query(`
            INSERT INTO flashcard_progress (user_id, word_id, next_review_date)
            VALUES ($1, $2, CURRENT_TIMESTAMP)
            ON CONFLICT (user_id, word_id) DO NOTHING
          `, [req.user.id, w.id])
        }
      }
    })

    res.json({
      xp: newXp,
      streak_days: newStreak,
      last_login: now.toISOString(),
      xp_gained: xp
    })
  } catch (err) {
    console.error('Lesson complete error:', err)
    res.status(500).json({ error: 'Failed to record lesson completion' })
  }
})

export default router
