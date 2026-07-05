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
router.post('/history', requireAuth, (req, res) => {
  const { query } = req.body
  if (!query) return res.status(400).json({ error: 'Query required' })
  try {
    db.prepare(`
      INSERT INTO search_history (user_id, query, searched_at) VALUES (?, ?, datetime('now'))
      ON CONFLICT(user_id, query) DO UPDATE SET searched_at = datetime('now')
    `).run(req.user.id, query)
  } catch {
    db.prepare(`
      INSERT INTO search_history (user_id, query, searched_at) VALUES (?, ?, datetime('now'))
    `).run(req.user.id, query)
  }
  res.json({ message: 'Saved' })
})

router.get('/history', requireAuth, (req, res) => {
  const rows = db.prepare(`
    SELECT id, query, searched_at FROM search_history
    WHERE user_id = ?
    ORDER BY searched_at DESC
    LIMIT 20
  `).all(req.user.id)
  res.json(rows)
})

router.delete('/history', requireAuth, (req, res) => {
  db.prepare('DELETE FROM search_history WHERE user_id = ?').run(req.user.id)
  res.json({ message: 'History cleared' })
})

// --- Favorites routes ---
router.post('/favorites/:wordId', requireAuth, (req, res) => {
  db.prepare('INSERT OR IGNORE INTO favorites (user_id, word_id) VALUES (?, ?)').run(req.user.id, req.params.wordId)
  res.json({ message: 'Added' })
})

router.delete('/favorites/:wordId', requireAuth, (req, res) => {
  db.prepare('DELETE FROM favorites WHERE user_id = ? AND word_id = ?').run(req.user.id, req.params.wordId)
  res.json({ message: 'Removed' })
})

router.get('/favorites/:wordId', requireAuth, (req, res) => {
  const fav = db.prepare('SELECT id FROM favorites WHERE user_id = ? AND word_id = ?').get(req.user.id, req.params.wordId)
  res.json({ isFavorite: !!fav })
})

router.get('/favorites', requireAuth, (req, res) => {
  const rows = db.prepare(`
    SELECT w.id, w.simplified AS character, w.pinyin, w.definition AS english_definition, w.hsk_level
    FROM favorites f
    JOIN cedict_words w ON w.id = f.word_id
    WHERE f.user_id = ?
    ORDER BY f.created_at DESC
  `).all(req.user.id)
  resolveRowsBatch(rows)
  res.json(rows)
})

// --- Custom lists routes ---
router.get('/lists', requireAuth, (req, res) => {
  const rows = db.prepare(`
    SELECT cl.id, cl.name, cl.description, cl.created_at, COUNT(clw.word_id) as word_count
    FROM custom_lists cl
    LEFT JOIN custom_list_words clw ON clw.list_id = cl.id
    WHERE cl.user_id = ?
    GROUP BY cl.id
    ORDER BY cl.name ASC
  `).all(req.user.id)
  res.json(rows)
})

router.post('/lists', requireAuth, (req, res) => {
  const name = sanitizeString(req.body.name || '')
  const description = sanitizeString(req.body.description || '')
  if (!name) return res.status(400).json({ error: 'List name required' })
  const result = db.prepare('INSERT INTO custom_lists (user_id, name, description) VALUES (?, ?, ?)').run(req.user.id, name, description)
  res.json({ id: result.lastInsertRowid, name, description })
})

