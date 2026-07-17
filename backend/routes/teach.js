import express from "express";
import { db } from "../db-sqlite.js";
import { EXTENDED_TEACH, extendUnitChars } from "../teach-data-extended.js";

const router = express.Router();

// ─── Hardcoded teaching data for first 45 characters (Sectors 1-3) ───

const HARDCODED_TEACH = {
  // ─── SECTOR 1 — Greetings (units 1-3) ───
  "一": {
    pinyin: "yī",
    definition: "one",
    examples: [
      { sentence: "一个", pinyin: "yī gè", translation: "one (thing)" },
      { sentence: "第一", pinyin: "dì yī", translation: "first" },
    ],
    radical: "一",
    radicalMeaning: "one",
    strokeCount: 1,
    mnemonic: "A single horizontal stroke — just like the number one."
  },
  "二": {
    pinyin: "èr",
    definition: "two",
    examples: [
      { sentence: "二十", pinyin: "èr shí", translation: "twenty" },
      { sentence: "二月", pinyin: "èr yuè", translation: "February" },
    ],
    radical: "一",
    radicalMeaning: "one",
    strokeCount: 2,
    mnemonic: "Two horizontal lines stacked — easy as 1-2."
  },
  "三": {
    pinyin: "sān",
    definition: "three",
    examples: [
      { sentence: "三十", pinyin: "sān shí", translation: "thirty" },
      { sentence: "三个", pinyin: "sān gè", translation: "three (things)" },
    ],
    radical: "一",
    radicalMeaning: "one",
    strokeCount: 3,
    mnemonic: "Three horizontal lines — one, two, three."
  },
  "大": {
    pinyin: "dà",
    definition: "big, large",
    examples: [
      { sentence: "大人", pinyin: "dà rén", translation: "adult (big person)" },
      { sentence: "大学", pinyin: "dà xué", translation: "university (big school)" },
    ],
    radical: "大",
    radicalMeaning: "big",
    strokeCount: 3,
    mnemonic: "A person (人) spreading arms wide — what's bigger than that?"
  },
  "人": {
    pinyin: "rén",
    definition: "person, people",
    examples: [
      { sentence: "中国人", pinyin: "zhōng guó rén", translation: "Chinese person" },
      { sentence: "人们", pinyin: "rén men", translation: "people" },
    ],
    radical: "人",
    radicalMeaning: "man, person",
    strokeCount: 2,
    mnemonic: "Two legs walking — a person striding forward."
  },
  "你": {
    pinyin: "nǐ",
    definition: "you (informal)",
    examples: [
      { sentence: "你好", pinyin: "nǐ hǎo", translation: "Hello (you good)" },
      { sentence: "你们", pinyin: "nǐ men", translation: "you (plural)" },
    ],
    radical: "亻",
    radicalMeaning: "person",
    strokeCount: 7,
    mnemonic: "Person (亻) + you (尔) = you (你)."
  },
  "我": {
    pinyin: "wǒ",
    definition: "I, me",
    examples: [
      { sentence: "我们", pinyin: "wǒ men", translation: "we, us" },
      { sentence: "我的", pinyin: "wǒ de", translation: "my, mine" },
    ],
    radical: "戈",
    radicalMeaning: "spear, halberd",
    strokeCount: 7,
    mnemonic: "A hand holding a spear (戈) — I defend myself."
  },
  "好": {
    pinyin: "hǎo",
    definition: "good, well",
    examples: [
      { sentence: "你好", pinyin: "nǐ hǎo", translation: "Hello" },
      { sentence: "好吃", pinyin: "hǎo chī", translation: "delicious (good eat)" },
    ],
    radical: "女",
    radicalMeaning: "woman",
    strokeCount: 6,
    mnemonic: "A woman (女) holding a child (子) — that's good."
  },
  "是": {
    pinyin: "shì",
    definition: "to be (is, am, are)",
    examples: [
      { sentence: "我是学生", pinyin: "wǒ shì xué shēng", translation: "I am a student" },
      { sentence: "是的", pinyin: "shì de", translation: "yes, correct" },
    ],
    radical: "日",
    radicalMeaning: "sun",
    strokeCount: 9,
    mnemonic: "The sun (日) shining on what IS correct."
  },
  "不": {
    pinyin: "bù",
    definition: "not, no",
    examples: [
      { sentence: "不好", pinyin: "bù hǎo", translation: "not good, bad" },
      { sentence: "不是", pinyin: "bù shì", translation: "is not" },
    ],
    radical: "一",
    radicalMeaning: "one",
    strokeCount: 4,
    mnemonic: "A negative cross — just say NO."
  },
  "了": {
    pinyin: "le",
    definition: "(grammatical particle indicating completion)",
    examples: [
      { sentence: "吃了", pinyin: "chī le", translation: "have eaten" },
      { sentence: "好了", pinyin: "hǎo le", translation: "ready, finished" },
    ],
    radical: "亅",
    radicalMeaning: "hook",
    strokeCount: 2,
    mnemonic: "A hook (亅) catching completion — it's done."
  },
  "的": {
    pinyin: "de",
    definition: "possessive particle ('s, of)",
    examples: [
      { sentence: "我的", pinyin: "wǒ de", translation: "mine" },
      { sentence: "好的", pinyin: "hǎo de", translation: "okay, good" },
    ],
    radical: "白",
    radicalMeaning: "white",
    strokeCount: 8,
    mnemonic: "White (白) + spoon (勺) — what belongs to whom."
  },
  "有": {
    pinyin: "yǒu",
    definition: "to have, there is/are",
    examples: [
      { sentence: "我有", pinyin: "wǒ yǒu", translation: "I have" },
      { sentence: "没有", pinyin: "méi yǒu", translation: "don't have, there isn't" },
    ],
    radical: "月",
    radicalMeaning: "moon, flesh",
    strokeCount: 6,
    mnemonic: "Flesh (月) + hand — to HAVE something in hand."
  },
  "在": {
    pinyin: "zài",
    definition: "at, in, on (location)",
    examples: [
      { sentence: "在家", pinyin: "zài jiā", translation: "at home" },
      { sentence: "现在", pinyin: "xiàn zài", translation: "now (present at)" },
    ],
    radical: "土",
    radicalMeaning: "earth",
    strokeCount: 6,
    mnemonic: "Earth (土) with a support — existing IN a place."
  },
  "他": {
    pinyin: "tā",
    definition: "he, him",
    examples: [
      { sentence: "他们", pinyin: "tā men", translation: "they (masculine)" },
      { sentence: "他的", pinyin: "tā de", translation: "his" },
    ],
    radical: "亻",
    radicalMeaning: "person",
    strokeCount: 5,
    mnemonic: "Person (亻) + also (也) — he is also a person."
  },

  // ─── SECTOR 2 — People & Body (units 4-6) ───
  "女": {
    pinyin: "nǚ",
    definition: "woman, female",
    examples: [
      { sentence: "女人", pinyin: "nǚ rén", translation: "woman" },
      { sentence: "女孩", pinyin: "nǚ hái", translation: "girl" },
    ],
    radical: "女",
    radicalMeaning: "woman",
    strokeCount: 3,
    mnemonic: "A woman kneeling with folded arms — graceful."
  },
  "男": {
    pinyin: "nán",
    definition: "man, male",
    examples: [
      { sentence: "男人", pinyin: "nán rén", translation: "man" },
      { sentence: "男孩", pinyin: "nán hái", translation: "boy" },
    ],
    radical: "田",
    radicalMeaning: "field",
    strokeCount: 7,
    mnemonic: "A man works in the field (田) with strength (力)."
  },
  "子": {
    pinyin: "zǐ",
    definition: "child, son",
    examples: [
      { sentence: "孩子", pinyin: "hái zi", translation: "child" },
      { sentence: "儿子", pinyin: "ér zi", translation: "son" },
    ],
    radical: "子",
    radicalMeaning: "child",
    strokeCount: 3,
    mnemonic: "A baby wrapped in swaddling clothes."
  },
  "口": {
    pinyin: "kǒu",
    definition: "mouth",
    examples: [
      { sentence: "人口", pinyin: "rén kǒu", translation: "population (person mouth)" },
      { sentence: "开口", pinyin: "kāi kǒu", translation: "to open one's mouth" },
    ],
    radical: "口",
    radicalMeaning: "mouth",
    strokeCount: 3,
    mnemonic: "An open mouth — just a square shape."
  },
  "目": {
    pinyin: "mù",
    definition: "eye",
    examples: [
      { sentence: "目前", pinyin: "mù qián", translation: "currently (before eyes)" },
      { sentence: "节目", pinyin: "jié mù", translation: "program, show (section + eye)" },
    ],
    radical: "目",
    radicalMeaning: "eye",
    strokeCount: 5,
    mnemonic: "An eye — looks like a rectangle with a pupil inside."
  },
  "手": {
    pinyin: "shǒu",
    definition: "hand",
    examples: [
      { sentence: "手机", pinyin: "shǒu jī", translation: "mobile phone (hand machine)" },
      { sentence: "手工", pinyin: "shǒu gōng", translation: "handmade" },
    ],
    radical: "手",
    radicalMeaning: "hand",
    strokeCount: 4,
    mnemonic: "A hand with five fingers branching out."
  },
  "足": {
    pinyin: "zú",
    definition: "foot, leg",
    examples: [
      { sentence: "足球", pinyin: "zú qiú", translation: "soccer (foot ball)" },
      { sentence: "不足", pinyin: "bù zú", translation: "insufficient (not enough)" },
    ],
    radical: "足",
    radicalMeaning: "foot",
    strokeCount: 7,
    mnemonic: "A leg (足) with the foot below."
  },
  "心": {
    pinyin: "xīn",
    definition: "heart, mind",
    examples: [
      { sentence: "开心", pinyin: "kāi xīn", translation: "happy (open heart)" },
      { sentence: "小心", pinyin: "xiǎo xīn", translation: "careful (small heart)" },
    ],
    radical: "心",
    radicalMeaning: "heart",
    strokeCount: 4,
    mnemonic: "A heart shape — the seat of emotions."
  },
  "头": {
    pinyin: "tóu",
    definition: "head",
    examples: [
      { sentence: "头大", pinyin: "tóu dà", translation: "head is big (troublesome)" },
      { sentence: "石头", pinyin: "shí tou", translation: "stone (rock head)" },
    ],
    radical: "大",
    radicalMeaning: "big",
    strokeCount: 5,
    mnemonic: "Big (大) dot on top — the biggest part, the head."
  },
  "耳": {
    pinyin: "ěr",
    definition: "ear",
    examples: [
      { sentence: "耳朵", pinyin: "ěr duo", translation: "ear" },
      { sentence: "耳机", pinyin: "ěr jī", translation: "headphones (ear machine)" },
    ],
    radical: "耳",
    radicalMeaning: "ear",
    strokeCount: 6,
    mnemonic: "An ear on the side of the head."
  },
  "她": {
    pinyin: "tā",
    definition: "she, her",
    examples: [
      { sentence: "她们", pinyin: "tā men", translation: "they (feminine)" },
      { sentence: "她的", pinyin: "tā de", translation: "hers" },
    ],
    radical: "女",
    radicalMeaning: "woman",
    strokeCount: 6,
    mnemonic: "Woman (女) + also (也) — she is a woman too."
  },
  "们": {
    pinyin: "men",
    definition: "(plural suffix for pronouns)",
    examples: [
      { sentence: "我们", pinyin: "wǒ men", translation: "we, us" },
      { sentence: "同学们", pinyin: "tóng xué men", translation: "classmates" },
    ],
    radical: "亻",
    radicalMeaning: "person",
    strokeCount: 5,
    mnemonic: "Person (亻) + door (门) — many people at the door."
  },
  "生": {
    pinyin: "shēng",
    definition: "life, to give birth, raw",
    examples: [
      { sentence: "学生", pinyin: "xué shēng", translation: "student (learn life)" },
      { sentence: "生活", pinyin: "shēng huó", translation: "life, living" },
    ],
    radical: "生",
    radicalMeaning: "life",
    strokeCount: 5,
    mnemonic: "A sprout growing from the earth — new life."
  },
  "老": {
    pinyin: "lǎo",
    definition: "old, aged",
    examples: [
      { sentence: "老师", pinyin: "lǎo shī", translation: "teacher (old master)" },
      { sentence: "老人", pinyin: "lǎo rén", translation: "old person" },
    ],
    radical: "老",
    radicalMeaning: "old",
    strokeCount: 6,
    mnemonic: "An old person leaning on a walking stick."
  },
  "小": {
    pinyin: "xiǎo",
    definition: "small, little",
    examples: [
      { sentence: "小孩", pinyin: "xiǎo hái", translation: "small child" },
      { sentence: "小学", pinyin: "xiǎo xué", translation: "elementary school" },
    ],
    radical: "小",
    radicalMeaning: "small",
    strokeCount: 3,
    mnemonic: "Three small dots — tiny and small."
  },

  // ─── SECTOR 3 — Nature (units 7-9) ───
  "日": {
    pinyin: "rì",
    definition: "sun, day",
    examples: [
      { sentence: "日子", pinyin: "rì zi", translation: "day, date" },
      { sentence: "生日", pinyin: "shēng rì", translation: "birthday" },
    ],
    radical: "日",
    radicalMeaning: "sun",
    strokeCount: 4,
    mnemonic: "The sun — a rectangle with a ray across the middle."
  },
  "月": {
    pinyin: "yuè",
    definition: "moon, month",
    examples: [
      { sentence: "月亮", pinyin: "yuè liàng", translation: "moon" },
      { sentence: "一月", pinyin: "yī yuè", translation: "January" },
    ],
    radical: "月",
    radicalMeaning: "moon, flesh",
    strokeCount: 4,
    mnemonic: "A crescent moon shape — two strokes inside."
  },
  "山": {
    pinyin: "shān",
    definition: "mountain",
    examples: [
      { sentence: "火山", pinyin: "huǒ shān", translation: "volcano (fire mountain)" },
      { sentence: "山上", pinyin: "shān shàng", translation: "on the mountain" },
    ],
    radical: "山",
    radicalMeaning: "mountain",
    strokeCount: 3,
    mnemonic: "Three peaks — a mountain range."
  },
  "水": {
    pinyin: "shuǐ",
    definition: "water",
    examples: [
      { sentence: "水果", pinyin: "shuǐ guǒ", translation: "fruit (water fruit)" },
      { sentence: "水", pinyin: "shuǐ", translation: "water" },
    ],
    radical: "水",
    radicalMeaning: "water",
    strokeCount: 4,
    mnemonic: "Flowing water with splashes on both sides."
  },
  "火": {
    pinyin: "huǒ",
    definition: "fire",
    examples: [
      { sentence: "火车", pinyin: "huǒ chē", translation: "train (fire vehicle)" },
      { sentence: "大火", pinyin: "dà huǒ", translation: "big fire, blaze" },
    ],
    radical: "火",
    radicalMeaning: "fire",
    strokeCount: 4,
    mnemonic: "A person with arms up — flames on both sides."
  },
  "木": {
    pinyin: "mù",
    definition: "tree, wood",
    examples: [
      { sentence: "木头", pinyin: "mù tou", translation: "wood, log" },
      { sentence: "树木", pinyin: "shù mù", translation: "trees" },
    ],
    radical: "木",
    radicalMeaning: "tree",
    strokeCount: 4,
    mnemonic: "A tree with roots below and branches above."
  },
  "金": {
    pinyin: "jīn",
    definition: "gold, metal",
    examples: [
      { sentence: "金子", pinyin: "jīn zi", translation: "gold" },
      { sentence: "金钱", pinyin: "jīn qián", translation: "money (gold + coin)" },
    ],
    radical: "金",
    radicalMeaning: "gold, metal",
    strokeCount: 8,
    mnemonic: "Gold nuggets covered by a lid — precious metal."
  },
  "土": {
    pinyin: "tǔ",
    definition: "earth, soil, land",
    examples: [
      { sentence: "土地", pinyin: "tǔ dì", translation: "land, soil" },
      { sentence: "土豆", pinyin: "tǔ dòu", translation: "potato (earth bean)" },
    ],
    radical: "土",
    radicalMeaning: "earth",
    strokeCount: 3,
    mnemonic: "Topsoil with a plant sprouting from the ground."
  },
  "天": {
    pinyin: "tiān",
    definition: "sky, heaven, day",
    examples: [
      { sentence: "今天", pinyin: "jīn tiān", translation: "today" },
      { sentence: "天气", pinyin: "tiān qì", translation: "weather (sky energy)" },
    ],
    radical: "大",
    radicalMeaning: "big",
    strokeCount: 4,
    mnemonic: "One (一) above big (大) — the great sky above."
  },
  "地": {
    pinyin: "dì",
    definition: "ground, earth, land",
    examples: [
      { sentence: "地方", pinyin: "dì fāng", translation: "place, location" },
      { sentence: "地球", pinyin: "dì qiú", translation: "earth (ground ball)" },
    ],
    radical: "土",
    radicalMeaning: "earth",
    strokeCount: 6,
    mnemonic: "Earth (土) + also (也) — the ground beneath."
  },
  "风": {
    pinyin: "fēng",
    definition: "wind",
    examples: [
      { sentence: "大风", pinyin: "dà fēng", translation: "strong wind" },
      { sentence: "风景", pinyin: "fēng jǐng", translation: "scenery (wind + view)" },
    ],
    radical: "风",
    radicalMeaning: "wind",
    strokeCount: 4,
    mnemonic: "Wind blowing through an open window."
  },
  "云": {
    pinyin: "yún",
    definition: "cloud",
    examples: [
      { sentence: "白云", pinyin: "bái yún", translation: "white cloud" },
      { sentence: "云彩", pinyin: "yún cai", translation: "cloud" },
    ],
    radical: "二",
    radicalMeaning: "two",
    strokeCount: 4,
    mnemonic: "Two lines above a cloud — floating in the sky."
  },
  "雨": {
    pinyin: "yǔ",
    definition: "rain",
    examples: [
      { sentence: "下雨", pinyin: "xià yǔ", translation: "to rain" },
      { sentence: "雨水", pinyin: "yǔ shuǐ", translation: "rainwater" },
    ],
    radical: "雨",
    radicalMeaning: "rain",
    strokeCount: 8,
    mnemonic: "Raindrops falling from a cloud above."
  },
  "花": {
    pinyin: "huā",
    definition: "flower",
    examples: [
      { sentence: "花园", pinyin: "huā yuán", translation: "garden (flower yard)" },
      { sentence: "开花", pinyin: "kāi huā", translation: "to bloom (open flower)" },
    ],
    radical: "艹",
    radicalMeaning: "grass",
    strokeCount: 7,
    mnemonic: "Grass (艹) + transformed (化) — a beautiful flower."
  },
  "草": {
    pinyin: "cǎo",
    definition: "grass",
    examples: [
      { sentence: "草地", pinyin: "cǎo dì", translation: "lawn (grass ground)" },
      { sentence: "小草", pinyin: "xiǎo cǎo", translation: "small grass" },
    ],
    radical: "艹",
    radicalMeaning: "grass",
    strokeCount: 9,
    mnemonic: "Grass (艹) + early (早) — early grass in spring."
  },
};

