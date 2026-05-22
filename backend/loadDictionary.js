import Database from 'better-sqlite3'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const dbPath = path.join(__dirname, 'zihai.db')
const jsonPath = '/home/asem/assets/data/dictionary.json'

const db = new Database(dbPath)

db.exec(`
  CREATE TABLE IF NOT EXISTS words (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    character TEXT UNIQUE NOT NULL,
    pinyin TEXT NOT NULL,
    english_definition TEXT NOT NULL,
    hsk_level INTEGER
  )
`)

let data
try {
  data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'))
} catch (err) {
  console.error(`Failed to read or parse dictionary file at ${jsonPath}:`, err.message)
  process.exit(1)
}

const insert = db.prepare(`
  INSERT INTO words (character, pinyin, english_definition, hsk_level)
  VALUES (@character, @pinyin, @english_definition, @hsk_level)
`)

const insertMany = db.transaction((words) => {
  for (const word of words) {
    insert.run({
      character: word.simplified,
      pinyin: word.pinyin,
      english_definition: word.primaryDefinition,
      hsk_level: word.hskLevel,
    })
  }
})

insertMany(data)

console.log(`Inserted ${data.length} words into zihai.db`)

db.close()