router.delete('/lists/:id', requireAuth, (req, res) => {
  db.prepare('DELETE FROM custom_lists WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id)
  res.json({ message: 'List deleted' })
})

router.get('/lists/:id/words', requireAuth, (req, res) => {
  const list = db.prepare('SELECT id FROM custom_lists WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id)
  if (!list) return res.status(404).json({ error: 'List not found' })
  const rows = db.prepare(`
    SELECT w.id, w.simplified AS character, w.pinyin, w.definition AS english_definition, w.hsk_level
    FROM custom_list_words clw
    JOIN cedict_words w ON w.id = clw.word_id
    WHERE clw.list_id = ?
    ORDER BY clw.added_at DESC
  `).all(req.params.id)
  resolveRowsBatch(rows)
  res.json(rows)
})

router.post('/lists/:id/words', requireAuth, (req, res) => {
  const wordId = parseInt(req.body.wordId, 10)
  if (isNaN(wordId)) return res.status(400).json({ error: 'Invalid word ID' })
  const list = db.prepare('SELECT id FROM custom_lists WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id)
  if (!list) return res.status(404).json({ error: 'List not found' })
  db.prepare('INSERT OR IGNORE INTO custom_list_words (list_id, word_id) VALUES (?, ?)').run(req.params.id, wordId)
  res.json({ message: 'Word added to list' })
})

router.delete('/lists/:id/words/:wordId', requireAuth, (req, res) => {
  const list = db.prepare('SELECT id FROM custom_lists WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id)
  if (!list) return res.status(404).json({ error: 'List not found' })
  db.prepare('DELETE FROM custom_list_words WHERE list_id = ? AND word_id = ?').run(req.params.id, req.params.wordId)
  res.json({ message: 'Word removed from list' })
})

router.get('/words/:wordId/lists', requireAuth, (req, res) => {
  const rows = db.prepare(`
    SELECT list_id FROM custom_list_words clw
    JOIN custom_lists cl ON cl.id = clw.list_id
    WHERE cl.user_id = ? AND clw.word_id = ?
  `).all(req.user.id, req.params.wordId)
  res.json(rows.map(r => r.list_id))
})

// --- Flashcard Import/Export ---
router.post('/flashcards/import', requireAuth, (req, res) => {
  const { text } = req.body
  if (!text) return res.status(400).json({ error: 'No text provided' })

  const lines = text.split('\n').map(l => l.trim()).filter(l => l)
  let imported = 0
  
  db.transaction(() => {
    for (const line of lines) {
      const match = line.match(/([\u4e00-\u9fff]+)/)
      if (match) {
        const char = match[1]
        const wordRow = db.prepare('SELECT id FROM cedict_words WHERE simplified = ? OR traditional = ? LIMIT 1').get(char, char)
        if (wordRow) {
          try {
            db.prepare(`
              INSERT INTO flashcard_progress (user_id, word_id, stability, difficulty, elapsed_days, scheduled_days, reps, lapses, state, next_review_date)
              VALUES (?, ?, 0, 0, 0, 0, 0, 0, 0, datetime('now'))
            `).run(req.user.id, wordRow.id)
            imported++
          } catch (e) {
            console.error('Import error for word_id:', wordRow.id, e.message)
          }
        }
      }
    }
  })()

  res.json({ message: `Successfully imported ${imported} words into your flashcards.` })
})

router.get('/flashcards/export', requireAuth, (req, res) => {
  const words = db.prepare(`
    SELECT w.simplified, w.pinyin, w.definition
    FROM flashcard_progress fp
    JOIN cedict_words w ON w.id = fp.word_id
    WHERE fp.user_id = ?
  `).all(req.user.id)

  let csv = 'Character,Pinyin,Definition\n'
  words.forEach(w => {
    const def = w.definition.replace(/"/g, '""')
    csv += `"${w.simplified}","${w.pinyin}","${def}"\n`
  })

  res.setHeader('Content-Type', 'text/csv')
  res.setHeader('Content-Disposition', 'attachment; filename=zihai_flashcards.csv')
  res.send(csv)
})

// --- Flashcard progress & FSRS routing ---
router.get('/flashcards/due', requireAuth, (req, res) => {
  const rows = db.prepare(`
    SELECT fp.id AS progress_id, fp.stability, fp.difficulty, fp.elapsed_days, fp.scheduled_days, fp.reps, fp.lapses, fp.state, fp.next_review_date,
         fp.correct_count, fp.incorrect_count,
         w.id, w.simplified AS character, w.pinyin, w.definition AS english_definition, w.hsk_level
    FROM flashcard_progress fp
    JOIN cedict_words w ON w.id = fp.word_id
    WHERE fp.user_id = ? AND fp.next_review_date <= datetime('now')
    ORDER BY fp.next_review_date ASC
  `).all(req.user.id)
  resolveRowsBatch(rows)
  res.json(rows)
})

router.get('/flashcards/indeck/:wordId', requireAuth, (req, res) => {
  const entry = db.prepare('SELECT id FROM flashcard_progress WHERE user_id = ? AND word_id = ?').get(req.user.id, req.params.wordId)
  res.json({ inDeck: !!entry })
})

router.post('/flashcards/:wordId/init', requireAuth, (req, res) => {
  if (FLASHCARD_STATIC_ROUTES[req.params.wordId]) {
    return res.status(400).json({ error: 'Invalid word ID' })
  }
  db.prepare(`
    INSERT OR IGNORE INTO flashcard_progress (user_id, word_id, added_at, next_review_date)
    VALUES (?, ?, datetime('now'), datetime('now'))
  `).run(req.user.id, req.params.wordId)
  res.json({ message: 'Initialized' })
})

router.post('/flashcards/:wordId/add', requireAuth, (req, res) => {
  if (FLASHCARD_STATIC_ROUTES[req.params.wordId]) {
    return res.status(400).json({ error: 'Invalid word ID' })
  }
  db.prepare(`
    INSERT OR IGNORE INTO flashcard_progress (user_id, word_id, added_at, next_review_date)
    VALUES (?, ?, datetime('now'), datetime('now'))
  `).run(req.user.id, req.params.wordId)
  res.json({ message: 'Added to flashcards' })
})

router.post('/flashcards/:wordId/result', requireAuth, (req, res) => {
  const { wordId } = req.params
  const { quality } = req.body

  if (FLASHCARD_STATIC_ROUTES[wordId]) {
    return res.status(400).json({ error: 'Invalid word ID' })
  }

  if (quality === undefined || !Number.isInteger(quality) || quality < 0 || quality > 5) {
    return res.status(400).json({ error: 'Quality must be an integer between 0 and 5' })
  }

  let entry = db.prepare(`
    SELECT * FROM flashcard_progress
    WHERE user_id = ? AND word_id = ?
  `).get(req.user.id, wordId)
  
  if (!entry) {
    db.prepare(`
      INSERT INTO flashcard_progress (user_id, word_id, next_review_date) 
      VALUES (?, ?, datetime('now'))
    `).run(req.user.id, wordId)
    entry = db.prepare(`
      SELECT * FROM flashcard_progress
      WHERE user_id = ? AND word_id = ?
    `).get(req.user.id, wordId)
  }

  let rating = Rating.Again
  if (quality === 3) rating = Rating.Hard
  else if (quality === 4) rating = Rating.Good
  else if (quality === 5) rating = Rating.Easy

  const card = {
    due: new Date(entry.next_review_date + 'Z'),
    stability: entry.stability || 0,
    difficulty: entry.difficulty || 0,
    elapsed_days: entry.elapsed_days || 0,
    scheduled_days: entry.scheduled_days || 0,
    reps: entry.reps || 0,
    lapses: entry.lapses || 0,
    state: entry.state || 0,
    last_review: entry.last_review_date ? new Date(entry.last_review_date + 'Z') : undefined
  }

  const currentCard = card.state === 0 ? createEmptyCard() : card;

  const now = new Date()
  const scheduling_cards = f.repeat(currentCard, now)
  const next_card = scheduling_cards[rating].card

  const correct_count = entry.correct_count + (quality >= 3 ? 1 : 0)
  const incorrect_count = entry.incorrect_count + (quality < 3 ? 1 : 0)

  const next_due_iso = next_card.due.toISOString().slice(0, 19).replace('T', ' ')
  const now_iso = now.toISOString().slice(0, 19).replace('T', ' ')

  db.prepare(`
    UPDATE flashcard_progress
    SET stability = ?, difficulty = ?, elapsed_days = ?, scheduled_days = ?,
        reps = ?, lapses = ?, state = ?, last_review_date = ?, next_review_date = ?,
        correct_count = ?, incorrect_count = ?
    WHERE user_id = ? AND word_id = ?
  `).run(
    next_card.stability, next_card.difficulty, next_card.elapsed_days, next_card.scheduled_days,
    next_card.reps, next_card.lapses, next_card.state, now_iso, next_due_iso,
    correct_count, incorrect_count, req.user.id, wordId
  )

  db.prepare(`
    INSERT INTO review_log (user_id, word_id, correct, review_date)
    VALUES (?, ?, ?, datetime('now'))
  `).run(req.user.id, wordId, quality >= 3 ? 1 : 0)

  res.json({ message: 'Updated' })
})

router.delete('/flashcards/:wordId', requireAuth, (req, res) => {
  if (FLASHCARD_STATIC_ROUTES[req.params.wordId]) {
    return res.status(400).json({ error: 'Invalid word ID' })
  }
  db.prepare('DELETE FROM flashcard_progress WHERE user_id = ? AND word_id = ?').run(req.user.id, req.params.wordId)
  res.json({ message: 'Removed from deck' })
})

// --- Legacy Deck support ---
router.get('/decks', (req, res) => {
  try {
    const decks = db.prepare('SELECT id, name, created_at FROM decks ORDER BY created_at DESC').all()
    res.json(decks)
  } catch (err) {
    console.error('Failed to fetch decks:', err.message)
    res.status(500).json({ error: 'Failed to fetch decks' })
  }
})

router.post('/decks', (req, res) => {
  const name = (req.body.name || '').trim()
  if (!name) return res.status(400).json({ error: 'Name is required' })
  if (name.length > 200) return res.status(400).json({ error: 'Name too long' })
  try {
    const result = db.prepare('INSERT INTO decks (name) VALUES (?)').run(name)
    res.json({ id: result.lastInsertRowid, name })
  } catch (err) {
    console.error('Failed to create deck:', err.message)
    res.status(500).json({ error: 'Failed to create deck' })
  }
})

router.post('/flashcards', (req, res) => {
  const { deck_id, item_id, item_type } = req.body
  if (!deck_id || !item_id || !item_type) return res.status(400).json({ error: 'deck_id, item_id, and item_type required' })
  if (!['character', 'word'].includes(item_type)) return res.status(400).json({ error: 'item_type must be character or word' })
  try {
    db.prepare('INSERT INTO flashcards (deck_id, item_id, item_type) VALUES (?, ?, ?)').run(deck_id, item_id, item_type)
    res.json({ message: 'Flashcard added' })
  } catch (err) {
    console.error('Failed to add flashcard:', err.message)
    res.status(500).json({ error: 'Failed to add flashcard' })
  }
})

export default router
