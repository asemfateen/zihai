import express from "express";
import { db } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { convertNumberedPinyin } from "../utils/pinyin.js";

const router = express.Router();

function shuffle(array) {
  const a = [...array];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function generateDistractors(level, excludeId, field, limit = 3) {
  const rows = await db.all(
    `
    SELECT ${field} as val FROM cedict_words
    WHERE hsk_level = $1 AND id != $2
    ORDER BY RANDOM() LIMIT $3
    `,
    [level, excludeId, limit]
  );
  return rows.map((r) => r.val);
}

router.post("/generate", requireAuth, async (req, res) => {
  try {
    const { hsk_level = 1 } = req.body;
    const validLevel = Math.max(1, Math.min(6, parseInt(hsk_level, 10) || 1));

    const words = await db.all(
      `
      SELECT id, simplified as character, pinyin, definition
      FROM cedict_words
      WHERE hsk_level = $1
      ORDER BY RANDOM() LIMIT 40
      `,
      [validLevel]
    );

    if (words.length < 10) {
      return res
        .status(400)
        .json({ error: "Not enough words for this HSK level" });
    }

    const shuffled = shuffle(words);

    // Section 1: Vocabulary (15 questions) - pick correct definition
    const section1Promises = [];
    for (let i = 0; i < Math.min(15, shuffled.length); i++) {
      const w = shuffled[i];
      section1Promises.push(
        generateDistractors(validLevel, w.id, "definition", 3).then((distractors) => {
          const options = shuffle([w.definition, ...distractors]);
          return {
            section: 1,
            id: `v-${w.id}`,
            type: "vocabulary",
            prompt: w.character,
            pinyin: convertNumberedPinyin(w.pinyin),
            options,
            answer: w.definition,
          };
        })
      );
    }

    // Section 2: Pinyin (10 questions) - pick correct pinyin
    const section2Promises = [];
    for (let i = 15; i < Math.min(25, shuffled.length); i++) {
      const w = shuffled[i];
      section2Promises.push(
        generateDistractors(validLevel, w.id, "pinyin", 3).then((distractors) => {
          const correct = convertNumberedPinyin(w.pinyin);
          const options = shuffle([
            correct,
            ...distractors.map((d) => convertNumberedPinyin(d)),
          ]);
          return {
            section: 2,
            id: `p-${w.id}`,
            type: "pinyin",
            prompt: w.character,
            options,
            answer: correct,
          };
        })
      );
    }

    // Section 3: Reverse lookup (5 questions) - definition → character
    const section3Promises = [];
    for (let i = 25; i < Math.min(30, shuffled.length); i++) {
      const w = shuffled[i];
      section3Promises.push(
        db.all(
          `
          SELECT simplified as val FROM cedict_words
          WHERE hsk_level = $1 AND id != $2
          ORDER BY RANDOM() LIMIT 3
          `,
          [validLevel, w.id]
        ).then((rows) => {
          const distractors = rows.map((r) => r.val);
          const options = shuffle([w.character, ...distractors]);
          return {
            section: 3,
            id: `r-${w.id}`,
            type: "reverse",
            prompt: w.definition,
            options,
            answer: w.character,
          };
        })
      );
    }

    const results1 = await Promise.all(section1Promises);
    const results2 = await Promise.all(section2Promises);
    const results3 = await Promise.all(section3Promises);
    const questions = [...results1, ...results2, ...results3];

    res.json({
      hsk_level: validLevel,
      total: questions.length,
      time_limit: 30 * 60,
      questions,
    });
  } catch (err) {
    console.error("Failed to generate mock test:", err);
    res.status(500).json({ error: "Failed to generate mock test" });
  }
});

router.post("/submit", requireAuth, async (req, res) => {
  try {
    const { hsk_level, answers, time_taken } = req.body;
    if (!answers || !Array.isArray(answers)) {
      return res.status(400).json({ error: "Invalid answers" });
    }

    let score = 0;
    const results = answers.map((a) => {
      const correct = a.selected === a.correct;
      if (correct) score++;
      return { ...a, correct };
    });

    const info = await db.run(
      `
      INSERT INTO mock_test_results (user_id, hsk_level, score, total, time_taken, answers)
      VALUES ($1, $2, $3, $4, $5, $6) RETURNING id
      `,
      [
        req.user.id,
        hsk_level,
        score,
        answers.length,
        time_taken || 0,
        JSON.stringify(results),
      ]
    );

    res.json({
      id: info.lastInsertRowid,
      score,
      total: answers.length,
      percentage: Math.round((score / answers.length) * 100),
      results,
    });
  } catch (err) {
    console.error("Failed to submit mock test:", err);
    res.status(500).json({ error: "Failed to submit mock test" });
  }
});

router.get("/results", requireAuth, async (req, res) => {
  try {
    const rows = await db.all(
      `
      SELECT id, hsk_level, score, total, time_taken, created_at
      FROM mock_test_results
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 20
      `,
      [req.user.id]
    );

    res.json(
      rows.map((r) => ({
        ...r,
        percentage: Math.round((r.score / r.total) * 100),
      }))
    );
  } catch (err) {
    console.error("Failed to fetch mock test results:", err);
    res.status(500).json({ error: "Failed to fetch results" });
  }
});

router.get("/results/:id", requireAuth, async (req, res) => {
  try {
    const row = await db.get(
      `
      SELECT * FROM mock_test_results
      WHERE id = $1 AND user_id = $2
      `,
      [req.params.id, req.user.id]
    );

    if (!row) {
      return res.status(404).json({ error: "Result not found" });
    }

    res.json({
      ...row,
      answers: JSON.parse(row.answers || "[]"),
      percentage: Math.round((row.score / row.total) * 100),
    });
  } catch (err) {
    console.error("Failed to fetch mock test result:", err);
    res.status(500).json({ error: "Failed to fetch result" });
  }
});

export default router;
