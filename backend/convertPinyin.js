import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const toneMap = {
  a: ['ā', 'á', 'ǎ', 'à'],
  e: ['ē', 'é', 'ě', 'è'],
  i: ['ī', 'í', 'ǐ', 'ì'],
  o: ['ō', 'ó', 'ǒ', 'ò'],
  u: ['ū', 'ú', 'ǔ', 'ù'],
  v: ['ǖ', 'ǘ', 'ǚ', 'ǜ'],
}

const vowelOrder = ['a', 'e', 'o', 'i', 'u', 'v']

function convertSyllable(syllable) {
  const match = syllable.match(/^([a-zv]*)(\d)(.*)$/)
  if (!match) return syllable

  const prefix = match[1]
  const tone = parseInt(match[2])
  const suffix = match[3]

  if (tone === 5 || tone === 0) return prefix + suffix

  for (const v of vowelOrder) {
    if (prefix.includes(v)) {
      const idx = prefix.lastIndexOf(v)
      return prefix.slice(0, idx) + toneMap[v][tone - 1] + prefix.slice(idx + 1) + suffix
    }
  }

  return syllable
}

function convertPinyin(pinyin) {
  return pinyin
    .split(' ')
    .map(s => convertSyllable(s))
    .join(' ')
}

const db = new Database(path.join(__dirname, 'zihai.db'))

const rows = db.prepare('SELECT id, pinyin FROM words').all()
const update = db.prepare('UPDATE words SET pinyin = ? WHERE id = ?')

const updateMany = db.transaction((rows) => {
  for (const row of rows) {
    const converted = convertPinyin(row.pinyin)
    update.run(converted, row.id)
  }
})

updateMany(rows)

console.log(`Converted pinyin for ${rows.length} words`)

const sample = db.prepare('SELECT character, pinyin FROM words LIMIT 10').all()
sample.forEach(r => console.log(`${r.character} -> ${r.pinyin}`))

db.close()