// Characters per sector (each sector = 15 chars)
const SECTOR_CHARS = {
  1: Object.keys(HARDCODED_TEACH).slice(0, 15),   // 一 through 他
  2: Object.keys(HARDCODED_TEACH).slice(15, 30),  // 女 through 小
  3: Object.keys(HARDCODED_TEACH).slice(30, 45),  // 日 through 草
};

// Map unit number -> sector (3 units per sector)
function unitToSector(unit) {
  if (unit >= 1 && unit <= 3) return 1;
  if (unit >= 4 && unit <= 6) return 2;
  if (unit >= 7 && unit <= 9) return 3;
  return null; // units 10-15 use DB query
}

// Map unit -> HSK level for DB-based units
function unitToHskLevel(unit) {
  if (unit <= 6) return 1;
  if (unit <= 12) return 2;
  return 3;
}

// Which position within a sector (0-4) does this unit start at?
function unitOffsetInSector(unit) {
  const base = ((unit - 1) % 3) * 5; // units 1,4,7,10,13 -> 0; 2,5,8... -> 5; 3,6,9... -> 10
  return base;
}

function getHardcodedUnit(unit) {
  const sector = unitToSector(unit);
  if (!sector) return null;
  const chars = SECTOR_CHARS[sector];
  const offset = unitOffsetInSector(unit);
  const unitChars = chars.slice(offset, offset + 5);
  if (unitChars.length === 0) return null;

  return unitChars.map((char) => {
    const data = HARDCODED_TEACH[char];
    return {
      character: char,
      pinyin: data.pinyin,
      definition: data.definition,
      examples: data.examples,
      radical: data.radical,
      radicalMeaning: data.radicalMeaning,
      strokeCount: data.strokeCount,
      mnemonic: data.mnemonic,
    };
  });
}

