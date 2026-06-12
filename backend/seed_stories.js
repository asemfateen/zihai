import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'
import os from 'os'
import dotenv from 'dotenv'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.join(__dirname, '.env') })

const DB_PATH = process.env.DB_PATH || path.join(os.homedir(), 'zihai.db')
const db = new Database(DB_PATH)

const stories = [
  {
    title: '我的猫 (My Cat)',
    hsk_level: 1,
    content: `我有一只猫。它很小。它喜欢睡觉。
它在桌子上睡觉。它在椅子上睡觉。
我爱我的猫。`
  },
  {
    title: '去北京 (Going to Beijing)',
    hsk_level: 2,
    content: `明天我要去北京。北京很漂亮。
坐火车去北京很快。我很期待吃北京烤鸭。
你觉得北京怎么样？`
  },
  {
    title: '难忘的旅行 (An Unforgettable Trip)',
    hsk_level: 3,
    content: `去年夏天，我和家人一起去海边旅行。
那里的风景非常迷人，海水蓝蓝的。
我们每天都在沙滩上散步，吃新鲜的海鲜。
虽然天气很热，但我们玩得很开心。这真是一次难忘的旅行！`
  },
  {
    title: '科技的进步 (Advancement of Technology)',
    hsk_level: 4,
    content: `随着时代的发展，科技的进步给我们的生活带来了巨大的变化。
以前，人们交流主要靠写信，速度很慢。
现在，智能手机和互联网让沟通变得非常方便和迅速。
无论我们身在何处，都可以随时随地与朋友和家人保持联系。`
  },
  {
    title: '环境保护的重要性 (The Importance of Environmental Protection)',
    hsk_level: 5,
    content: `环境保护是当今社会面临的重大课题。随着工业化进程的加快，污染问题日益严重。
空气污染、水污染不仅影响人类的健康，也破坏了生态平衡。
为了保护我们共同的家园，每个人都应该从日常小事做起。
比如，减少使用一次性塑料制品，提倡绿色出行。只有全社会共同努力，才能实现可持续发展。`
  },
  {
    title: '庄子的智慧 (The Wisdom of Zhuangzi)',
    hsk_level: 6,
    content: `庄子是中国古代著名的哲学家，他的思想对后世产生了深远的影响。
在《庄子》一书中，充满了富有哲理的寓言故事，例如“庄周梦蝶”和“庖丁解牛”。
他提倡顺应自然，追求精神上的绝对自由。
与儒家入世的思想不同，庄子更倾向于出世，强调内心的宁静与超越。
即便在现代社会，庄子的豁达与超脱，依然能给忙碌的现代人带来深刻的启迪。`
  }
]

try {
  console.log('Seeding reading_stories...')
  const insert = db.prepare('INSERT INTO reading_stories (title, content, hsk_level) VALUES (?, ?, ?)')
  
  db.transaction(() => {
    // Clear existing stories to avoid duplicates on re-run
    db.prepare('DELETE FROM reading_stories').run()
    
    for (const story of stories) {
      insert.run(story.title, story.content, story.hsk_level)
    }
  })()
  
  console.log('Successfully seeded 6 graded stories!')
} catch (err) {
  console.error('Failed to seed stories:', err.message)
}
