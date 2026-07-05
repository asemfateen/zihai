import express from 'express'
import { db } from '../db.js'
import { apiLimiter } from '../middleware/rateLimiter.js'
import { resolveRowsBatch, resolveDefinition, splitDefinition } from '../utils/textUtils.js'
import { convertNumberedPinyin } from '../utils/pinyin.js'

const router = express.Router()

const analyzeGetWord = db.prepare(`
  SELECT id, simplified, pinyin, definition, hsk_level, 'word' as type
  FROM cedict_words 
  WHERE simplified = ? OR traditional = ? 
  ORDER BY CASE WHEN hsk_level > 0 THEN 0 ELSE 1 END ASC, hsk_level ASC 
  LIMIT 1
`);

const analyzeGetChar = db.prepare(`
  SELECT id, simplified, pinyin, definition, hsk_level, 'char' as type
  FROM characters 
  WHERE simplified = ? OR traditional = ? 
  ORDER BY CASE WHEN hsk_level > 0 THEN 0 ELSE 1 END ASC, hsk_level ASC 
  LIMIT 1
`);

router.post('/analyze', apiLimiter, (req, res) => {
  const text = req.body.text || '';
  if (typeof text !== 'string') return res.status(400).json({ error: 'Text must be a string' });
  if (text.length > 2000) return res.status(400).json({ error: 'Text too long (max 2000 characters)' });
  if (!text.trim()) return res.json({ tokens: [] });

  try {
    const tokens = [];
    const maxLen = 6;
    let i = 0;

    while (i < text.length) {
      let matched = false;
      for (let len = maxLen; len > 0; len--) {
        if (i + len > text.length) continue;
        const substr = text.substring(i, i + len);
        
        if (len > 1 && !/[\u4e00-\u9fa5]/.test(substr)) continue;

        let row = analyzeGetWord.get(substr, substr);
        if (!row && len === 1) {
          row = analyzeGetChar.get(substr, substr);
        }

        if (row) {
          const resolvedDef = resolveDefinition(row.definition)
          tokens.push({
            text: substr,
            isChinese: true,
            id: row.id,
            type: row.type,
            pinyin: convertNumberedPinyin(row.type === 'char' ? row.pinyin.split(/[ ,/]+/)[0] : row.pinyin) || row.pinyin,
            definition: resolvedDef,
            definitions: splitDefinition(resolvedDef),
            hsk_level: row.hsk_level
          });
          i += len;
          matched = true;
          break;
        }
      }

      if (!matched) {
        const char = text[i];
        const isChinese = /[\u4e00-\u9fa5]/.test(char);
        
        if (!isChinese && tokens.length > 0 && !tokens[tokens.length - 1].isChinese) {
          tokens[tokens.length - 1].text += char;
        } else {
          tokens.push({
            text: char,
            isChinese,
            id: null,
            pinyin: null,
            definition: null,
            definitions: [],
            hsk_level: null
          });
        }
        i++;
      }
    }
    
    res.json({ tokens });
  } catch (err) {
    console.error('Analyzer error:', err);
    res.status(500).json({ error: 'Failed to analyze text' });
  }
});

