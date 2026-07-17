import express from 'express'
import { db } from '../db.js'
import { optionalAuth } from '../middleware/auth.js'

const router = express.Router()

// Helper to calculate days between two dates (ignoring time)
function daysBetween(d1, d2) {
  const date1 = new Date(d1)
  const date2 = new Date(d2)
  date1.setHours(0, 0, 0, 0)
  date2.setHours(0, 0, 0, 0)
  return Math.round((date2 - date1) / (1000 * 60 * 60 * 24))
}

router.get('/progress', optionalAuth, async (req, res) => {
  try {
    if (!req.user) {
      return res.json({
        xp: 0,
        streak_days: 0,
        last_login: null,
        gems: 0,
        streak_freezes: 0,
        previous_streak: 0,
        freeze_used: false,
        streak_broken: false
      })
    }

    const user = await db.get('SELECT xp, streak_days, last_login, gems, streak_freezes, previous_streak FROM users WHERE id = $1', [req.user.id])
    if (!user) return res.status(404).json({ error: 'User not found' })

    let currentStreak = user.streak_days || 0
    let currentFreezes = user.streak_freezes || 0
    let currentGems = user.gems || 0
    let lastLogin = user.last_login
    let freezeUsed = false
    let streakBroken = false
    let previousStreak = user.previous_streak || 0

    const now = new Date()
    
    if (lastLogin) {
      const diff = daysBetween(lastLogin, now)
      if (diff > 1) {
        const missedDays = diff - 1
        if (currentFreezes >= missedDays) {
          // Consume missedDays streak freezes
          currentFreezes -= missedDays
          freezeUsed = true
          // Set last login to yesterday so they still need to complete a lesson today
          const yesterday = new Date(now)
          yesterday.setDate(now.getDate() - 1)
          lastLogin = yesterday

          await db.run(
            'UPDATE users SET streak_freezes = $1, last_login = $2 WHERE id = $3',
            [currentFreezes, yesterday, req.user.id]
          )
        } else {
          // No freeze, streak is broken
          previousStreak = currentStreak
          currentStreak = 0
          streakBroken = true

          await db.run(
            'UPDATE users SET previous_streak = $1, streak_days = 0 WHERE id = $2',
            [previousStreak, req.user.id]
          )
        }
      }
    }

    res.json({
      xp: user.xp || 0,
      streak_days: currentStreak,
      last_login: lastLogin,
      gems: currentGems,
      streak_freezes: currentFreezes,
      previous_streak: previousStreak,
      freeze_used: freezeUsed,
      streak_broken: streakBroken
    })
  } catch (err) {
    console.error('Progress fetch error:', err)
    res.status(500).json({ error: 'Failed to fetch progress' })
  }
})

router.post('/progress/lesson-complete', optionalAuth, async (req, res) => {
  const { xpGained, unit } = req.body
  let xp = parseInt(xpGained, 10) || 10
  if (xp > 100) xp = 100
  const parsedUnit = parseInt(unit, 10)

  try {
    // Anonymous users: return success without saving
    if (!req.user) {
      return res.json({
        xp: 0,
        streak_days: 0,
        last_login: null,
        xp_gained: xp,
        gems: 0,
        gems_gained: 0,
        milestone_reached: false
      })
    }

    const user = await db.get('SELECT xp, streak_days, last_login, gems, streak_freezes FROM users WHERE id = $1', [req.user.id])
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
    
    // Award Gems
    const baseGems = 15
    let milestoneGems = 0
    // Award 50 gems for every 7 days streak milestone
    if (newStreak > 0 && newStreak % 7 === 0 && newStreak !== user.streak_days) {
      milestoneGems = 50
    }
    const gemsAwarded = baseGems + milestoneGems
    const newGems = (user.gems || 0) + gemsAwarded

    // Update user progress
    db.run(
      'UPDATE users SET xp = $1, streak_days = $2, last_login = $3, gems = $4, previous_streak = 0 WHERE id = $5',
      [newXp, newStreak, now, newGems, req.user.id]
    )

      // 2. Auto-seed lesson words into user's flashcards
      // 2. Auto-seed lesson words into user's flashcards (simplified for SQLite)
      if (parsedUnit && parsedUnit >= 1) {
        // Try to add some words to flashcards
        try {
          const targetWords = db.all(
            'SELECT id FROM cedict_words WHERE simplified GLOB ? AND length(simplified) <= 2 ORDER BY length(simplified) ASC LIMIT ?',
            ['[一-龥]*', 10]
          )
          for (const w of targetWords) {
            db.run(
              'INSERT OR IGNORE INTO flashcard_progress (user_id, word_id, next_review_date) VALUES (?, ?, datetime(\'now\'))',
              [req.user.id, w.id]
            )
          }
        } catch(e) {
          console.error('Seed flashcards error (non-fatal):', e.message)
        }
      }

    res.json({
      xp: newXp,
      streak_days: newStreak,
      last_login: now.toISOString(),
      xp_gained: xp,
      gems: newGems,
      gems_gained: gemsAwarded,
      milestone_reached: milestoneGems > 0
    })
  } catch (err) {
    console.error('Lesson complete error:', err)
    res.status(500).json({ error: 'Failed to record lesson completion' })
  }
})

