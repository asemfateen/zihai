# Zihai AI Coding Guidelines & Architecture Documentation

If you are an LLM or AI coding assistant reading this, you **MUST** adhere to these strict rules when adding new features or modifying the Zihai codebase. This document serves to prevent common bugs, regression errors, and stylistic inconsistencies.

## 1. Core Philosophy & Design System
Zihai is a "Duolingo-Pleco Killer"—a gamified Chinese learning app integrated with a deep dictionary.
- **Aesthetic:** We use modern "Glassmorphism" UI. This means relying on `bg-surface/50 backdrop-blur-xl`, soft gradients, and rounded corners (`rounded-2xl`, `rounded-3xl`).
- **Gamification:** Features must feel rewarding. Use micro-animations (`hover:scale-105`, `active:scale-95`), `animate-fade-in`, and confetti on success.
- **Tailwind:** Never use raw hex colors. Use the defined CSS variables (`bg-primary`, `text-text-primary`, `bg-card`, etc.).

## 2. Database Schema & Data Rules
The database is SQLite (`better-sqlite3`), stored locally at `~/zihai.db` and initialized in `backend/db.js`.
- `cedict_words` & `characters`: Contain dictionary data.
  - `definition`: Raw CEDICT format (e.g., `morning; CL:個|个[ge4]`). Use ONLY for deep dictionary lookups on the `WordPage`.
  - `short_definition`: A pre-parsed, clean string with classifiers removed and limited to 2 meanings (e.g., `morning`). **ALWAYS** use this column for quiz options, buttons, and UI cards.
- `users`: Tracks `xp`, `streak_days`, and `last_login`.
- `flashcard_progress`: Tracks Spaced Repetition (FSRS) data.

**Database Rules:**
- Use parameterized queries (`db.prepare('...').get(id)`).
- Never do string formatting per-request if it can be pre-computed in the database.

## 3. Pinyin Formatting (CRITICAL)
The SQLite database stores pinyin in a raw numbered format (e.g., `Xian1 sheng5`). 
**Rule:** You MUST run `convertNumberedPinyin` on any pinyin string retrieved from the database before sending it to the frontend or rendering it.
- **Backend Import:** `import { convertNumberedPinyin } from '../utils/pinyin.js'`
- **Frontend Import:** `import { convertNumberedPinyin } from '../utils/pinyin'`
*Failure to do this will result in ugly numbered pinyin appearing in the UI.*

## 4. UI Icons (lucide-react)
Zihai uses `lucide-react` for all iconography. 
**Rule:** When importing icons, ALWAYS import from `lucide-react` and alias them with the `Icon` suffix to maintain consistency with existing code. Do not attempt to import icons from local components if they exist in Lucide.
- **Correct:** `import { Trophy as TrophyIcon, Flame as FlameIcon, Star as StarIcon, Check as CheckIcon } from 'lucide-react'`
- **Incorrect:** `import { TrophyIcon } from '../components/Icons'`

## 5. The Lesson Engine & Micro-Games
Lessons are generated dynamically via `backend/routes/lessons.js`.
- **Structure:** 10 questions per unit, mixing 4 modes: `meaning`, `pinyin`, `listening`, and `writing`.
- **Distractors:** Always query `short_definition` for distractors to ensure they fit neatly in UI buttons.
- **Stroke Order (Writing):** We use `hanzi-writer` via the custom `useHanziWriter` React hook. If adding a new feature that involves drawing characters, look at `StrokeOrderSection.jsx` and `LessonPage.jsx` for reference on how to bind the writer instance to a `ref`.

## 6. Full-stack Architecture & Routing
- **Frontend:** React + Vite + React Router. 
  - All new pages must be lazy-loaded in `src/App.jsx` wrapped in `<PageSuspense><ErrorBoundary>`.
- **Backend:** Node.js + Express.
- **Middleware Integration:** Vite is integrated in middleware mode inside `backend/server.js`. The entire app (API + Frontend) is served on `http://localhost:3002`.
- **Server Restarts (CRITICAL):** Because the backend runs inside the Vite process, any changes to backend files (e.g., `backend/routes/*.js`, `backend/db.js`) require a manual restart of the `npm run dev` node process. Be sure to remind the user of this when you modify backend code!

## 7. Gamification System (XP & Streaks)
- Handled exclusively by the `/api/progress/*` endpoints.
- When a user finishes a lesson, call `/api/progress/lesson-complete` to award XP and increment their streak.
- The `JourneyPage` visualizes this progress using a vertically scrolling SVG path, where nodes unlock based on cumulative XP. 
- Do not manually mutate user XP in frontend state without syncing via the API.