router.get('/search', (req, res) => {
  const q = (typeof req.query.q === 'string' ? req.query.q : '').trim()
  if (!q) return res.json([])
  if (q.length > 50) return res.status(400).json({ error: 'Query too long' })

  const hasChinese = /[\u4e00-\u9fa5]/.test(q)
  const isAlpha = /^[A-Za-z]+$/.test(q)
  const qLower = q.toLowerCase()
  let rows = []

  try {
    if (hasChinese) {
      const pattern = q + '%'
      const ch = db.prepare(`
        SELECT id, simplified, traditional, pinyin, pinyin_flat, definition, hsk_level,
          CASE WHEN simplified = ? THEN 1 ELSE 0 END as exact_match,
          CASE WHEN definition LIKE '%variant of%' THEN 1 ELSE 0 END as is_variant
        FROM characters WHERE simplified LIKE ?
        ORDER BY is_variant, exact_match DESC, (CASE WHEN hsk_level > 0 THEN 1 ELSE 0 END) DESC, hsk_level ASC, length(simplified) ASC LIMIT 50
      `).all(q, pattern)
      const cw = db.prepare(`
        SELECT id, simplified, traditional, pinyin, pinyin_flat, definition, hsk_level,
          CASE WHEN simplified = ? THEN 1 ELSE 0 END as exact_match,
          CASE WHEN definition LIKE '%variant of%' THEN 1 ELSE 0 END as is_variant
        FROM cedict_words WHERE simplified LIKE ?
        ORDER BY is_variant, exact_match DESC, (CASE WHEN hsk_level > 0 THEN 1 ELSE 0 END) DESC, hsk_level ASC, length(simplified) ASC LIMIT 50
      `).all(q, pattern)
      rows = [...ch, ...cw]
    } else if (isAlpha) {
      const prefix = qLower + '%'
      const wildcard = '%' + qLower + '%'
      const prefixSpace = qLower + ' %'
      const prefixSemi = qLower + ';%'

      const ch = db.prepare(`
        SELECT id, simplified, traditional, pinyin, pinyin_flat, definition, hsk_level,
          CASE WHEN definition LIKE '%variant of%' THEN 1 ELSE 0 END as is_variant
        FROM characters WHERE pinyin_flat LIKE ? OR definition LIKE ?
        ORDER BY is_variant ASC,
          (CASE
            WHEN (instr(' ' || replace(replace(replace(replace(replace(pinyin, '1', ''), '2', ''), '3', ''), '4', ''), '5', '') || ' ', ' ' || ? || ' ') > 0) THEN 3
            WHEN definition = ? OR definition LIKE ? OR definition LIKE ? THEN 3
            WHEN pinyin_flat LIKE ? THEN 1
            ELSE 0
          END) DESC,
          (CASE WHEN hsk_level > 0 THEN 1 ELSE 0 END) DESC,
          hsk_level ASC,
          length(simplified) ASC
        LIMIT 50
      `).all(prefix, wildcard, qLower, qLower, prefixSpace, prefixSemi, prefix)
      const cw = db.prepare(`
        SELECT id, simplified, traditional, pinyin, pinyin_flat, definition, hsk_level,
          CASE WHEN definition LIKE '%variant of%' THEN 1 ELSE 0 END as is_variant
        FROM cedict_words WHERE pinyin_flat LIKE ? OR definition LIKE ?
        ORDER BY is_variant ASC,
          (CASE
            WHEN (instr(' ' || replace(replace(replace(replace(replace(pinyin, '1', ''), '2', ''), '3', ''), '4', ''), '5', '') || ' ', ' ' || ? || ' ') > 0) THEN 3
            WHEN definition = ? OR definition LIKE ? OR definition LIKE ? THEN 3
            WHEN pinyin_flat LIKE ? THEN 1
            ELSE 0
          END) DESC,
          (CASE WHEN hsk_level > 0 THEN 1 ELSE 0 END) DESC,
          hsk_level ASC,
          length(simplified) ASC
        LIMIT 50
      `).all(prefix, wildcard, qLower, qLower, prefixSpace, prefixSemi, prefix)
      rows = [...ch, ...cw]
    } else {
      const pattern = '%' + q + '%'
      const ch = db.prepare(`
        SELECT id, simplified, traditional, pinyin, pinyin_flat, definition, hsk_level,
          0 as exact_match,
          CASE WHEN definition LIKE '%variant of%' THEN 1 ELSE 0 END as is_variant
        FROM characters WHERE definition LIKE ?
        ORDER BY is_variant, (CASE WHEN hsk_level > 0 THEN 1 ELSE 0 END) DESC, hsk_level ASC, length(simplified) ASC LIMIT 50
      `).all(pattern)
      const cw = db.prepare(`
        SELECT id, simplified, traditional, pinyin, pinyin_flat, definition, hsk_level,
          0 as exact_match,
          CASE WHEN definition LIKE '%variant of%' THEN 1 ELSE 0 END as is_variant
        FROM cedict_words WHERE definition LIKE ?
        ORDER BY is_variant, (CASE WHEN hsk_level > 0 THEN 1 ELSE 0 END) DESC, hsk_level ASC, length(simplified) ASC LIMIT 50
      `).all(pattern)
      rows = [...ch, ...cw]
    }
  } catch (err) {
    console.error('Search query failed:', err.message)
    return res.status(500).json({ error: 'Search query failed' })
  }

  rows.forEach(r => {
    r.pinyin = convertNumberedPinyin(r.pinyin)
  })
  resolveRowsBatch(rows)
  res.json(rows)
})

