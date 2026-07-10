import express from 'express'
import { db } from '../db.js'
import { requireAuth } from '../middleware/auth.js'

const router = express.Router()

router.get('/stats', requireAuth, async (req, res) => {
  try {
    const datesRows = await db.all(`
      SELECT DISTINCT activity_date::date as date FROM (
        SELECT searched_at as activity_date FROM search_history WHERE user_id = $1
        UNION
        SELECT review_date as activity_date FROM review_log WHERE user_id = $2
      ) q ORDER BY date DESC
    `, [req.user.id, req.user.id])
    
    // Convert Date objects to YYYY-MM-DD strings
    const historyDates = datesRows.map(r => {
      const d = new Date(r.date)
      return d.toISOString().slice(0, 10)
    })

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

    const heatmapRows = await db.all(`
      SELECT review_date::date as date, COUNT(*)::integer as count
      FROM review_log
      WHERE user_id = $1 AND review_date >= CURRENT_DATE - INTERVAL '365 days'
      GROUP BY review_date::date
      ORDER BY review_date::date ASC
    `, [req.user.id])
    
    const heatmap = heatmapRows.map(r => ({
      date: new Date(r.date).toISOString().slice(0, 10),
      count: r.count
    }))

    const totalCardsRow = await db.get('SELECT COUNT(*)::integer as count FROM flashcard_progress WHERE user_id = $1', [req.user.id])
    const totalCards = totalCardsRow?.count || 0
    const newCardsRow = await db.get('SELECT COUNT(*)::integer as count FROM flashcard_progress WHERE user_id = $1 AND reps = 0', [req.user.id])
    const newCards = newCardsRow?.count || 0
    const learningCardsRow = await db.get('SELECT COUNT(*)::integer as count FROM flashcard_progress WHERE user_id = $1 AND reps > 0 AND reps < 5', [req.user.id])
    const learningCards = learningCardsRow?.count || 0
    const masteredCardsRow = await db.get('SELECT COUNT(*)::integer as count FROM flashcard_progress WHERE user_id = $1 AND reps >= 5', [req.user.id])
    const masteredCards = masteredCardsRow?.count || 0

    const hskProgressRows = await db.all(`
      SELECT hsk_level, COUNT(*)::integer as count
      FROM (
        SELECT fp.word_id, COALESCE(w.hsk_level, c.hsk_level) as hsk_level
        FROM flashcard_progress fp
        LEFT JOIN cedict_words w ON w.id = fp.word_id
        LEFT JOIN characters c ON c.id = fp.word_id
        WHERE fp.user_id = $1
      ) q
      WHERE hsk_level IS NOT NULL AND hsk_level > 0
      GROUP BY hsk_level
      ORDER BY hsk_level ASC
    `, [req.user.id])

    const hskTotals = await db.all(`
      SELECT hsk_level, COUNT(DISTINCT word_id)::integer as total
      FROM (
        SELECT id as word_id, hsk_level FROM cedict_words WHERE hsk_level > 0
        UNION
        SELECT id as word_id, hsk_level FROM characters WHERE hsk_level > 0
      ) q
      GROUP BY hsk_level
      ORDER BY hsk_level ASC
    `)

    const progressMap = {}
    hskProgressRows.forEach(p => {
      progressMap[p.hsk_level] = p.count
    })

    const hskProgress = hskTotals.map(t => ({
      level: t.hsk_level,
      count: progressMap[t.hsk_level] || 0,
      total: t.total
    }))

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

router.get('/achievements', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id

    const firstLogin = 1
    const favRow = await db.get('SELECT COUNT(*)::integer as c FROM favorites WHERE user_id = $1', [userId])
    const favoritesCount = favRow?.c || 0
    const revRow = await db.get('SELECT COUNT(*)::integer as c FROM review_log WHERE user_id = $1', [userId])
    const reviewCount = revRow?.c || 0
    const searchRow = await db.get('SELECT COUNT(*)::integer as c FROM search_history WHERE user_id = $1', [userId])
    const searchCount = searchRow?.c || 0

    const statsMap = {
      'first_login': firstLogin,
      'favorites_count': favoritesCount,
      'review_count': reviewCount,
      'search_count': searchCount
    }

    const achievements = await db.all('SELECT * FROM achievements')
    const userUnlocked = await db.all('SELECT achievement_id, unlocked_at FROM user_achievements WHERE user_id = $1', [userId])
    const unlockedSet = new Set(userUnlocked.map(a => a.achievement_id))

    const results = await Promise.all(achievements.map(async (ach) => {
      let isUnlocked = unlockedSet.has(ach.id)
      let currentProgress = statsMap[ach.requirement_type] || 0
      
      if (!isUnlocked && currentProgress >= ach.requirement_value) {
        await db.run(
          'INSERT INTO user_achievements (user_id, achievement_id, unlocked_at) VALUES ($1, $2, CURRENT_TIMESTAMP) ON CONFLICT (user_id, achievement_id) DO NOTHING',
          [userId, ach.id]
        )
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
    }))

    res.json(results)
  } catch (err) {
    console.error('Failed to fetch achievements:', err.message)
    res.status(500).json({ error: 'Failed to fetch achievements' })
  }
})

export default router
