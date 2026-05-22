import Database from 'better-sqlite3'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const db = new Database(path.join(__dirname, 'zihai.db'))

const data = JSON.parse(fs.readFileSync('/home/asem/assets/data/dictionary.json', 'utf8'))

const existing = db.prepare('SELECT id, character FROM words').all()
const existingSet = new Set(existing.map(r => r.character))

const insert = db.prepare(`
  INSERT INTO words (character, pinyin, english_definition, hsk_level)
  VALUES (@character, @pinyin, @english_definition, @hsk_level)
`)

let restored = 0
for (const word of data) {
  if (!existingSet.has(word.simplified)) {
    insert.run({
      character: word.simplified,
      pinyin: word.pinyin,
      english_definition: word.primaryDefinition,
      hsk_level: word.hskLevel,
    })
    restored++
  }
}

console.log(`Restored ${restored} deleted entries`)

const all = db.prepare('SELECT id, character FROM words').all()
const deleteStmt = db.prepare('DELETE FROM words WHERE id = ?')
let removed = 0

const hasEnglish = /[\u0041-\u005A\u0061-\u007A]/

for (const row of all) {
  if (hasEnglish.test(row.character)) {
    deleteStmt.run(row.id)
    removed++
  }
}

console.log(`Removed ${removed} entries with English characters in character field`)

const total = db.prepare('SELECT COUNT(*) as c FROM words').get().c
console.log(`Total words: ${total}`)

db.close()
