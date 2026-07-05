import { db } from '../db.js'

export function sanitizeEmail(email) {
  return email.trim().toLowerCase()
}

export function sanitizeString(str) {
  if (typeof str !== 'string') return ''
  return str.replace(/[<>]/g, '').trim()
}

export function resolveDefinition(def) {
  if (!def) return def
  const match = def.trim().match(/^see\s+([^\x00-\x7F]+)(?:\|[^\x00-\x7F]+)?(?:\[[^\]]*\])?$/)
  if (match) {
    const target = match[1]
    let targetRow = db.prepare('SELECT definition FROM cedict_words WHERE simplified = ? OR traditional = ?').get(target, target)
    if (!targetRow) {
      targetRow = db.prepare('SELECT definition FROM characters WHERE simplified = ? OR traditional = ?').get(target, target)
    }
    if (targetRow && targetRow.definition && !targetRow.definition.startsWith('see ')) {
      return targetRow.definition
    }
  }
  return def
}

export function resolveRowsBatch(rows) {
  if (!rows || rows.length === 0) return rows

  const targets = new Set()
  const regex = /^see\s+([^\x00-\x7F]+)(?:\|[^\x00-\x7F]+)?(?:\[[^\]]*\])?$/

  const arr = Array.isArray(rows) ? rows : [rows]

  arr.forEach(row => {
    if (!row) return
    if (row.definition) {
      const match = row.definition.trim().match(regex)
      if (match) targets.add(match[1])
    }
    if (row.english_definition) {
      const match = row.english_definition.trim().match(regex)
      if (match) targets.add(match[1])
    }
  })

  if (targets.size === 0) return rows

  const targetsArr = Array.from(targets)
  const chunkSize = 200
  const defMap = new Map()

  for (let i = 0; i < targetsArr.length; i += chunkSize) {
    const chunk = targetsArr.slice(i, i + chunkSize)
    const placeholders = chunk.map(() => '?').join(',')

    const wordDefs = db.prepare(`SELECT simplified, traditional, definition FROM cedict_words WHERE simplified IN (${placeholders}) OR traditional IN (${placeholders})`).all(...chunk, ...chunk)
    const charDefs = db.prepare(`SELECT simplified, traditional, definition FROM characters WHERE simplified IN (${placeholders}) OR traditional IN (${placeholders})`).all(...chunk, ...chunk)

    for (const row of [...wordDefs, ...charDefs]) {
      if (row.definition && !row.definition.startsWith('see ')) {
        if (row.simplified) defMap.set(row.simplified, row.definition)
        if (row.traditional) defMap.set(row.traditional, row.definition)
      }
    }
  }

  arr.forEach(row => {
    if (!row) return
    if (row.definition) {
      const match = row.definition.trim().match(regex)
      if (match && defMap.has(match[1])) row.definition = defMap.get(match[1])
    }
    if (row.english_definition) {
      const match = row.english_definition.trim().match(regex)
      if (match && defMap.has(match[1])) row.english_definition = defMap.get(match[1])
    }
  })

  return rows
}
