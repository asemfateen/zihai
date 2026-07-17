// Seed teaching data for Zihai Sectors 1-3
// 45 characters across 15 units (3 per unit)
// Each entry: character, pinyin, tone, definition, radical, strokeCount, mnemonic, examples

export const teachData = {
  // ===== SECTOR 1 — The Basics (Units 1-5) =====

  1: [
    {
      character: "一",
      pinyin: "yī",
      tone: 1,
      definition: "one",
      radical: { character: "一", name: "one/horizontal" },
      strokeCount: 1,
      mnemonic: "A single horizontal line = one.",
      examples: [
        { sentence: "一个人", pinyin: "yī gè rén", translation: "one person" },
        { sentence: "第一", pinyin: "dì yī", translation: "first" }
      ]
    },
    {
      character: "二",
      pinyin: "èr",
      tone: 4,
      definition: "two",
      radical: { character: "一", name: "one/horizontal" },
      strokeCount: 2,
      mnemonic: "Two horizontal lines stacked = two.",
      examples: [
        { sentence: "二月", pinyin: "èr yuè", translation: "February" },
        { sentence: "第二", pinyin: "dì èr", translation: "second" }
      ]
    },
    {
      character: "三",
      pinyin: "sān",
      tone: 1,
      definition: "three",
      radical: { character: "一", name: "one/horizontal" },
      strokeCount: 3,
      mnemonic: "Three horizontal lines stacked = three.",
      examples: [
        { sentence: "三个", pinyin: "sān gè", translation: "three (things)" },
        { sentence: "三月", pinyin: "sān yuè", translation: "March" }
      ]
    }
  ],

  2: [
    {
      character: "大",
      pinyin: "dà",
      tone: 4,
      definition: "big, large",
      radical: { character: "大", name: "big" },
      strokeCount: 3,
      mnemonic: "A person (人) stretching arms wide = big.",
      examples: [
        { sentence: "大人", pinyin: "dà rén", translation: "adult" },
        { sentence: "大学", pinyin: "dà xué", translation: "university" }
      ]
    },
    {
      character: "人",
      pinyin: "rén",
      tone: 2,
      definition: "person, people",
      radical: { character: "人", name: "person" },
      strokeCount: 2,
      mnemonic: "Two legs walking — a person.",
      examples: [
        { sentence: "中国人", pinyin: "Zhōngguó rén", translation: "Chinese person" },
        { sentence: "大人", pinyin: "dà rén", translation: "adult" }
      ]
    },
    {
      character: "不",
      pinyin: "bù",
      tone: 4,
      definition: "not, no",
      radical: { character: "一", name: "one/horizontal" },
      strokeCount: 4,
      mnemonic: "A line with a downstroke stopping it = not.",
      examples: [
        { sentence: "不是", pinyin: "bù shì", translation: "is not" },
        { sentence: "不好", pinyin: "bù hǎo", translation: "not good" }
      ]
    }
  ],

  3: [
    {
      character: "你",
      pinyin: "nǐ",
      tone: 3,
      definition: "you",
      radical: { character: "亻", name: "person (radical)" },
      strokeCount: 7,
      mnemonic: "A person (亻) next to you = you.",
      examples: [
        { sentence: "你好", pinyin: "nǐ hǎo", translation: "hello" },
        { sentence: "你们", pinyin: "nǐ men", translation: "you all" }
      ]
    },
    {
      character: "我",
      pinyin: "wǒ",
      tone: 3,
      definition: "I, me",
      radical: { character: "戈", name: "halberd/spear" },
      strokeCount: 7,
      mnemonic: "A hand holding a spear (戈) = I defend myself.",
      examples: [
        { sentence: "我们", pinyin: "wǒ men", translation: "we" },
        { sentence: "我的", pinyin: "wǒ de", translation: "my / mine" }
      ]
    },
    {
      character: "好",
      pinyin: "hǎo",
      tone: 3,
      definition: "good, well",
      radical: { character: "女", name: "woman" },
      strokeCount: 6,
      mnemonic: "A woman (女) with a child (子) = good family.",
      examples: [
        { sentence: "你好", pinyin: "nǐ hǎo", translation: "hello" },
        { sentence: "很好", pinyin: "hěn hǎo", translation: "very good" }
      ]
    }
  ],

  4: [
    {
      character: "是",
      pinyin: "shì",
      tone: 4,
      definition: "to be, is, am, are",
      radical: { character: "日", name: "sun" },
      strokeCount: 9,
      mnemonic: "The sun (日) on what's correct (正) = is.",
      examples: [
        { sentence: "是的", pinyin: "shì de", translation: "yes / correct" },
        { sentence: "是不是", pinyin: "shì bù shì", translation: "is it or not?" }
      ]
    },
    {
      character: "有",
      pinyin: "yǒu",
      tone: 3,
      definition: "to have, there is/are",
      radical: { character: "月", name: "moon/meat" },
      strokeCount: 6,
      mnemonic: "A hand holding meat (月) = to have.",
      examples: [
        { sentence: "没有", pinyin: "méi yǒu", translation: "don't have" },
        { sentence: "有人", pinyin: "yǒu rén", translation: "there is someone" }
      ]
    },
    {
      character: "在",
      pinyin: "zài",
      tone: 4,
      definition: "at, in, on; (doing)",
      radical: { character: "土", name: "earth" },
      strokeCount: 6,
      mnemonic: "A plant rooted in earth (土) = being at.",
      examples: [
        { sentence: "现在", pinyin: "xiàn zài", translation: "now" },
        { sentence: "在家", pinyin: "zài jiā", translation: "at home" }
      ]
    }
  ],

  5: [
    {
      character: "他",
      pinyin: "tā",
      tone: 1,
      definition: "he, him",
      radical: { character: "亻", name: "person (radical)" },
      strokeCount: 5,
      mnemonic: "A person (亻) who is also there = he.",
      examples: [
        { sentence: "他们", pinyin: "tā men", translation: "they" },
        { sentence: "他的", pinyin: "tā de", translation: "his" }
      ]
    },
    {
      character: "的",
      pinyin: "de",
      tone: 0,
      definition: "possessive particle ('s)",
      radical: { character: "白", name: "white" },
      strokeCount: 8,
      mnemonic: "A white (白) dot connects owner to thing.",
      examples: [
        { sentence: "我的", pinyin: "wǒ de", translation: "my / mine" },
        { sentence: "好的", pinyin: "hǎo de", translation: "okay / good" }
      ]
    },
    {
      character: "了",
      pinyin: "le",
      tone: 0,
      definition: "completed action particle",
      radical: { character: "乛", name: "second/hook" },
      strokeCount: 2,
      mnemonic: "A hook that catches completion = done!",
      examples: [
        { sentence: "好了", pinyin: "hǎo le", translation: "it's finished / ready" },
        { sentence: "吃了", pinyin: "chī le", translation: "ate (already)" }
      ]
    }
  ],

  // ===== SECTOR 2 — People & Body (Units 6-10) =====

  6: [
    {
      character: "女",
      pinyin: "nǚ",
      tone: 3,
      definition: "woman, female",
      radical: { character: "女", name: "woman" },
      strokeCount: 3,
      mnemonic: "A kneeling woman with folded arms.",
      examples: [
        { sentence: "女人", pinyin: "nǚ rén", translation: "woman" },
        { sentence: "女儿", pinyin: "nǚ ér", translation: "daughter" }
      ]
    },
    {
      character: "男",
      pinyin: "nán",
      tone: 2,
      definition: "man, male",
      radical: { character: "田", name: "field" },
      strokeCount: 7,
      mnemonic: "Strength (力) in the field (田) = man.",
      examples: [
        { sentence: "男人", pinyin: "nán rén", translation: "man" },
        { sentence: "男生", pinyin: "nán shēng", translation: "male student" }
      ]
    },
    {
      character: "子",
      pinyin: "zǐ",
      tone: 3,
      definition: "child, son",
      radical: { character: "子", name: "child" },
      strokeCount: 3,
      mnemonic: "A baby wrapped in a blanket, arms out.",
      examples: [
        { sentence: "儿子", pinyin: "ér zi", translation: "son" },
        { sentence: "孩子", pinyin: "hái zi", translation: "child" }
      ]
    }
  ],

  7: [
    {
      character: "口",
      pinyin: "kǒu",
      tone: 3,
      definition: "mouth",
      radical: { character: "口", name: "mouth" },
      strokeCount: 3,
      mnemonic: "An open mouth — a square frame.",
      examples: [
        { sentence: "门口", pinyin: "mén kǒu", translation: "doorway / entrance" },
        { sentence: "人口", pinyin: "rén kǒu", translation: "population" }
      ]
    },
    {
      character: "目",
      pinyin: "mù",
      tone: 4,
      definition: "eye",
      radical: { character: "目", name: "eye" },
      strokeCount: 5,
      mnemonic: "An eye — the vertical lines are the pupil.",
      examples: [
        { sentence: "目前", pinyin: "mù qián", translation: "currently" },
        { sentence: "节目", pinyin: "jié mù", translation: "program / show" }
      ]
    },
    {
      character: "手",
      pinyin: "shǒu",
      tone: 3,
      definition: "hand",
      radical: { character: "手", name: "hand" },
      strokeCount: 4,
      mnemonic: "A hand with fingers and a palm.",
      examples: [
        { sentence: "手机", pinyin: "shǒu jī", translation: "cell phone" },
        { sentence: "一手", pinyin: "yī shǒu", translation: "by oneself / a handful" }
      ]
    }
  ],

  8: [
    {
      character: "心",
      pinyin: "xīn",
      tone: 1,
      definition: "heart",
      radical: { character: "心", name: "heart" },
      strokeCount: 4,
      mnemonic: "A heart with chambers and valves.",
      examples: [
        { sentence: "开心", pinyin: "kāi xīn", translation: "happy" },
        { sentence: "心情", pinyin: "xīn qíng", translation: "mood" }
      ]
    },
    {
      character: "头",
      pinyin: "tóu",
      tone: 2,
      definition: "head",
      radical: { character: "大", name: "big" },
      strokeCount: 5,
      mnemonic: "A big (大) dot (丶) on top = head.",
      examples: [
        { sentence: "头大", pinyin: "tóu dà", translation: "big head / headache" },
        { sentence: "石头", pinyin: "shí tou", translation: "stone" }
      ]
    },
    {
      character: "足",
      pinyin: "zú",
      tone: 2,
      definition: "foot",
      radical: { character: "足", name: "foot" },
      strokeCount: 7,
      mnemonic: "A foot with toes (口) and a heel (止).",
      examples: [
        { sentence: "足球", pinyin: "zú qiú", translation: "soccer" },
        { sentence: "十足", pinyin: "shí zú", translation: "one hundred percent" }
      ]
    }
  ],

  9: [
    {
      character: "她",
      pinyin: "tā",
      tone: 1,
      definition: "she, her",
      radical: { character: "女", name: "woman" },
      strokeCount: 6,
      mnemonic: "A woman (女) who is also there = she.",
      examples: [
        { sentence: "她们", pinyin: "tā men", translation: "they (female)" },
        { sentence: "她的", pinyin: "tā de", translation: "her / hers" }
      ]
    },
    {
      character: "们",
      pinyin: "men",
      tone: 0,
      definition: "plural marker for people",
      radical: { character: "亻", name: "person (radical)" },
      strokeCount: 5,
      mnemonic: "People (亻) at the door (门) = many people.",
      examples: [
        { sentence: "我们", pinyin: "wǒ men", translation: "we" },
        { sentence: "你们", pinyin: "nǐ men", translation: "you all" }
      ]
    },
    {
      character: "生",
      pinyin: "shēng",
      tone: 1,
      definition: "life, birth, living",
      radical: { character: "生", name: "life/birth" },
      strokeCount: 5,
      mnemonic: "A plant sprouting from the ground = life.",
      examples: [
        { sentence: "学生", pinyin: "xué shēng", translation: "student" },
        { sentence: "生活", pinyin: "shēng huó", translation: "life / living" }
      ]
    }
  ],

  10: [
    {
      character: "老",
      pinyin: "lǎo",
      tone: 3,
      definition: "old, aged",
      radical: { character: "耂", name: "old (radical)" },
      strokeCount: 6,
      mnemonic: "An old person leaning on a walking stick.",
      examples: [
        { sentence: "老师", pinyin: "lǎo shī", translation: "teacher" },
        { sentence: "老人", pinyin: "lǎo rén", translation: "old person" }
      ]
    },
    {
      character: "小",
      pinyin: "xiǎo",
      tone: 3,
      definition: "small, little",
      radical: { character: "小", name: "small" },
      strokeCount: 3,
      mnemonic: "Three small drops — something tiny.",
      examples: [
        { sentence: "小学", pinyin: "xiǎo xué", translation: "elementary school" },
        { sentence: "大小", pinyin: "dà xiǎo", translation: "size" }
      ]
    },
    {
      character: "耳",
      pinyin: "ěr",
      tone: 3,
      definition: "ear",
      radical: { character: "耳", name: "ear" },
      strokeCount: 6,
      mnemonic: "A side view of an ear with inner curves.",
      examples: [
        { sentence: "耳朵", pinyin: "ěr duo", translation: "ear" },
        { sentence: "木耳", pinyin: "mù ěr", translation: "wood ear mushroom" }
      ]
    }
  ],

  // ===== SECTOR 3 — Nature (Units 11-15) =====

  11: [
    {
      character: "日",
      pinyin: "rì",
      tone: 4,
      definition: "sun, day",
      radical: { character: "日", name: "sun" },
      strokeCount: 4,
      mnemonic: "The sun — a rectangle with a horizontal cloud band.",
      examples: [
        { sentence: "日子", pinyin: "rì zi", translation: "days / daily life" },
        { sentence: "生日", pinyin: "shēng rì", translation: "birthday" }
      ]
    },
    {
      character: "月",
      pinyin: "yuè",
      tone: 4,
      definition: "moon, month",
      radical: { character: "月", name: "moon/meat" },
      strokeCount: 4,
      mnemonic: "A crescent moon shape.",
      examples: [
        { sentence: "月亮", pinyin: "yuè liang", translation: "moon" },
        { sentence: "一月", pinyin: "yī yuè", translation: "January" }
      ]
    },
    {
      character: "山",
      pinyin: "shān",
      tone: 1,
      definition: "mountain, hill",
      radical: { character: "山", name: "mountain" },
      strokeCount: 3,
      mnemonic: "Three mountain peaks together.",
      examples: [
        { sentence: "山水", pinyin: "shān shuǐ", translation: "landscape" },
        { sentence: "上山", pinyin: "shàng shān", translation: "go up the mountain" }
      ]
    }
  ],

  12: [
    {
      character: "水",
      pinyin: "shuǐ",
      tone: 3,
      definition: "water",
      radical: { character: "水", name: "water" },
      strokeCount: 4,
      mnemonic: "Flowing water with splashes on both sides.",
      examples: [
        { sentence: "水果", pinyin: "shuǐ guǒ", translation: "fruit" },
        { sentence: "口水", pinyin: "kǒu shuǐ", translation: "saliva / mouth-watering" }
      ]
    },
    {
      character: "火",
      pinyin: "huǒ",
      tone: 3,
      definition: "fire",
      radical: { character: "火", name: "fire" },
      strokeCount: 4,
      mnemonic: "A person with arms up, flames on both sides.",
      examples: [
        { sentence: "火车", pinyin: "huǒ chē", translation: "train" },
        { sentence: "大火", pinyin: "dà huǒ", translation: "big fire" }
      ]
    },
    {
      character: "木",
      pinyin: "mù",
      tone: 4,
      definition: "tree, wood",
      radical: { character: "木", name: "tree/wood" },
      strokeCount: 4,
      mnemonic: "A tree with spreading branches and roots.",
      examples: [
        { sentence: "木头", pinyin: "mù tou", translation: "wood" },
        { sentence: "木门", pinyin: "mù mén", translation: "wooden door" }
      ]
    }
  ],

  13: [
    {
      character: "金",
      pinyin: "jīn",
      tone: 1,
      definition: "gold, metal",
      radical: { character: "金", name: "gold/metal" },
      strokeCount: 8,
      mnemonic: "Gold nuggets under a roof.",
      examples: [
        { sentence: "金色", pinyin: "jīn sè", translation: "golden color" },
        { sentence: "金鱼", pinyin: "jīn yú", translation: "goldfish" }
      ]
    },
    {
      character: "土",
      pinyin: "tǔ",
      tone: 3,
      definition: "earth, soil, dirt",
      radical: { character: "土", name: "earth" },
      strokeCount: 3,
      mnemonic: "A plant growing from the ground (土).",
      examples: [
        { sentence: "土地", pinyin: "tǔ dì", translation: "land / soil" },
        { sentence: "土豆", pinyin: "tǔ dòu", translation: "potato" }
      ]
    },
    {
      character: "天",
      pinyin: "tiān",
      tone: 1,
      definition: "sky, heaven, day",
      radical: { character: "大", name: "big" },
      strokeCount: 4,
      mnemonic: "One (一) big (大) dome = the sky.",
      examples: [
        { sentence: "今天", pinyin: "jīn tiān", translation: "today" },
        { sentence: "天气", pinyin: "tiān qì", translation: "weather" }
      ]
    }
  ],

  14: [
    {
      character: "地",
      pinyin: "dì",
      tone: 4,
      definition: "earth, ground, land",
      radical: { character: "土", name: "earth" },
      strokeCount: 6,
      mnemonic: "Earth (土) is also (也) under your feet.",
      examples: [
        { sentence: "土地", pinyin: "tǔ dì", translation: "land / soil" },
        { sentence: "大地", pinyin: "dà dì", translation: "great earth" }
      ]
    },
    {
      character: "风",
      pinyin: "fēng",
      tone: 1,
      definition: "wind",
      radical: { character: "风", name: "wind" },
      strokeCount: 4,
      mnemonic: "Wind blowing through a window frame.",
      examples: [
        { sentence: "大风", pinyin: "dà fēng", translation: "strong wind" },
        { sentence: "风大", pinyin: "fēng dà", translation: "windy" }
      ]
    },
    {
      character: "云",
      pinyin: "yún",
      tone: 2,
      definition: "cloud",
      radical: { character: "二", name: "two" },
      strokeCount: 4,
      mnemonic: "Fluffy clouds floating across the sky.",
      examples: [
        { sentence: "白云", pinyin: "bái yún", translation: "white cloud" },
        { sentence: "云南", pinyin: "Yún nán", translation: "Yunnan" }
      ]
    }
  ],

  15: [
    {
      character: "雨",
      pinyin: "yǔ",
      tone: 3,
      definition: "rain",
      radical: { character: "雨", name: "rain" },
      strokeCount: 8,
      mnemonic: "A cloud with raindrops falling down.",
      examples: [
        { sentence: "下雨", pinyin: "xià yǔ", translation: "to rain" },
        { sentence: "雨水", pinyin: "yǔ shuǐ", translation: "rainwater" }
      ]
    },
    {
      character: "花",
      pinyin: "huā",
      tone: 1,
      definition: "flower",
      radical: { character: "艹", name: "grass (radical)" },
      strokeCount: 7,
      mnemonic: "Grass (艹) that changes (化) into a flower.",
      examples: [
        { sentence: "花园", pinyin: "huā yuán", translation: "garden" },
        { sentence: "开花", pinyin: "kāi huā", translation: "to bloom" }
      ]
    },
    {
      character: "草",
      pinyin: "cǎo",
      tone: 3,
      definition: "grass",
      radical: { character: "艹", name: "grass (radical)" },
      strokeCount: 9,
      mnemonic: "Early (早) grass (艹) in the morning.",
      examples: [
        { sentence: "小草", pinyin: "xiǎo cǎo", translation: "small grass" },
        { sentence: "草地", pinyin: "cǎo dì", translation: "lawn / grassland" }
      ]
    }
  ]
};
