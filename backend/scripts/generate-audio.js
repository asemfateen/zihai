import { db, DB_PATH } from '../db.js'
import { EdgeTTS } from 'node-edge-tts'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

const TTS_CACHE_DIR = path.join(path.dirname(DB_PATH), 'tts_cache')
if (!fs.existsSync(TTS_CACHE_DIR)) {
  fs.mkdirSync(TTS_CACHE_DIR, { recursive: true })
}

const tts = new EdgeTTS({
  voice: 'zh-CN-XiaoxiaoNeural',
  lang: 'zh-CN',
  outputFormat: 'audio-24khz-96kbitrate-mono-mp3',
  rate: '-10%'
})

async function generateTTS(text) {
  const textHash = crypto.createHash('md5').update(text).digest('hex')
  const cacheFile = path.join(TTS_CACHE_DIR, `${textHash}.mp3`)

  if (fs.existsSync(cacheFile)) {
    return 'exists'
  }

  const tmpFile = path.join(TTS_CACHE_DIR, `zihai-tts-${Date.now()}-${Math.random().toString(36).slice(2)}.mp3`)
  try {
    await tts.ttsPromise(text, tmpFile)
    fs.renameSync(tmpFile, cacheFile)
    return 'generated'
  } catch (edgeErr) {
    try {
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=zh-CN&total=1&idx=0&textlen=${text.length}&client=tw-ob&prev=input`
      const response = await fetch(url, {
        headers: {
          'Referer': 'http://translate.google.com/',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        },
      })
      if (!response.ok) throw new Error(`Google TTS status: ${response.status}`)
      const buffer = await response.arrayBuffer()
      fs.writeFileSync(tmpFile, Buffer.from(buffer))
      fs.renameSync(tmpFile, cacheFile)
      return 'google-fallback'
    } catch (err) {
      if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile)
      throw err
    }
  }
}

async function run() {
  console.log('Fetching vocabulary from database...')
  const chars = db.prepare('SELECT simplified FROM characters WHERE hsk_level > 0').all()
  const words = db.prepare('SELECT simplified FROM cedict_words WHERE hsk_level > 0').all()

  const vocabSet = new Set()
  chars.forEach(c => vocabSet.add(c.simplified.trim()))
  words.forEach(w => vocabSet.add(w.simplified.trim()))
  
  const vocabList = Array.from(vocabSet).filter(Boolean)
  console.log(`Total vocabulary items found: ${vocabList.length}`)

  let completed = 0
  let generated = 0
  let skipped = 0
  let failed = 0

  const CONCURRENCY = 5
  const queue = [...vocabList]

  async function worker() {
    while (queue.length > 0) {
      const item = queue.shift()
      if (!item) continue

      try {
        const result = await generateTTS(item)
        completed++
        if (result === 'exists') skipped++
        else if (result === 'generated' || result === 'google-fallback') generated++

        if (completed % 100 === 0 || completed === vocabList.length) {
          console.log(`Progress: [${completed}/${vocabList.length}] - Generated: ${generated}, Skipped: ${skipped}, Failed: ${failed}`)
        }
      } catch (err) {
        completed++
        failed++
        console.error(`Failed to generate TTS for "${item}":`, err.message)
      }
    }
  }

  const workers = Array(CONCURRENCY).fill(null).map(() => worker())
  await Promise.all(workers)

  console.log('\n--- Batch Audio Generation Complete ---')
  console.log(`Total Processed: ${completed}`)
  console.log(`Newly Generated: ${generated}`)
  console.log(`Skipped (Cached): ${skipped}`)
  console.log(`Failed: ${failed}`)
  process.exit(0)
}

run().catch(err => {
  console.error('Fatal batch audio generator error:', err)
  process.exit(1)
})
