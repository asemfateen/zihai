# Zihai 字典

> **Note:** This project was proudly built with the assistance of AI. 🤖✨

Zihai is a full-stack web application designed for learning and referencing Chinese characters and vocabulary. It features a modern, responsive UI and a fast local database using CC-CEDICT data to provide accurate definitions, pinyin, and stroke-order animations.

## Features

- **Smart Search Engine:** Find Chinese characters and words easily. The search algorithm supports pinyin with intelligent tone-stripping and ranking for high accuracy.
- **Dynamic Cross-References:** Automatically resolves CC-CEDICT "see also" cross-references so you get the actual definition right away.
- **Clean Definitions:** Dictionary definitions are parsed and cleaned to remove clutter, presenting only the most relevant meanings.
- **HSK Vocabulary:** Browse structured HSK vocabulary lists organized by level to track and improve your learning.
- **Flashcards & Favorites:** Save words to your favorites and practice them using the built-in flashcard system, which tracks your progress.
- **Stroke Animations:** Integrated with Hanzi Writer to show animated character stroke orders.

## Tech Stack

**Frontend:**
- React 19
- Vite
- Tailwind CSS 4
- React Router DOM
- Hanzi Writer

**Backend & Database:**
- Node.js & Express
- SQLite (via `better-sqlite3`)
- Custom database indexing and WAL mode for high-performance reads

## Getting Started

### Prerequisites

- Node.js (v24.16.0 or higher recommended)
- NPM

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Make sure the SQLite database `zihai.db` is set up.

### Running Locally

You can run both the frontend and backend concurrently using the dev script:

```bash
npm run dev
```

Alternatively, you can run them separately:
- Backend: `npm start`
- Frontend: `npm run preview` (after building)

### Scripts

- `npm run dev`: Starts Vite dev server and Node.js backend.
- `npm run build`: Builds the Vite project for production.
- `npm run lint`: Runs ESLint on the project.

## Architecture & Contributions

If you're picking up development, refer to `handoff.md` for detailed information on database migrations, backend API behaviors, and UI clamping logic.

---

*Made with AI, designed for learners.*