async function getDbUnit(unit) {
  const level = unitToHskLevel(unit);
  const wordsPerUnit = 10;
  let offset;

  if (unit <= 6) {
    offset = (unit - 1) * wordsPerUnit;
  } else if (unit <= 12) {
    offset = (unit - 7) * wordsPerUnit;
  } else {
    offset = (unit - 13) * wordsPerUnit;
  }

  const rows = db.all(
    `SELECT id, simplified AS character, pinyin, definition
     FROM cedict_words
     WHERE simplified GLOB '[一-龥]*' AND length(simplified) <= 2
     ORDER BY length(simplified) ASC, simplified ASC
     LIMIT ? OFFSET ?`,
    [wordsPerUnit, offset]
  );

  if (rows.length === 0) return [];

  return rows.map((row) => {
    // Try to find radical info from characters table
    const charInfo = db.get(
      `SELECT c.stroke_count, r.character AS rad_char, r.name AS rad_name
       FROM characters c
       LEFT JOIN radicals r ON c.radical = r.id
       WHERE c.simplified = ?`,
      [row.character]
    );

    // Try to find examples from word_examples
    const examples = db.all(
      `SELECT sentence, translation
       FROM word_examples
       WHERE word_id = ?`,
      [row.id]
    );

    const formattedExamples = examples.length > 0
      ? examples.map((ex) => ({
          sentence: ex.sentence,
          pinyin: "", // Would need a separate lookup
          translation: ex.translation,
        }))
      : [];

    // Try to get a simple compound example from cedict_words for words containing this char
    if (formattedExamples.length === 0) {
      const compound = db.get(
        `SELECT simplified, pinyin, definition
         FROM cedict_words
         WHERE simplified != ? AND simplified LIKE ?
         ORDER BY length(simplified) ASC
         LIMIT 1`,
        [row.character, `%${row.character}%`]
      );
      if (compound) {
        formattedExamples.push({
          sentence: compound.simplified,
          pinyin: compound.pinyin,
          translation: compound.definition,
        });
      }
    }

    return {
      character: row.character,
      pinyin: row.pinyin,
      definition: row.definition,
      examples: formattedExamples.length > 0 ? formattedExamples : [
        {
          sentence: row.character,
          pinyin: row.pinyin,
          translation: row.definition,
        },
      ],
      radical: charInfo?.rad_name || null,
      radicalMeaning: charInfo?.rad_name || null,
      strokeCount: charInfo?.stroke_count || null,
      mnemonic: null,
    };
  });
}

