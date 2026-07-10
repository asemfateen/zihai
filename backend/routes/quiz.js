import express from 'express'
import { db } from '../db.js'
import { requireAuth } from '../middleware/auth.js'
import { convertNumberedPinyin } from '../utils/pinyin.js'

const router = express.Router()

router.get('/quiz/generate', requireAuth, async (req, res) => {
  try {
    let words = []
    const hskLevel = parseInt(req.query.hsk, 10)

    if (!isNaN(hskLevel) && hskLevel > 0) {
      words = await db.all(`
        SELECT id, simplified as character, pinyin, definition
        FROM cedict_words
        WHERE hsk_level = $1
        ORDER BY RANDOM() LIMIT 10
      `, [hskLevel])
    } else {
      words = await db.all(`
        SELECT w.id, w.simplified as character, w.pinyin, w.definition
        FROM flashcard_progress fp
        JOIN cedict_words w ON w.id = fp.word_id
        WHERE fp.user_id = $1 AND fp.next_review_date <= CURRENT_TIMESTAMP
        ORDER BY RANDOM() LIMIT 10
      `, [req.user.id])

      if (words.length < 10) {
        const excludeIds = words.map(w => w.id);
        const extra = await db.all(`
          SELECT id, simplified as character, pinyin, definition
          FROM cedict_words
          WHERE hsk_level > 0 AND id NOT IN (${excludeIds.join(',') || '0'})
          ORDER BY RANDOM() LIMIT $1
        `, [10 - words.length])
        words = words.concat(extra)
      }
    }

    const quiz = await Promise.all(words.map(async (word) => {
      const distRows = await db.all(`
        SELECT definition FROM cedict_words
        WHERE id != $1 AND hsk_level > 0
        ORDER BY RANDOM() LIMIT 3
      `, [word.id])
      const distractors = distRows.map(d => d.definition)

      const options = [word.definition, ...distractors]
      options.sort(() => Math.random() - 0.5)

      return {
        id: word.id,
        character: word.character,
        pinyin: convertNumberedPinyin(word.pinyin),
        options,
        answer: word.definition
      }
    }))

    res.json(quiz)
  } catch (err) {
    console.error('Failed to generate quiz:', err)
    res.status(500).json({ error: 'Failed to generate quiz' })
  }
})

export default router
