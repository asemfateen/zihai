import Database from 'better-sqlite3'
import path from 'path'
import os from 'os'

const DB_PATH = process.env.DB_PATH || path.join(os.homedir(), 'zihai.db')
const db = new Database(DB_PATH)

const VARIANT_MAP = {
  '亻': '人', '忄': '心', '氵': '水', '灬': '火', '扌': '手',
  '艹': '艸', '纟': '糸', '辶': '辵', '⺮': '竹', '⺼': '肉',
  '⺌': '小', '⺍': '小', '⺈': '刀', '⺊': '卜', '⺗': '心',
  '⺳': '网', '⺀': '一', '丷': '八', '乚': '乙', '乛': '乙',
  '兀': '儿', '刁': '刀', '卤': '卜', '尣': '尤', '巛': '川',
  '巳': '己', '彑': '彐', '旡': '无', '歺': '歹', '毋': '母',
  '氺': '水', '炏': '火', '爫': '爪', '犭': '犬', '礻': '示',
  '糹': '糸', '罒': '网', '罓': '网', '羋': '羊', '耂': '老',
  '肀': '聿', '衤': '衣', '覀': '襾', '見': '見', '訁': '言',
  '讠': '言', '貝': '貝', '車': '車', '釒': '金', '钅': '金',
  '镸': '長', '門': '門', '靑': '青', '青': '青', '韋': '韋',
  '頁': '頁', '風': '風', '飛': '飛', '飠': '食', '饣': '食',
  '馬': '馬', '髟': '髟', '鬥': '鬥', '魚': '魚', '鳥': '鳥',
  '鹵': '鹵', '麥': '麥', '黃': '黄', '黄': '黄', '黽': '黾',
  '黾': '黾', '齊': '齐', '齐': '齐', '齒': '齿', '齿': '齿',
  '龍': '龙', '龙': '龙', '龜': '龟', '龟': '龟', '龠': '龠',
  '龶': '青', '㔾': '卩', '丬': '爿',
}

const radMap = new Map()
for (const row of db.prepare('SELECT id, character FROM radicals').all()) {
  radMap.set(row.character, row.id)
}

function lookupRadicalId(radChar) {
  if (!radChar) return null
  if (radMap.has(radChar)) return radMap.get(radChar)
  const canonical = VARIANT_MAP[radChar]
  if (canonical && radMap.has(canonical)) return radMap.get(canonical)
  return null
}

const updateStmt = db.prepare('UPDATE characters SET radical = ? WHERE simplified = ?')
const batch = db.transaction((entries) => {
  let count = 0
  for (const [simplified, radicalId] of entries) {
    const info = updateStmt.run(radicalId, simplified)
    if (info.changes > 0) count++
  }
  return count
})

async function main() {
  console.log('Fetching dictionary.txt from makemeahanzi...')
  const resp = await fetch('https://raw.githubusercontent.com/skishore/makemeahanzi/master/dictionary.txt')
  const text = await resp.text()
  const lines = text.split('\n').filter(Boolean)

  const entries = []
  let parseErrors = 0
  for (const line of lines) {
    try {
      const entry = JSON.parse(line)
      const simplified = entry.character
      const radChar = entry.radical
      if (!simplified || !radChar) continue
      const radicalId = lookupRadicalId(radChar)
      if (radicalId != null) {
        entries.push([simplified, radicalId])
      }
    } catch {
      parseErrors++
    }
  }

  const modified = batch(entries)
  console.log(`Parsed ${lines.length} lines (${parseErrors} parse errors)`)
  console.log(`Matched ${modified} characters to radical IDs`)
  db.close()
}

main().catch((err) => {
  console.error('Script failed:', err)
  process.exit(1)
})
