import express from "express";
import { db } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { convertNumberedPinyin } from "../utils/pinyin.js";
import { resolveRowsBatch } from "../utils/textUtils.js";

function deduplicatePinyin(pinyin) {
  const syllables = pinyin.split(" ");
  const n = syllables.length;
  if (n % 2 !== 0) return pinyin;

  const half = n / 2;
  for (let i = 0; i < half; i++) {
    if (syllables[i].toLowerCase() !== syllables[i + half].toLowerCase()) {
      return pinyin;
    }
  }
  return syllables.slice(0, half).join(" ");
}

const router = express.Router();

function shuffle(array) {
  let currentIndex = array.length,
    randomIndex;
  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex],
      array[currentIndex],
    ];
  }
  return array;
}

router.get("/:unit", requireAuth, async (req, res) => {
  const unit = parseInt(req.params.unit, 10);
  if (isNaN(unit) || unit < 1) {
    return res.status(400).json({ error: "Invalid unit" });
  }

  let level = 1;
  let offset = 0;
  const wordsPerUnit = 10;

  if (unit <= 6) {
    level = 1;
    offset = (unit - 1) * wordsPerUnit;
  } else if (unit <= 12) {
    level = 2;
    offset = (unit - 7) * wordsPerUnit;
  } else {
    level = 3;
    offset = (unit - 13) * wordsPerUnit;
  }

  try {
    // Get target vocabulary for this unit
    const rows = await db.all(`
      SELECT id, simplified AS character, pinyin, definition AS english_definition
      FROM cedict_words 
      WHERE hsk_level = $1
      ORDER BY length(simplified) ASC, simplified ASC
      LIMIT $2 OFFSET $3
    `, [level, wordsPerUnit, offset])

    await resolveRowsBatch(rows);

    const targetWords = rows.map((row) => ({
      ...row,
      pinyin: deduplicatePinyin(convertNumberedPinyin(row.pinyin)),
    }));

    if (targetWords.length === 0) {
      return res.status(404).json({ error: "No words found for this unit" });
    }

    const types = ["meaning", "pinyin", "listening", "writing"];

    const questions = await Promise.all(targetWords.map(async (word) => {
      // Pick a random question type for this word
      const type = types[Math.floor(Math.random() * types.length)];
      
      const distRows = await db.all(`
        SELECT id, simplified AS character, pinyin, definition AS english_definition
        FROM cedict_words 
        WHERE hsk_level = $1 AND id != $2
        ORDER BY RANDOM() LIMIT 3
      `, [level, word.id])

      await resolveRowsBatch(distRows);

      const distractors = distRows.map((row) => ({
        ...row,
        pinyin: deduplicatePinyin(convertNumberedPinyin(row.pinyin)),
      }))

      let options = [];

      if (type === "meaning") {
        options = [
          { text: word.english_definition, isCorrect: true },
          ...distractors.map((d) => ({
            text: d.english_definition,
            isCorrect: false,
          })),
        ];
      } else if (type === "pinyin") {
        options = [
          { text: word.pinyin, isCorrect: true },
          ...distractors.map((d) => ({ text: d.pinyin, isCorrect: false })),
        ];
      } else if (type === "listening") {
        options = [
          { text: word.character, isCorrect: true },
          ...distractors.map((d) => ({ text: d.character, isCorrect: false })),
        ];
      } else if (type === "writing") {
        options = [];
      }

      return {
        id: `${unit}-${word.id}-${type}`,
        type,
        targetWord: word,
        options: shuffle(options),
      };
    }));

    res.json({
      unit,
      questions: shuffle(questions),
    });
  } catch (err) {
    console.error("Lesson generation error:", err);
    res.status(500).json({ error: "Failed to generate lesson" });
  }
});

export default router;
