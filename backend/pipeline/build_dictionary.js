import Database from 'better-sqlite3'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const DATA_DIR = path.resolve(__dirname, '../data/raw')
const DB_PATH = process.env.DB_PATH || path.join(os.homedir(), 'zihai.db')
const BATCH_SIZE = 1000

const isExecute = process.argv.includes('--execute')
const isDryRun = !isExecute

function log(...args) {
  const prefix = isDryRun ? '[DRY-RUN]' : '[BUILD]'
  console.log(prefix, ...args)
}

function checkFile(filepath, label) {
  if (!fs.existsSync(filepath)) {
    console.error(`MISSING: ${label} at ${filepath}`)
    return false
  }
  return true
}

function printManualInstructions() {
  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║  MANUAL DOWNLOADS REQUIRED                                       ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  1. SUBTLEX-CH (Chinese character/word frequency)                ║
║     Download: https://osf.io/9ye5h/ (SUBTLEX-CH.zip)            ║
║     Extract: SUBTLEX-CH.xlsx → subtlex_ch.csv                   ║
║     Place at: backend/data/raw/subtlex_ch.csv                    ║
║                                                                  ║
║  2. Tatoeba Chinese-English sentence pairs                       ║
║     Download: https://downloads.tatoeba.org/exports/sentences.tar.bz2 ║
║     Or use pre-filtered JSONL (cmn+eng pairs only)               ║
║     Place at: backend/data/raw/tatoeba_cmn_eng.jsonl             ║
║     Format: {"id":1,"lang":"cmn","text":"你好"}                   ║
║             {"id":2,"lang":"eng","text":"hello","link_id":1}     ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
`)
}

function hexToChar(hex) {
  return String.fromCodePoint(parseInt(hex.replace('U+', ''), 16))
}

// ─── parseCCEDICT ──────────────────────────────────────────────
function parseCCEDICT(filepath) {
  const text = fs.readFileSync(filepath, 'utf8')
  const entries = []
  const lineRegex = /^(\S+)\s(\S+)\s\[(.+?)\]\s\/(.+)\/$/

  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (trimmed.startsWith('#') || trimmed.length === 0) continue
    const m = trimmed.match(lineRegex)
    if (!m) continue
    const simplified = m[2]
    const pinyin = m[3].toLowerCase()
      .replace(/\d/g, '')
      .replace(/u:/g, 'ü')
    const defs = m[4].split('/').filter(d => d.trim())
    const english_definition = defs.join('; ')
    entries.push({ character: simplified, pinyin: pinyin.trim(), english_definition })
  }
  log(`Parsed ${entries.length} CC-CEDICT entries`)
  return entries
}

// ─── parseUnihanIRSources ──────────────────────────────────────
function parseUnihanIRSources(filepath) {
  const metadata = {}
  const lines = fs.readFileSync(filepath, 'utf8').split('\n')
  let currentChar = null
  for (const line of lines) {
    if (line.startsWith('#') || line.trim().length === 0) continue
    const parts = line.split('\t')
    if (parts.length < 3) continue
    const hex = parts[0]
    const field = parts[1]
    const value = parts.slice(2).join('\t')
    const char = hexToChar(hex)
    if (!metadata[char]) metadata[char] = {}
    if (field === 'kRSUnicode') {
      const dotIdx = value.indexOf('.')
      if (dotIdx !== -1) {
        metadata[char].radical = parseInt(value.substring(0, dotIdx), 10)
      }
    } else if (field === 'kTotalStrokes') {
      metadata[char].stroke_count = parseInt(value, 10)
    }
  }
  const withRadical = Object.values(metadata).filter(m => m.radical).length
  const withStrokes = Object.values(metadata).filter(m => m.stroke_count).length
  log(`Unihan IR sources: ${Object.keys(metadata).length} chars, ${withRadical} with radical, ${withStrokes} with strokes`)
  return metadata
}

// ─── parseUnihanVariants ───────────────────────────────────────
function parseUnihanVariants(filepath) {
  const variants = {}
  const lines = fs.readFileSync(filepath, 'utf8').split('\n')
  for (const line of lines) {
    if (line.startsWith('#') || line.trim().length === 0) continue
    const parts = line.split('\t')
    if (parts.length < 3) continue
    const field = parts[1]
    if (field !== 'kTraditionalVariant') continue
    const simplified = hexToChar(parts[0])
    const traditional = hexToChar(parts[2])
    variants[simplified] = traditional
  }
  log(`Unihan variants: ${Object.keys(variants).length} simplified→traditional mappings`)
  return variants
}

// ─── parseOpenCC ───────────────────────────────────────────────
function parseOpenCC(charsPath, phrasesPath) {
  const mapping = {}

  const parse = (filepath) => {
    const text = fs.readFileSync(filepath, 'utf8')
    for (const line of text.split('\n')) {
      if (line.startsWith('#') || line.trim().length === 0) continue
      const parts = line.split('\t')
      if (parts.length < 2) continue
      const simplified = parts[0].trim()
      const traditional = parts[1].split(' ')[0].trim()
      mapping[simplified] = traditional
    }
  }

  parse(charsPath)
  log(`OpenCC chars: ${Object.keys(mapping).length} entries after char parse`)
  parse(phrasesPath)
  log(`OpenCC total: ${Object.keys(mapping).length} entries`)
  return mapping
}

// ─── parseSUBTLEX ──────────────────────────────────────────────
function parseSUBTLEX(filepath) {
  const freq = {}
  const text = fs.readFileSync(filepath, 'utf8')
  const lines = text.split('\n')
  const header = lines[0].toLowerCase()
  const cols = header.split(',')
  const wordIdx = cols.findIndex(c => c.includes('word') || c.includes('simp') || c.includes('char'))
  const rankIdx = cols.findIndex(c => c.includes('rank') || c.includes('freq') || c.includes('log'))
  if (wordIdx === -1 || rankIdx === -1) {
    console.error('Could not identify SUBTLEX columns. Header:', header)
    console.error('Expected columns: word/WOrd, FREQrank/frequency_rank or similar')
    return freq
  }
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    const vals = line.split(',')
    if (vals.length <= Math.max(wordIdx, rankIdx)) continue
    const word = vals[wordIdx].trim().replace(/^["']|["']$/g, '')
    const rank = parseInt(vals[rankIdx], 10)
    if (word && !isNaN(rank) && rank > 0) {
      freq[word] = rank
    }
  }
  log(`SUBTLEX: ${Object.keys(freq).length} word frequency rankings`)
  return freq
}

// ─── parseTatoeba ──────────────────────────────────────────────
function parseTatoeba(filepath) {
  const cmnMap = new Map()
  const engByLink = new Map()

  const lines = fs.readFileSync(filepath, 'utf8').split('\n')
  for (const line of lines) {
    if (!line.trim()) continue
    try {
      const entry = JSON.parse(line)
      if (entry.lang === 'cmn' && entry.text && !entry.link_id) {
        cmnMap.set(entry.id, entry.text.trim())
      } else if (entry.lang === 'eng' && entry.text && entry.link_id) {
        engByLink.set(entry.link_id, entry.text.trim())
      }
    } catch { /* skip malformed */ }
  }

  const pairs = []
  for (const [cmnId, cmnText] of cmnMap) {
    const engText = engByLink.get(cmnId)
    if (engText) {
      pairs.push({ sentence: cmnText, translation: engText })
    }
  }

  log(`Tatoeba: ${cmnMap.size} cmn sentences, ${pairs.length} paired with eng translation`)
  return pairs
}

// ─── matchExamples ─────────────────────────────────────────────
function matchExamples(words, sentencePairs, maxPerWord = 2) {
  const examples = {}
  for (const pair of sentencePairs) {
    const text = pair.sentence
    for (const word of words) {
      if (text.includes(word.character)) {
        if (!examples[word.character]) examples[word.character] = []
        if (examples[word.character].length < maxPerWord) {
          examples[word.character].push(pair)
        }
      }
    }
  }
  log(`Matched examples for ${Object.keys(examples).length} words`)
  return examples
}

// ─── enrichEntry ───────────────────────────────────────────────
function getFirstCharMeta(char, unihanMeta) {
  if (char.length === 1) return unihanMeta[char] || null
  const firstChar = char[0]
  return unihanMeta[firstChar] || null
}

function enrichEntry(entry, unihanMeta, openCCTrad, sublexFreq) {
  const result = { ...entry }
  const meta = getFirstCharMeta(entry.character, unihanMeta)
  result.radical = meta?.radical ?? null
  result.stroke_count = meta?.stroke_count ?? null
  result.traditional = null
  result.frequency_rank = sublexFreq[entry.character] ?? null
  result.example_json = null
  return result
}

// ─── addOpenCCTraditional ──────────────────────────────────────
function addOpenCCTraditional(entries, openCC) {
  for (const e of entries) {
    if (openCC[e.character]) {
      e.traditional = openCC[e.character]
    } else {
      const tradChars = e.character.split('').map(c => openCC[c] || c).join('')
      if (tradChars !== e.character) e.traditional = tradChars
    }
  }
}

// ─── main ──────────────────────────────────────────────────────
function main() {
  log('=== Zihai Dictionary Build Pipeline ===')

  // Check manual files
  const sublexPath = path.join(DATA_DIR, 'subtlex_ch.csv')
  const tatoebaPath = path.join(DATA_DIR, 'tatoeba_cmn_eng.jsonl')
  const hasSUBTLEX = checkFile(sublexPath, 'SUBTLEX-CH')
  const hasTatoeba = checkFile(tatoebaPath, 'Tatoeba')
  if (!hasSUBTLEX || !hasTatoeba) {
    printManualInstructions()
    process.exit(1)
  }

  // Auto files
  const cedictPath = path.join(DATA_DIR, 'cedict_ts.u8')
  const unihanIRPath = path.join(DATA_DIR, 'Unihan/Unihan_IRGSources.txt')
  const unihanVarPath = path.join(DATA_DIR, 'Unihan/Unihan_Variants.txt')
  const openCCChars = path.join(DATA_DIR, 'STCharacters.txt')
  const openCCPhrases = path.join(DATA_DIR, 'STPhrases.txt')

  for (const [fp, label] of [[cedictPath, 'CC-CEDICT'], [unihanIRPath, 'Unihan IR'], [unihanVarPath, 'Unihan Var'], [openCCChars, 'OpenCC Chars'], [openCCPhrases, 'OpenCC Phrases']]) {
    if (!checkFile(fp, label)) process.exit(1)
  }

  // Phase 1: Parse all sources
  log('Parsing CC-CEDICT...')
  const cedictEntries = parseCCEDICT(cedictPath)

  log('Parsing Unihan IR sources...')
  const unihanMeta = parseUnihanIRSources(unihanIRPath)

  log('Parsing Unihan variants...')
  const unihanVar = parseUnihanVariants(unihanVarPath)

  log('Parsing OpenCC...')
  const openCC = parseOpenCC(openCCChars, openCCPhrases)

  log('Parsing SUBTLEX-CH...')
  const sublexFreq = parseSUBTLEX(sublexPath)

  log('Parsing Tatoeba...')
  const sentencePairs = parseTatoeba(tatoebaPath)

  // Phase 2: Build enriched entries
  log('Building enriched entries...')
  const enriched = cedictEntries.map(e => enrichEntry(e, unihanMeta, openCC, sublexFreq))
  addOpenCCTraditional(enriched, openCC)

  // Apply Unihan variants as fallback for traditional
  for (const e of enriched) {
    if (!e.traditional) {
      const tradChars = e.character.split('').map(c => unihanVar[c] || c).join('')
      if (tradChars !== e.character) e.traditional = tradChars
    }
  }

  // Phase 3: Match Tatoeba examples
  log('Matching Tatoeba examples to entries...')
  const examplesMap = matchExamples(enriched, sentencePairs, 2)
  for (const e of enriched) {
    const ex = examplesMap[e.character]
    if (ex && ex.length > 0) {
      e.example_json = JSON.stringify(ex)
    }
  }

  // Phase 4: Database
  if (isDryRun) {
    log('DRY RUN — Database would be updated with:')
    log(`  ${enriched.length} total entries`)
    log(`  ${enriched.filter(e => e.radical).length} with radical`)
    log(`  ${enriched.filter(e => e.stroke_count).length} with stroke count`)
    log(`  ${enriched.filter(e => e.frequency_rank).length} with frequency rank`)
    log(`  ${enriched.filter(e => e.traditional).length} with traditional form`)
    log(`  ${enriched.filter(e => e.example_json).length} with example sentences`)
    const byLen = {}
    enriched.forEach(e => { const l = e.character.length; byLen[l] = (byLen[l] || 0) + 1 })
    log('Character length distribution:')
    Object.entries(byLen).sort((a, b) => a[0] - b[0]).forEach(([len, count]) => log(`  ${len} chars: ${count}`))
    log('Dry run complete. Run with --execute to build.')
    return
  }

  // -- Backup --
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupPath = path.resolve(__dirname, `../zihai.db.backup_${timestamp}`)
  log(`Backing up database to ${backupPath}...`)
  execSync(`cp "${DB_PATH}" "${backupPath}"`)

  const db = new Database(DB_PATH)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  try {
    // Pre-flight: count user data
    const userDataBefore = {
      flashcards: db.prepare('SELECT COUNT(*) as c FROM flashcard_progress').get().c,
      favorites: db.prepare('SELECT COUNT(*) as c FROM favorites').get().c,
      list_items: db.prepare('SELECT COUNT(*) as c FROM list_items').get().c,
      words: db.prepare('SELECT COUNT(*) as c FROM words').get().c,
    }
    log(`User data before: ${JSON.stringify(userDataBefore)}`)

    // Begin transaction
    const tx = db.transaction(() => {
      log('Adding new columns to words table...')
      for (const col of ['radical INTEGER', 'stroke_count INTEGER', 'traditional TEXT', 'frequency_rank INTEGER', 'example_json TEXT']) {
        try { db.exec(`ALTER TABLE words ADD COLUMN ${col}`) } catch { /* column may exist */ }
      }

      log('Dropping UNIQUE constraint on character...')
      db.exec('DROP INDEX IF EXISTS idx_words_character_unique')

      log('Creating word_examples table...')
      db.exec(`
        CREATE TABLE IF NOT EXISTS word_examples (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          word_id INTEGER NOT NULL,
          sentence TEXT NOT NULL,
          translation TEXT,
          FOREIGN KEY (word_id) REFERENCES words(id)
        )
      `)

      // Load existing words by character for quick lookup
      log('Loading existing words for enrichment...')
      const existingWords = db.prepare('SELECT id, character, pinyin, english_definition FROM words').all()
      const existingByChar = {}
      for (const w of existingWords) {
        if (!existingByChar[w.character]) existingByChar[w.character] = []
        existingByChar[w.character].push(w)
      }
      log(`Found ${existingWords.length} existing words`)

      // Update existing words with enrichment
      log('Enriching existing words with radical, stroke_count, traditional, frequency...')
      const updateExisting = db.prepare(`
        UPDATE words SET radical = ?, stroke_count = ?, traditional = ?,
          frequency_rank = ?, example_json = ?
        WHERE id = ?
      `)
      const updateManyExisting = db.transaction((batch) => {
        for (const [id, meta, trad, freq, exJson] of batch) {
          updateExisting.run(meta?.radical ?? null, meta?.stroke_count ?? null, trad ?? null, freq ?? null, exJson ?? null, id)
        }
      })

      const enrichBatch = []
      for (const w of existingWords) {
        const meta = getFirstCharMeta(w.character, unihanMeta)
        let trad = null
        if (openCC[w.character]) trad = openCC[w.character]
        else {
          const c = w.character.split('').map(ch => openCC[ch] || unihanVar[ch] || ch).join('')
          if (c !== w.character) trad = c
        }
        const freq = sublexFreq[w.character] ?? null
        const ex = examplesMap[w.character]
        const exJson = ex && ex.length > 0 ? JSON.stringify(ex.slice(0, 2)) : null
        enrichBatch.push([w.id, meta, trad, freq, exJson])
      }
      updateManyExisting(enrichBatch)
      log(`Enriched ${enrichBatch.length} existing words`)

      // Insert all CC-CEDICT entries that don't exist yet
      log('Inserting new CC-CEDICT entries...')
      const existingChars = new Set(existingWords.map(w => w.character))
      const newEntries = enriched.filter(e => !existingChars.has(e.character))

      const insertNew = db.prepare(`
        INSERT INTO words (character, pinyin, english_definition, radical, stroke_count, traditional, frequency_rank, example_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `)

      const insertBatch = db.transaction((batch) => {
        for (const e of batch) {
          insertNew.run(
            e.character, e.pinyin, e.english_definition,
            e.radical, e.stroke_count, e.traditional, e.frequency_rank, e.example_json
          )
        }
      })

      for (let i = 0; i < newEntries.length; i += BATCH_SIZE) {
        const batch = newEntries.slice(i, i + BATCH_SIZE)
        insertBatch(batch)
        if ((i / BATCH_SIZE) % 10 === 0) {
          log(`  Inserted ${Math.min(i + BATCH_SIZE, newEntries.length)} / ${newEntries.length} entries`)
        }
      }
      log(`Inserted ${newEntries.length} new CC-CEDICT entries`)

      // Create indexes
      log('Creating indexes...')
      db.exec('CREATE INDEX IF NOT EXISTS idx_words_frequency ON words(frequency_rank)')
      db.exec('CREATE INDEX IF NOT EXISTS idx_words_radical ON words(radical)')
      db.exec('CREATE INDEX IF NOT EXISTS idx_word_examples_word ON word_examples(word_id)')
      db.exec('CREATE INDEX IF NOT EXISTS idx_words_character_nonunique ON words(character)')
    })

    tx()
    log('Transaction committed successfully')

    // Post-flight verification
    const userDataAfter = {
      flashcards: db.prepare('SELECT COUNT(*) as c FROM flashcard_progress').get().c,
      favorites: db.prepare('SELECT COUNT(*) as c FROM favorites').get().c,
      list_items: db.prepare('SELECT COUNT(*) as c FROM list_items').get().c,
      words: db.prepare('SELECT COUNT(*) as c FROM words').get().c,
    }
    log(`User data after: ${JSON.stringify(userDataAfter)}`)

    // Data quality checks
    const nullChars = db.prepare('SELECT COUNT(*) as c FROM words WHERE character IS NULL').get().c
    log(`NULL characters: ${nullChars}`)
    const wordsWithRadical = db.prepare('SELECT COUNT(*) as c FROM words WHERE radical IS NOT NULL').get().c
    log(`Words with radical: ${wordsWithRadical}`)
    const wordsWithStrokes = db.prepare('SELECT COUNT(*) as c FROM words WHERE stroke_count IS NOT NULL').get().c
    log(`Words with stroke count: ${wordsWithStrokes}`)
    const wordsWithFreq = db.prepare('SELECT COUNT(*) as c FROM words WHERE frequency_rank IS NOT NULL').get().c
    log(`Words with frequency rank: ${wordsWithFreq}`)
    const wordsWithTrad = db.prepare('SELECT COUNT(*) as c FROM words WHERE traditional IS NOT NULL').get().c
    log(`Words with traditional: ${wordsWithTrad}`)
    const wordsWithExamples = db.prepare('SELECT COUNT(*) as c FROM words WHERE example_json IS NOT NULL').get().c
    log(`Words with examples: ${wordsWithExamples}`)

    // Verify user data preserved
    if (userDataAfter.flashcards !== userDataBefore.flashcards) {
      console.error('ERROR: flashcard_progress count changed!')
      process.exit(1)
    }
    if (userDataAfter.favorites !== userDataBefore.favorites) {
      console.error('ERROR: favorites count changed!')
      process.exit(1)
    }
    if (userDataAfter.list_items !== userDataBefore.list_items) {
      console.error('ERROR: list_items count changed!')
      process.exit(1)
    }

    // Spot check multi-character words
    for (const check of ['一二九运动', '图书馆', '运动', '学校', '你好']) {
      const row = db.prepare('SELECT character, length(character) as len FROM words WHERE character = ?').get(check)
      if (row) {
        log(`Spot check: "${check}" → ${row.character} (len=${row.len}) ✓`)
      } else {
        log(`Spot check: "${check}" → NOT FOUND (may not be in CC-CEDICT)`)
      }
    }

    db.close()
    log('=== BUILD COMPLETE ===')
    log(`Backup saved at: ${backupPath}`)

  } catch (err) {
    console.error('ERROR during build:', err)
    console.error('Database may be in inconsistent state. Restore from backup:')
    console.error(`  cp "${backupPath}" "${DB_PATH}"`)
    db.close()
    process.exit(1)
  }
}

main()
