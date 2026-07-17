import express from 'express'
import { fsrs, Rating, createEmptyCard } from 'ts-fsrs'
import { db } from '../db.js'
import { requireAuth } from '../middleware/auth.js'
import { resolveRowsBatch, sanitizeString } from '../utils/textUtils.js'
import { convertNumberedPinyin } from '../utils/pinyin.js'

const router = express.Router()
const f = fsrs()

const FLASHCARD_STATIC_ROUTES = {
  due: true,
}

// --- History routes ---
router.post('/history', requireAuth, async (req, res) => {
  const { query } = req.body
  if (!query) return res.status(400).json({ error: 'Query required' })
  try {
    await db.run(`
      INSERT INTO search_history (user_id, query, searched_at) VALUES ($1, $2, CURRENT_TIMESTAMP)
      ON CONFLICT(user_id, query) DO UPDATE SET searched_at = CURRENT_TIMESTAMP
    `, [req.user.id, query])
  } catch (err) {
    console.error('History save error:', err)
  }
  res.json({ message: 'Saved' })
})

router.get('/history', requireAuth, async (req, res) => {
  try {
    const rows = await db.all(`
      SELECT id, query, searched_at FROM search_history
      WHERE user_id = $1
      ORDER BY searched_at DESC
      LIMIT 20
    `, [req.user.id])
    res.json(rows)
  } catch (err) {
    console.error('Failed to get history:', err)
    res.status(500).json({ error: 'Failed to fetch history' })
  }
})

router.delete('/history', requireAuth, async (req, res) => {
  try {
    await db.run('DELETE FROM search_history WHERE user_id = $1', [req.user.id])
    res.json({ message: 'History cleared' })
  } catch (err) {
    console.error('Failed to clear history:', err)
    res.status(500).json({ error: 'Failed to clear history' })
  }
})

// --- Favorites routes ---
router.post('/favorites/:wordId', requireAuth, async (req, res) => {
  try {
    await db.run(`
      INSERT INTO favorites (user_id, word_id, created_at)
      VALUES ($1, $2, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id, word_id) DO NOTHING
    `, [req.user.id, req.params.wordId])
    res.json({ message: 'Added' })
  } catch (err) {
    console.error('Failed to add favorite:', err)
    res.status(500).json({ error: 'Database error' })
  }
})

router.delete('/favorites/:wordId', requireAuth, async (req, res) => {
  try {
    await db.run('DELETE FROM favorites WHERE user_id = $1 AND word_id = $2', [req.user.id, req.params.wordId])
    res.json({ message: 'Removed' })
  } catch (err) {
    console.error('Failed to remove favorite:', err)
    res.status(500).json({ error: 'Database error' })
  }
})

router.get('/favorites/:wordId', requireAuth, async (req, res) => {
  try {
    const fav = await db.get('SELECT id FROM favorites WHERE user_id = $1 AND word_id = $2', [req.user.id, req.params.wordId])
    res.json({ isFavorite: !!fav })
  } catch (err) {
    console.error('Failed to fetch favorite status:', err)
    res.status(500).json({ error: 'Database error' })
  }
})

router.get('/favorites', requireAuth, async (req, res) => {
  try {
    const rows = await db.all(`
      SELECT w.id, w.simplified AS character, w.pinyin, w.definition AS english_definition, w.hsk_level
      FROM favorites f
      JOIN cedict_words w ON w.id = f.word_id
      WHERE f.user_id = $1
      ORDER BY f.created_at DESC
    `, [req.user.id])
    await resolveRowsBatch(rows)
    res.json(rows)
  } catch (err) {
    console.error('Failed to fetch favorites:', err)
    res.status(500).json({ error: 'Failed to fetch favorites' })
  }
})

// --- Custom lists routes ---
router.get('/lists', requireAuth, async (req, res) => {
  try {
    const rows = await db.all(`
      SELECT cl.id, cl.name, cl.description, cl.created_at, COUNT(clw.word_id)::integer as word_count
      FROM custom_lists cl
      LEFT JOIN custom_list_words clw ON clw.list_id = cl.id
      WHERE cl.user_id = $1
      GROUP BY cl.id
      ORDER BY cl.name ASC
    `, [req.user.id])
    res.json(rows)
  } catch (err) {
    console.error('Failed to fetch lists:', err)
    res.status(500).json({ error: 'Database error' })
  }
})