router.get('/radicals', (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT r.id, r.character, r.name, COALESCE(w.cnt, 0) AS count
      FROM radicals r
      LEFT JOIN (SELECT radical, COUNT(*) AS cnt FROM characters WHERE radical IS NOT NULL GROUP BY radical) w ON w.radical = r.id
      ORDER BY w.cnt DESC NULLS LAST, r.id
    `).all()
    res.json(rows)
  } catch (err) {
    console.error('Radicals query failed:', err.message)
    return res.status(500).json({ error: 'Failed to fetch radicals' })
  }
})

router.get('/radicals/:radical', (req, res) => {
  const radical = parseInt(req.params.radical, 10)
  if (isNaN(radical) || radical < 1 || radical > 214) {
    return res.status(400).json({ error: 'Radical must be an integer between 1 and 214' })
  }
  const page = Math.max(1, parseInt(req.query.page, 10) || 1)
  const limit = Math.min(Math.max(1, parseInt(req.query.limit, 10) || 50), 100)
  const offset = (page - 1) * limit
  try {
    const radicalInfo = db.prepare('SELECT id, character, name FROM radicals WHERE id = ?').get(radical)
    if (!radicalInfo) return res.status(404).json({ error: 'Radical not found' })
    const total = db.prepare('SELECT COUNT(*) AS cnt FROM characters WHERE radical = ?').get(radical).cnt
    const words = db.prepare(`
      SELECT id, simplified, traditional, pinyin, pinyin AS pinyin_display, definition, hsk_level, radical, stroke_count
      FROM characters WHERE radical = ?
      ORDER BY (CASE WHEN hsk_level > 0 THEN 1 ELSE 0 END) DESC, hsk_level ASC, LENGTH(simplified)
      LIMIT ? OFFSET ?
    `).all(radical, limit, offset)
    words.forEach(w => {
      w.pinyin = convertNumberedPinyin(w.pinyin)
    })
    resolveRowsBatch(words)
    res.json({ radical: radicalInfo, words, total, page, limit, totalPages: Math.ceil(total / limit) })
  } catch (err) {
    console.error('Radical detail query failed:', err.message)
    return res.status(500).json({ error: 'Failed to fetch radical details' })
  }
})

router.get('/hsk/:level', (req, res) => {
  const level = parseInt(req.params.level, 10)
  if (isNaN(level) || level < 1 || level > 6) {
    return res.status(400).json({ error: 'Invalid HSK level' })
  }
  const page = Math.max(1, parseInt(req.query.page, 10) || 1)
  const limit = Math.min(Math.max(1, parseInt(req.query.limit, 10) || 50), 100)
  const offset = (page - 1) * limit
  try {
    const totalRow = db.prepare(`
      SELECT (SELECT COUNT(*) FROM characters WHERE hsk_level = ?) +
             (SELECT COUNT(*) FROM cedict_words WHERE hsk_level = ?) AS cnt
    `).get(level, level)
    const total = totalRow ? totalRow.cnt : 0

    const words = db.prepare(`
      SELECT id, character, traditional, pinyin, pinyin_display, english_definition, hsk_level, is_word
      FROM (
        SELECT id, simplified AS character, traditional, pinyin, pinyin AS pinyin_display, definition AS english_definition, hsk_level, 1 as is_word
        FROM cedict_words WHERE hsk_level = ?
        UNION ALL
        SELECT id, simplified AS character, traditional, pinyin, pinyin AS pinyin_display, definition AS english_definition, hsk_level, 0 as is_word
        FROM characters WHERE hsk_level = ?
      )
      ORDER BY length(character) ASC, character ASC
      LIMIT ? OFFSET ?
    `).all(level, level, limit, offset)

    words.forEach(w => {
      w.pinyin = convertNumberedPinyin(w.pinyin)
    })
    resolveRowsBatch(words)

    res.json({ words, total, page, limit, totalPages: Math.ceil(total / limit) })
  } catch (err) {
    console.error('HSK list query failed:', err.message)
    return res.status(500).json({ error: 'Failed to fetch HSK vocabulary' })
  }
})

router.get('/word/:query', (req, res) => {
  const { query } = req.params
  const isNumeric = /^\d+$/.test(query)
  let item

  try {
    if (isNumeric) {
      const id = parseInt(query, 10)
      item = db.prepare(`
        SELECT id, simplified AS character, traditional, pinyin, pinyin AS pinyin_display, pinyin_flat,
               definition AS english_definition, hsk_level
        FROM cedict_words WHERE id = ?
      `).get(id)
      if (!item) {
        item = db.prepare(`
          SELECT id, simplified AS character, traditional, pinyin, pinyin AS pinyin_display, pinyin_flat,
                 definition AS english_definition, hsk_level, radical, stroke_count
          FROM characters WHERE id = ?
        `).get(id)
      }
    } else {
      item = db.prepare(`
        SELECT id, simplified AS character, traditional, pinyin, pinyin AS pinyin_display, pinyin_flat,
               definition AS english_definition, hsk_level
        FROM cedict_words WHERE simplified = ?
      `).get(query)
      if (!item) {
        item = db.prepare(`
          SELECT id, simplified AS character, traditional, pinyin, pinyin AS pinyin_display, pinyin_flat,
                 definition AS english_definition, hsk_level, radical, stroke_count
          FROM characters WHERE simplified = ?
        `).get(query)
      }
    }

    if (!item) return res.status(404).json({ error: 'Word not found' })
    item = resolveRowsBatch(item)
    item.pinyin = convertNumberedPinyin(item.pinyin)
    res.json({ ...item, examples: [] })
  } catch (error) {
    console.error('Word fetch error:', error.message)
    res.status(500).json({ error: 'Database error' })
  }
})

export default router