// GET /api/teach/:unit
router.get("/:unit", async (req, res) => {
  const unit = parseInt(req.params.unit, 10);
  if (isNaN(unit) || unit < 1 || unit > 15) {
    return res.status(400).json({ error: "Invalid unit. Must be between 1 and 15." });
  }

  try {
    let words;

    // Units 1-9 use hardcoded data, 10-15 use extended data first, then DB
    if (unit <= 9) {
      words = getHardcodedUnit(unit);
      if (!words) {
        return res.status(404).json({ error: "No teaching data found for this unit" });
      }
    } else {
      // Try extended hardcoded data first
      const extChars = extendUnitChars(unit);
      if (extChars && extChars.length > 0) {
        words = extChars.map((char) => {
          const data = EXTENDED_TEACH[char];
          if (!data) return null;
          return {
            character: char,
            pinyin: data.pinyin,
            definition: data.definition,
            examples: data.examples,
            radical: data.radical,
            radicalMeaning: data.radicalMeaning,
            strokeCount: data.strokeCount,
            mnemonic: data.mnemonic,
          };
        }).filter(Boolean);
      } else {
        words = await getDbUnit(unit);
      }
      if (!words || words.length === 0) {
        return res.status(404).json({ error: "No words found for this unit" });
      }
    }

    const sector = Math.ceil(unit / 3);
    const sectorNames = {
      1: "Greetings",
      2: "People & Body",
      3: "Nature",
      4: "Daily Life",
      5: "Vocabulary Builder",
    };

    const level = unitToHskLevel(unit);
    const hskLabels = { 1: "HSK 1", 2: "HSK 2", 3: "HSK 3" };

    res.json({
      unit,
      sector: sector,
      sectorName: sectorNames[sector] || `Sector ${sector}`,
      hskLevel: hskLabels[level] || `HSK ${level}`,
      words,
    });
  } catch (err) {
    console.error("Teach endpoint error:", err);
    res.status(500).json({ error: "Failed to load teaching data" });
  }
});

export default router;