router.post('/lists', requireAuth, async (req, res) => {
  const name = sanitizeString(req.body.name || '')
  const description = sanitizeString(req.body.description || '')
  if (!name) return res.status(400).json({ error: 'List name required' })
  try {
    const result = await db.run(
      'INSERT INTO custom_lists (user_id, name, description) VALUES ($1, $2, $3) RETURNING id',
      [req.user.id, name, description]
    )
    res.json({ id: result.lastInsertRowid, name, description })
  } catch (err) {
    console.error('Failed to create list:', err)
    res.status(500).json({ error: 'Database error' })
  }
})

router.delete('/lists/:id', requireAuth, async (req, res) => {
  try {
    await db.run('DELETE FROM custom_lists WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id])
    res.json({ message: 'List deleted' })
  } catch (err) {
    console.error('Failed to delete list:', err)
    res.status(500).json({ error: 'Database error' })
  }
})

router.get('/lists/:id/words', requireAuth, async (req, res) => {
  try {
    const list = await db.get('SELECT id FROM custom_lists WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id])
    if (!list) return res.status(404).json({ error: 'List not found' })
    const rows = await db.all(`
      SELECT w.id, w.simplified AS character, w.pinyin, w.definition AS english_definition, w.hsk_level
      FROM custom_list_words clw
      JOIN cedict_words w ON w.id = clw.word_id
      WHERE clw.list_id = $1
      ORDER BY clw.added_at DESC
    `, [req.params.id])
    await resolveRowsBatch(rows)
    res.json(rows)
  } catch (err) {
    console.error('Failed to fetch list words:', err)
    res.status(500).json({ error: 'Database error' })
  }
})

router.post('/lists/:id/words', requireAuth, async (req, res) => {
  const wordId = parseInt(req.body.wordId, 10)
  if (isNaN(wordId)) return res.status(400).json({ error: 'Invalid word ID' })
  try {
    const list = await db.get('SELECT id FROM custom_lists WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id])
    if (!list) return res.status(404).json({ error: 'List not found' })
    await db.run(`
      INSERT INTO custom_list_words (list_id, word_id, added_at)
      VALUES ($1, $2, CURRENT_TIMESTAMP)
      ON CONFLICT (list_id, word_id) DO NOTHING
    `, [req.params.id, wordId])
    res.json({ message: 'Word added to list' })
  } catch (err) {
    console.error('Failed to add word to list:', err)
    res.status(500).json({ error: 'Database error' })
  }
})

router.delete('/lists/:id/words/:wordId', requireAuth, async (req, res) => {
  try {
    const list = await db.get('SELECT id FROM custom_lists WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id])
    if (!list) return res.status(404).json({ error: 'List not found' })
    await db.run('DELETE FROM custom_list_words WHERE list_id = $1 AND word_id = $2', [req.params.id, req.params.wordId])
    res.json({ message: 'Word removed from list' })
  } catch (err) {
    console.error('Failed to remove word from list:', err)
    res.status(500).json({ error: 'Database error' })
  }
})

router.get('/words/:wordId/lists', requireAuth, async (req, res) => {
  try {
    const rows = await db.all(`
      SELECT list_id FROM custom_list_words clw
      JOIN custom_lists cl ON cl.id = clw.list_id
      WHERE cl.user_id = $1 AND clw.word_id = $2
    `, [req.user.id, req.params.wordId])
    res.json(rows.map(r => r.list_id))
  } catch (err) {
    console.error('Failed to fetch lists for word:', err)
    res.status(500).json({ error: 'Database error' })
  }
})

// --- Flashcard Seeding ---
router.post('/flashcards/seed', requireAuth, async (req, res) => {
  try {
    const starterWords = await db.all(`
      SELECT id FROM cedict_words 
      WHERE hsk_level = 1 
      ORDER BY RANDOM() LIMIT 5
    `)

    await db.transaction(async (client) => {
      for (const word of starterWords) {
        await client.query(`
          INSERT INTO flashcard_progress (user_id, word_id, added_at, next_review_date)
          VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          ON CONFLICT (user_id, word_id) DO NOTHING
        `, [req.user.id, word.id])
      }
    })

    res.json({ message: 'Seeded 5 HSK 1 starter cards successfully' })
  } catch (err) {
    console.error('Failed to seed deck:', err)
    res.status(500).json({ error: 'Failed to seed deck' })
  }
})

// --- Flashcard Import/Export ---
router.post('/flashcards/import', requireAuth, async (req, res) => {
  const { text } = req.body
  if (!text) return res.status(400).json({ error: 'No text provided' })

  const lines = text.split('\n').map(l => l.trim()).filter(l => l)
  let imported = 0
  
  try {
    await db.transaction(async (client) => {
      for (const line of lines) {
        const match = line.match(/([\u4e00-\u9fff]+)/)
        if (match) {
          const char = match[1]
          const wordRow = await db.get('SELECT id FROM cedict_words WHERE simplified = $1 OR traditional = $2 LIMIT 1', [char, char])
          if (wordRow) {
            try {
              await client.query(`
                INSERT INTO flashcard_progress (user_id, word_id, stability, difficulty, elapsed_days, scheduled_days, reps, lapses, state, next_review_date)
                VALUES ($1, $2, 0, 0, 0, 0, 0, 0, 0, CURRENT_TIMESTAMP)
                ON CONFLICT (user_id, word_id) DO NOTHING
              `, [req.user.id, wordRow.id])
              imported++
            } catch (e) {
              console.error('Import error for word_id:', wordRow.id, e.message)
            }
          }
        }
      }
    })
    res.json({ message: `Successfully imported ${imported} words into your flashcards.` })
  } catch (err) {
    console.error('Failed to import flashcards:', err)
    res.status(500).json({ error: 'Database error during import' })
  }
})

router.get('/flashcards/export', requireAuth, async (req, res) => {
  try {
    const words = await db.all(`
      SELECT w.simplified, w.pinyin, w.definition
      FROM flashcard_progress fp
      JOIN cedict_words w ON w.id = fp.word_id
      WHERE fp.user_id = $1
    `, [req.user.id])

    let csv = 'Character,Pinyin,Definition\n'
    words.forEach(w => {
      const def = w.definition.replace(/"/g, '""')
      csv += `"${w.simplified}","${w.pinyin}","${def}"\n`
    })

    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', 'attachment; filename=zihai_flashcards.csv')
    res.send(csv)
  } catch (err) {
    console.error('Failed to export flashcards:', err)
    res.status(500).json({ error: 'Failed to export flashcards' })
  }
})

// --- Flashcard progress & FSRS routing ---
router.get('/flashcards/due', requireAuth, async (req, res) => {
  try {
    const rows = await db.all(`
      SELECT fp.id AS progress_id, fp.stability, fp.difficulty, fp.elapsed_days, fp.scheduled_days, fp.reps, fp.lapses, fp.state, fp.next_review_date,
           fp.correct_count, fp.incorrect_count,
           w.id, w.simplified AS character, w.pinyin, w.definition AS english_definition, w.hsk_level
      FROM flashcard_progress fp
      JOIN cedict_words w ON w.id = fp.word_id
      WHERE fp.user_id = $1 AND fp.next_review_date <= CURRENT_TIMESTAMP
      ORDER BY fp.next_review_date ASC
    `, [req.user.id])
    await resolveRowsBatch(rows)
    res.json(rows)
  } catch (err) {
    console.error('Failed to fetch due flashcards:', err)
    res.status(500).json({ error: 'Database error' })
  }
})

router.get('/flashcards/indeck/:wordId', requireAuth, async (req, res) => {
  try {
    const entry = await db.get('SELECT id FROM flashcard_progress WHERE user_id = $1 AND word_id = $2', [req.user.id, req.params.wordId])
    res.json({ inDeck: !!entry })
  } catch (err) {
    console.error('Failed to verify card deck status:', err)
    res.status(500).json({ error: 'Database error' })
  }
})

router.post('/flashcards/:wordId/init', requireAuth, async (req, res) => {
  if (FLASHCARD_STATIC_ROUTES[req.params.wordId]) {
    return res.status(400).json({ error: 'Invalid word ID' })
  }
  try {
    await db.run(`
      INSERT INTO flashcard_progress (user_id, word_id, added_at, next_review_date)
      VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id, word_id) DO NOTHING
    `, [req.user.id, req.params.wordId])
    res.json({ message: 'Initialized' })
  } catch (err) {
    console.error('Failed to initialize flashcard:', err)
    res.status(500).json({ error: 'Database error' })
  }
})

router.post('/flashcards/:wordId/add', requireAuth, async (req, res) => {
  if (FLASHCARD_STATIC_ROUTES[req.params.wordId]) {
    return res.status(400).json({ error: 'Invalid word ID' })
  }
  try {
    await db.run(`
      INSERT INTO flashcard_progress (user_id, word_id, added_at, next_review_date)
      VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id, word_id) DO NOTHING
    `, [req.user.id, req.params.wordId])
    res.json({ message: 'Added to flashcards' })
  } catch (err) {
    console.error('Failed to add flashcard:', err)
    res.status(500).json({ error: 'Database error' })
  }
})

router.post('/flashcards/:wordId/result', requireAuth, async (req, res) => {
  const { wordId } = req.params
  const { quality } = req.body

  if (FLASHCARD_STATIC_ROUTES[wordId]) {
    return res.status(400).json({ error: 'Invalid word ID' })
  }

  if (quality === undefined || !Number.isInteger(quality) || quality < 0 || quality > 5) {
    return res.status(400).json({ error: 'Quality must be an integer between 0 and 5' })
  }

  try {
    let entry = await db.get(`
      SELECT * FROM flashcard_progress
      WHERE user_id = $1 AND word_id = $2
    `, [req.user.id, wordId])
    
    if (!entry) {
      await db.run(`
        INSERT INTO flashcard_progress (user_id, word_id, next_review_date) 
        VALUES ($1, $2, CURRENT_TIMESTAMP)
        ON CONFLICT (user_id, word_id) DO NOTHING
      `, [req.user.id, wordId])
      entry = await db.get(`
        SELECT * FROM flashcard_progress
        WHERE user_id = $1 AND word_id = $2
      `, [req.user.id, wordId])
    }

    let rating = Rating.Again
    if (quality === 3) rating = Rating.Hard
    else if (quality === 4) rating = Rating.Good
    else if (quality === 5) rating = Rating.Easy

    const card = {
      due: entry.next_review_date instanceof Date ? entry.next_review_date : new Date(entry.next_review_date),
      stability: entry.stability || 0,
      difficulty: entry.difficulty || 0,
      elapsed_days: entry.elapsed_days || 0,
      scheduled_days: entry.scheduled_days || 0,
      reps: entry.reps || 0,
      lapses: entry.lapses || 0,
      state: entry.state || 0,
      last_review: entry.last_review_date ? (entry.last_review_date instanceof Date ? entry.last_review_date : new Date(entry.last_review_date)) : undefined
    }

    const currentCard = card.state === 0 ? createEmptyCard() : card;

    const now = new Date()
    const scheduling_cards = f.repeat(currentCard, now)
    const next_card = scheduling_cards[rating].card

    const correct_count = entry.correct_count + (quality >= 3 ? 1 : 0)
    const incorrect_count = entry.incorrect_count + (quality < 3 ? 1 : 0)

    await db.run(`
      UPDATE flashcard_progress
      SET stability = $1, difficulty = $2, elapsed_days = $3, scheduled_days = $4,
          reps = $5, lapses = $6, state = $7, last_review_date = $8, next_review_date = $9,
          correct_count = $10, incorrect_count = $11
      WHERE user_id = $12 AND word_id = $13
    `, [
      next_card.stability, next_card.difficulty, next_card.elapsed_days, next_card.scheduled_days,
      next_card.reps, next_card.lapses, next_card.state, now, next_card.due,
      correct_count, incorrect_count, req.user.id, wordId
    ])

    await db.run(`
      INSERT INTO review_log (user_id, word_id, correct, review_date)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
    `, [req.user.id, wordId, quality >= 3 ? 1 : 0])

    try {
      const { incrementQuestProgress } = await import('./quests.js')
      await incrementQuestProgress(req.user.id, 'flashcards', 1)
    } catch (e) {
      console.error('Failed to increment flashcards quest progress:', e)
    }

    res.json({ message: 'Updated' })
  } catch (err) {
    console.error('Failed to submit flashcard result:', err)
    res.status(500).json({ error: 'Failed to update flashcard progress' })
  }
})

router.delete('/flashcards/:wordId', requireAuth, async (req, res) => {
  if (FLASHCARD_STATIC_ROUTES[req.params.wordId]) {
    return res.status(400).json({ error: 'Invalid word ID' })
  }
  try {
    await db.run('DELETE FROM flashcard_progress WHERE user_id = $1 AND word_id = $2', [req.user.id, req.params.wordId])
    res.json({ message: 'Removed from deck' })
  } catch (err) {
    console.error('Failed to remove flashcard:', err)
    res.status(500).json({ error: 'Database error' })
  }
})

export default router
