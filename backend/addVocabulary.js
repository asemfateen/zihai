import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const db = new Database(path.join(__dirname, 'zihai.db'))

db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_words_character ON words(character)')

const words = [
  // Family
  { character: '爸爸', pinyin: 'ba4 ba', english_definition: 'father', hsk_level: 1 },
  { character: '妈妈', pinyin: 'ma1 ma', english_definition: 'mother', hsk_level: 1 },
  { character: '哥哥', pinyin: 'ge1 ge', english_definition: 'older brother', hsk_level: 1 },
  { character: '弟弟', pinyin: 'di4 di', english_definition: 'younger brother', hsk_level: 1 },
  { character: '姐姐', pinyin: 'jie3 jie', english_definition: 'older sister', hsk_level: 1 },
  { character: '妹妹', pinyin: 'mei4 mei', english_definition: 'younger sister', hsk_level: 1 },
  { character: '爷爷', pinyin: 'ye2 ye', english_definition: 'paternal grandfather', hsk_level: 1 },
  { character: '奶奶', pinyin: 'nai3 nai', english_definition: 'paternal grandmother', hsk_level: 1 },
  { character: '儿子', pinyin: 'er2 zi', english_definition: 'son', hsk_level: 1 },
  { character: '女儿', pinyin: 'nv3 er', english_definition: 'daughter', hsk_level: 1 },
  { character: '丈夫', pinyin: 'zhang4 fu', english_definition: 'husband', hsk_level: 3 },
  { character: '妻子', pinyin: 'qi1 zi', english_definition: 'wife', hsk_level: 3 },
  { character: '叔叔', pinyin: 'shu1 shu', english_definition: 'uncle (father younger brother)', hsk_level: 2 },
  { character: '阿姨', pinyin: 'a1 yi2', english_definition: 'aunt', hsk_level: 2 },
  { character: '表哥', pinyin: 'biao3 ge', english_definition: 'older male cousin (maternal)', hsk_level: 3 },

  // Numbers
  { character: '一', pinyin: 'yi1', english_definition: 'one', hsk_level: 1 },
  { character: '二', pinyin: 'er4', english_definition: 'two', hsk_level: 1 },
  { character: '三', pinyin: 'san1', english_definition: 'three', hsk_level: 1 },
  { character: '四', pinyin: 'si4', english_definition: 'four', hsk_level: 1 },
  { character: '五', pinyin: 'wu3', english_definition: 'five', hsk_level: 1 },
  { character: '六', pinyin: 'liu4', english_definition: 'six', hsk_level: 1 },
  { character: '七', pinyin: 'qi1', english_definition: 'seven', hsk_level: 1 },
  { character: '八', pinyin: 'ba1', english_definition: 'eight', hsk_level: 1 },
  { character: '九', pinyin: 'jiu3', english_definition: 'nine', hsk_level: 1 },
  { character: '十', pinyin: 'shi2', english_definition: 'ten', hsk_level: 1 },
  { character: '十一', pinyin: 'shi2 yi1', english_definition: 'eleven', hsk_level: 1 },
  { character: '十二', pinyin: 'shi2 er4', english_definition: 'twelve', hsk_level: 1 },
  { character: '十三', pinyin: 'shi2 san1', english_definition: 'thirteen', hsk_level: 1 },
  { character: '十四', pinyin: 'shi2 si4', english_definition: 'fourteen', hsk_level: 1 },
  { character: '十五', pinyin: 'shi2 wu3', english_definition: 'fifteen', hsk_level: 1 },
  { character: '十六', pinyin: 'shi2 liu4', english_definition: 'sixteen', hsk_level: 1 },
  { character: '十七', pinyin: 'shi2 qi1', english_definition: 'seventeen', hsk_level: 1 },
  { character: '十八', pinyin: 'shi2 ba1', english_definition: 'eighteen', hsk_level: 1 },
  { character: '十九', pinyin: 'shi2 jiu3', english_definition: 'nineteen', hsk_level: 1 },
  { character: '二十', pinyin: 'er4 shi2', english_definition: 'twenty', hsk_level: 1 },
  { character: '三十', pinyin: 'san1 shi2', english_definition: 'thirty', hsk_level: 1 },
  { character: '四十', pinyin: 'si4 shi2', english_definition: 'forty', hsk_level: 1 },
  { character: '五十', pinyin: 'wu3 shi2', english_definition: 'fifty', hsk_level: 1 },
  { character: '六十', pinyin: 'liu4 shi2', english_definition: 'sixty', hsk_level: 1 },
  { character: '七十', pinyin: 'qi1 shi2', english_definition: 'seventy', hsk_level: 1 },
  { character: '八十', pinyin: 'ba1 shi2', english_definition: 'eighty', hsk_level: 1 },
  { character: '九十', pinyin: 'jiu3 shi2', english_definition: 'ninety', hsk_level: 1 },
  { character: '一百', pinyin: 'yi1 bai3', english_definition: 'one hundred', hsk_level: 1 },
  { character: '第一', pinyin: 'di4 yi1', english_definition: 'first', hsk_level: 2 },
  { character: '第二', pinyin: 'di4 er4', english_definition: 'second', hsk_level: 2 },
  { character: '第三', pinyin: 'di4 san1', english_definition: 'third', hsk_level: 2 },

  // Colors
  { character: '红色', pinyin: 'hong2 se4', english_definition: 'red', hsk_level: 1 },
  { character: '蓝色', pinyin: 'lan2 se4', english_definition: 'blue', hsk_level: 2 },
  { character: '绿色', pinyin: 'lv4 se4', english_definition: 'green', hsk_level: 2 },
  { character: '黄色', pinyin: 'huang2 se4', english_definition: 'yellow', hsk_level: 2 },
  { character: '黑色', pinyin: 'hei1 se4', english_definition: 'black', hsk_level: 2 },
  { character: '白色', pinyin: 'bai2 se4', english_definition: 'white', hsk_level: 2 },
  { character: '橙色', pinyin: 'cheng2 se4', english_definition: 'orange', hsk_level: 3 },
  { character: '紫色', pinyin: 'zi3 se4', english_definition: 'purple', hsk_level: 3 },
  { character: '粉色', pinyin: 'fen3 se4', english_definition: 'pink', hsk_level: 3 },
  { character: '棕色', pinyin: 'zong1 se4', english_definition: 'brown', hsk_level: 3 },

  // Food & drink
  { character: '水', pinyin: 'shui3', english_definition: 'water', hsk_level: 1 },
  { character: '米饭', pinyin: 'mi3 fan4', english_definition: 'rice', hsk_level: 1 },
  { character: '面条', pinyin: 'mian4 tiao2', english_definition: 'noodles', hsk_level: 2 },
  { character: '面包', pinyin: 'mian4 bao1', english_definition: 'bread', hsk_level: 2 },
  { character: '肉', pinyin: 'rou4', english_definition: 'meat', hsk_level: 2 },
  { character: '鸡肉', pinyin: 'ji1 rou4', english_definition: 'chicken', hsk_level: 2 },
  { character: '鱼', pinyin: 'yu2', english_definition: 'fish', hsk_level: 1 },
  { character: '蔬菜', pinyin: 'shu1 cai4', english_definition: 'vegetable', hsk_level: 2 },
  { character: '水果', pinyin: 'shui3 guo3', english_definition: 'fruit', hsk_level: 1 },
  { character: '苹果', pinyin: 'ping2 guo3', english_definition: 'apple', hsk_level: 1 },
  { character: '香蕉', pinyin: 'xiang1 jiao1', english_definition: 'banana', hsk_level: 2 },
  { character: '鸡蛋', pinyin: 'ji1 dan4', english_definition: 'egg', hsk_level: 2 },
  { character: '牛奶', pinyin: 'niu2 nai3', english_definition: 'milk', hsk_level: 1 },
  { character: '茶', pinyin: 'cha2', english_definition: 'tea', hsk_level: 1 },
  { character: '咖啡', pinyin: 'ka1 fei1', english_definition: 'coffee', hsk_level: 2 },
  { character: '啤酒', pinyin: 'pi2 jiu3', english_definition: 'beer', hsk_level: 2 },
  { character: '汤', pinyin: 'tang1', english_definition: 'soup', hsk_level: 2 },

  // Body parts
  { character: '头', pinyin: 'tou2', english_definition: 'head', hsk_level: 2 },
  { character: '眼睛', pinyin: 'yan3 jing', english_definition: 'eye', hsk_level: 1 },
  { character: '耳朵', pinyin: 'er3 duo', english_definition: 'ear', hsk_level: 2 },
  { character: '鼻子', pinyin: 'bi2 zi', english_definition: 'nose', hsk_level: 2 },
  { character: '嘴', pinyin: 'zui3', english_definition: 'mouth', hsk_level: 2 },
  { character: '手', pinyin: 'shou3', english_definition: 'hand', hsk_level: 1 },
  { character: '脚', pinyin: 'jiao3', english_definition: 'foot', hsk_level: 2 },
  { character: '胳膊', pinyin: 'ge1 bo', english_definition: 'arm', hsk_level: 3 },
  { character: '腿', pinyin: 'tui3', english_definition: 'leg', hsk_level: 2 },
  { character: '心', pinyin: 'xin1', english_definition: 'heart', hsk_level: 3 },
  { character: '背', pinyin: 'bei4', english_definition: 'back', hsk_level: 3 },
  { character: '手指', pinyin: 'shou3 zhi3', english_definition: 'finger', hsk_level: 3 },

  // Common verbs
  { character: '吃', pinyin: 'chi1', english_definition: 'eat', hsk_level: 1 },
  { character: '喝', pinyin: 'he1', english_definition: 'drink', hsk_level: 1 },
  { character: '睡觉', pinyin: 'shui4 jiao4', english_definition: 'sleep', hsk_level: 1 },
  { character: '走', pinyin: 'zou3', english_definition: 'walk', hsk_level: 1 },
  { character: '跑', pinyin: 'pao3', english_definition: 'run', hsk_level: 2 },
  { character: '说', pinyin: 'shuo1', english_definition: 'speak', hsk_level: 1 },
  { character: '听', pinyin: 'ting1', english_definition: 'listen', hsk_level: 1 },
  { character: '读', pinyin: 'du2', english_definition: 'read', hsk_level: 1 },
  { character: '写', pinyin: 'xie3', english_definition: 'write', hsk_level: 1 },
  { character: '买', pinyin: 'mai3', english_definition: 'buy', hsk_level: 1 },
  { character: '卖', pinyin: 'mai4', english_definition: 'sell', hsk_level: 2 },
  { character: '去', pinyin: 'qu4', english_definition: 'go', hsk_level: 1 },
  { character: '来', pinyin: 'lai2', english_definition: 'come', hsk_level: 1 },
  { character: '坐', pinyin: 'zuo4', english_definition: 'sit', hsk_level: 1 },
  { character: '站', pinyin: 'zhan4', english_definition: 'stand', hsk_level: 2 },
  { character: '打开', pinyin: 'da3 kai1', english_definition: 'open', hsk_level: 2 },
  { character: '关上', pinyin: 'guan1 shang4', english_definition: 'close', hsk_level: 2 },
  { character: '爱', pinyin: 'ai4', english_definition: 'love', hsk_level: 1 },
  { character: '讨厌', pinyin: 'tao3 yan4', english_definition: 'hate', hsk_level: 3 },
  { character: '想要', pinyin: 'xiang3 yao4', english_definition: 'want', hsk_level: 2 },
  { character: '需要', pinyin: 'xu1 yao4', english_definition: 'need', hsk_level: 2 },
  { character: '知道', pinyin: 'zhi1 dao', english_definition: 'know', hsk_level: 1 },
  { character: '想', pinyin: 'xiang3', english_definition: 'think', hsk_level: 1 },
  { character: '看', pinyin: 'kan4', english_definition: 'see', hsk_level: 1 },
  { character: '听见', pinyin: 'ting1 jian4', english_definition: 'hear', hsk_level: 2 },

  // Time
  { character: '今天', pinyin: 'jin1 tian1', english_definition: 'today', hsk_level: 1 },
  { character: '明天', pinyin: 'ming2 tian1', english_definition: 'tomorrow', hsk_level: 1 },
  { character: '昨天', pinyin: 'zuo2 tian1', english_definition: 'yesterday', hsk_level: 1 },
  { character: '早上', pinyin: 'zao3 shang', english_definition: 'morning', hsk_level: 1 },
  { character: '下午', pinyin: 'xia4 wu3', english_definition: 'afternoon', hsk_level: 1 },
  { character: '晚上', pinyin: 'wan3 shang', english_definition: 'evening', hsk_level: 1 },
  { character: '夜', pinyin: 'ye4', english_definition: 'night', hsk_level: 2 },
  { character: '星期', pinyin: 'xing1 qi1', english_definition: 'week', hsk_level: 1 },
  { character: '月', pinyin: 'yue4', english_definition: 'month', hsk_level: 1 },
  { character: '年', pinyin: 'nian2', english_definition: 'year', hsk_level: 1 },
  { character: '小时', pinyin: 'xiao3 shi2', english_definition: 'hour', hsk_level: 1 },
  { character: '分钟', pinyin: 'fen1 zhong1', english_definition: 'minute', hsk_level: 2 },
  { character: '现在', pinyin: 'xian4 zai4', english_definition: 'now', hsk_level: 1 },

  // Places
  { character: '家', pinyin: 'jia1', english_definition: 'home', hsk_level: 1 },
  { character: '学校', pinyin: 'xue2 xiao4', english_definition: 'school', hsk_level: 1 },
  { character: '医院', pinyin: 'yi1 yuan4', english_definition: 'hospital', hsk_level: 2 },
  { character: '餐厅', pinyin: 'can1 ting1', english_definition: 'restaurant', hsk_level: 2 },
  { character: '商店', pinyin: 'shang1 dian4', english_definition: 'shop', hsk_level: 2 },
  { character: '城市', pinyin: 'cheng2 shi4', english_definition: 'city', hsk_level: 2 },
  { character: '国家', pinyin: 'guo2 jia1', english_definition: 'country', hsk_level: 1 },
  { character: '路', pinyin: 'lu4', english_definition: 'road', hsk_level: 2 },
  { character: '机场', pinyin: 'ji1 chang3', english_definition: 'airport', hsk_level: 2 },
  { character: '酒店', pinyin: 'jiu3 dian4', english_definition: 'hotel', hsk_level: 2 },

  // Weather
  { character: '太阳', pinyin: 'tai4 yang2', english_definition: 'sun', hsk_level: 2 },
  { character: '雨', pinyin: 'yu3', english_definition: 'rain', hsk_level: 1 },
  { character: '风', pinyin: 'feng1', english_definition: 'wind', hsk_level: 2 },
  { character: '雪', pinyin: 'xue3', english_definition: 'snow', hsk_level: 2 },
  { character: '云', pinyin: 'yun2', english_definition: 'cloud', hsk_level: 2 },
  { character: '热', pinyin: 're4', english_definition: 'hot', hsk_level: 1 },
  { character: '冷', pinyin: 'leng3', english_definition: 'cold', hsk_level: 1 },
  { character: '暖和', pinyin: 'nuan3 huo', english_definition: 'warm', hsk_level: 3 },

  // Common adjectives
  { character: '大', pinyin: 'da4', english_definition: 'big', hsk_level: 1 },
  { character: '小', pinyin: 'xiao3', english_definition: 'small', hsk_level: 1 },
  { character: '高', pinyin: 'gao1', english_definition: 'tall', hsk_level: 1 },
  { character: '矮', pinyin: 'ai3', english_definition: 'short', hsk_level: 2 },
  { character: '快', pinyin: 'kuai4', english_definition: 'fast', hsk_level: 1 },
  { character: '慢', pinyin: 'man4', english_definition: 'slow', hsk_level: 2 },
  { character: '好', pinyin: 'hao3', english_definition: 'good', hsk_level: 1 },
  { character: '坏', pinyin: 'huai4', english_definition: 'bad', hsk_level: 2 },
  { character: '漂亮', pinyin: 'piao4 liang', english_definition: 'beautiful', hsk_level: 1 },
  { character: '丑', pinyin: 'chou3', english_definition: 'ugly', hsk_level: 3 },
  { character: '新', pinyin: 'xin1', english_definition: 'new', hsk_level: 1 },
  { character: '旧', pinyin: 'jiu4', english_definition: 'old (thing)', hsk_level: 2 },
  { character: '高兴', pinyin: 'gao1 xing4', english_definition: 'happy', hsk_level: 1 },
  { character: '难过', pinyin: 'nan2 guo4', english_definition: 'sad', hsk_level: 2 },
  { character: '累', pinyin: 'lei4', english_definition: 'tired', hsk_level: 2 },
  { character: '饿', pinyin: 'e4', english_definition: 'hungry', hsk_level: 2 },
  { character: '渴', pinyin: 'ke3', english_definition: 'thirsty', hsk_level: 2 },

  // Greetings & phrases
  { character: '你好', pinyin: 'ni3 hao3', english_definition: 'hello', hsk_level: 1 },
  { character: '再见', pinyin: 'zai4 jian4', english_definition: 'goodbye', hsk_level: 1 },
  { character: '谢谢', pinyin: 'xie4 xie', english_definition: 'thank you', hsk_level: 1 },
  { character: '对不起', pinyin: 'dui4 bu4 qi3', english_definition: 'sorry', hsk_level: 1 },
  { character: '是', pinyin: 'shi4', english_definition: 'yes', hsk_level: 1 },
  { character: '不', pinyin: 'bu4', english_definition: 'no', hsk_level: 1 },
  { character: '请', pinyin: 'qing3', english_definition: 'please', hsk_level: 1 },
  { character: '帮助', pinyin: 'bang1 zhu4', english_definition: 'help', hsk_level: 1 },
  { character: '欢迎', pinyin: 'huan1 ying2', english_definition: 'welcome', hsk_level: 2 },
]

const insert = db.prepare(`
  INSERT INTO words (character, pinyin, english_definition, hsk_level)
  VALUES (@character, @pinyin, @english_definition, @hsk_level)
  ON CONFLICT(character) DO NOTHING
`)

const insertMany = db.transaction((words) => {
  for (const word of words) {
    insert.run(word)
  }
})

insertMany(words)

console.log(`Inserted ${words.length} new words into zihai.db`)

db.close()