router.post('/progress/buy-streak-freeze', optionalAuth, async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' })
    const user = await db.get('SELECT gems, streak_freezes FROM users WHERE id = $1', [req.user.id])
    if (!user) return res.status(404).json({ error: 'User not found' })

    if (user.gems < 200) {
      return res.status(400).json({ error: 'Not enough gems. Streak Freeze costs 200 gems.' })
    }

    const newGems = user.gems - 200
    const newFreezes = (user.streak_freezes || 0) + 1

    await db.run('UPDATE users SET gems = $1, streak_freezes = $2 WHERE id = $3', [newGems, newFreezes, req.user.id])

    res.json({
      gems: newGems,
      streak_freezes: newFreezes
    })
  } catch (err) {
    console.error('Buy streak freeze error:', err)
    res.status(500).json({ error: 'Failed to purchase streak freeze' })
  }
})

router.post('/progress/streak-repair-gems', optionalAuth, async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' })
    const user = await db.get('SELECT gems, previous_streak FROM users WHERE id = $1', [req.user.id])
    if (!user) return res.status(404).json({ error: 'User not found' })

    if (user.previous_streak <= 0) {
      return res.status(400).json({ error: 'No broken streak to repair' })
    }

    if (user.gems < 250) {
      return res.status(400).json({ error: 'Not enough gems. Streak Repair costs 250 gems.' })
    }

    const newGems = user.gems - 250
    const restoredStreak = user.previous_streak
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)

    await db.run(
      'UPDATE users SET gems = $1, streak_days = $2, previous_streak = 0, last_login = $3 WHERE id = $4',
      [newGems, restoredStreak, yesterday, req.user.id]
    )

    res.json({
      gems: newGems,
      streak_days: restoredStreak,
      previous_streak: 0
    })
  } catch (err) {
    console.error('Streak repair gems error:', err)
    res.status(500).json({ error: 'Failed to repair streak with gems' })
  }
})

router.post('/progress/streak-repair-challenge', optionalAuth, async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' })
    const user = await db.get('SELECT previous_streak FROM users WHERE id = $1', [req.user.id])
    if (!user) return res.status(404).json({ error: 'User not found' })

    if (user.previous_streak <= 0) {
      return res.status(400).json({ error: 'No broken streak to repair' })
    }

    const restoredStreak = user.previous_streak
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)

    await db.run(
      'UPDATE users SET streak_days = $1, previous_streak = 0, last_login = $2 WHERE id = $3',
      [restoredStreak, yesterday, req.user.id]
    )

    res.json({
      streak_days: restoredStreak,
      previous_streak: 0
    })
  } catch (err) {
    console.error('Streak repair challenge error:', err)
    res.status(500).json({ error: 'Failed to repair streak via challenge' })
  }
})

router.post('/progress/streak-repair-fail', optionalAuth, async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' })
    await db.run('UPDATE users SET previous_streak = 0 WHERE id = $1', [req.user.id])
    res.json({ success: true })
  } catch (err) {
    console.error('Streak repair fail error:', err)
    res.status(500).json({ error: 'Failed to record challenge failure' })
  }
})

export default router
