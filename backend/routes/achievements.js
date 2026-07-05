import express from 'express'
import { db } from '../db.js'
import { requireAuth } from '../middleware/auth.js'

const router = express.Router()

router.get('/stats', requireAuth, (req, res) => {
  try {
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
          }
        }
      } else {
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

router.get('/achievements', requireAuth, (req, res) => {
  try {
    const userId = req.user.id

    const firstLogin = 1
    const favoritesCount = db.prepare('SELECT COUNT(*) as c FROM favorites WHERE user_id = ?').get(userId).c
    const reviewCount = db.prepare('SELECT COUNT(*) as c FROM review_log WHERE user_id = ?').get(userId).c
    const searchCount = db.prepare('SELECT COUNT(*) as c FROM search_history WHERE user_id = ?').get(userId).c

    const statsMap = {
      'first_login': firstLogin,
      'favorites_count': favoritesCount,
      'review_count': reviewCount,
      'search_count': searchCount
    }

    const achievements = db.prepare('SELECT * FROM achievements').all()
    const userUnlocked = db.prepare('SELECT achievement_id, unlocked_at FROM user_achievements WHERE user_id = ?').all(userId)
    const unlockedSet = new Set(userUnlocked.map(a => a.achievement_id))

    const insertUnlock = db.prepare('INSERT OR IGNORE INTO user_achievements (user_id, achievement_id) VALUES (?, ?)')
    
    const results = achievements.map(ach => {
      let isUnlocked = unlockedSet.has(ach.id)
      let currentProgress = statsMap[ach.requirement_type] || 0
      
      if (!isUnlocked && currentProgress >= ach.requirement_value) {
        insertUnlock.run(userId, ach.id)
        isUnlocked = true
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
      }
    })

    res.json(results)
  } catch (err) {
    console.error('Failed to fetch achievements:', err.message)
    res.status(500).json({ error: 'Failed to fetch achievements' })
  }
})

export default router
