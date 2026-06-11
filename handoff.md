# Zihai App Handoff & Architecture Guide

Welcome! This document summarizes the database, backend, and UI improvements made on the `feature/db-improvements` branch to help you continue development seamlessly.

---

## 1. Active Branch & Environment
- **Branch**: `feature/db-improvements` (all changes are committed, working directory is clean).
- **Node.js**: `v24.16.0` (managed via NVM).
- **PM2 Processes**:
  - `zihai-v1` (Backend API on `http://localhost:3002`)
  - `zihai-web` (Vite Frontend on `http://localhost:5173`)
- **Native Dependency Rebuild**: The `better-sqlite3` native binary has been rebuilt for Node `v24.16.0`. If you switch node versions and encounter `ERR_DLOPEN_FAILED`, execute:
  ```bash
  . ~/.nvm/nvm.sh && nvm use default && npm rebuild better-sqlite3
  ```

---

## 2. Database Migrations & Performance
We optimized the SQLite database (`~/zihai.db`) schema and added relational safety.
- **Migration Script**: Found in [migrate-db.js](file:///home/asem/StudioProjects/zihai/backend/scripts/migrate-db.js).
- **Optimizations Added**:
  - Configured cascading foreign keys (`ON DELETE CASCADE`) on tables referencing `users` (`favorites`, `search_history`, `flashcard_progress`, `password_resets`).
  - Added indexes for lookup optimization (e.g. `idx_favorites_user_word`, `idx_search_history_user`, `idx_flashcard_due`).
  - Tuned pragmas for write performance: `PRAGMA journal_mode = WAL`, `PRAGMA synchronous = NORMAL`.

---

## 3. Backend API Enhancements ([server.js](file:///home/asem/StudioProjects/zihai/backend/server.js))

### A. Improved Search Relevance (`/api/search`)
- **Fix**: Replaced the exact `pinyin_flat` match (`pinyin_flat = ?`) with an exact tone-stripped syllable-level match:
  ```sql
  WHEN (instr(' ' || replace(replace(replace(replace(replace(pinyin, '1', ''), '2', ''), '3', ''), '4', ''), '5', '') || ' ', ' ' || ? || ' ') > 0) THEN 3
  ```
- **Why**: Characters with multiple pronunciations (e.g. `的` -> `de5 di1 di4 di2`) have concatenated flat strings (`dedididi`), causing them to rank poorly under simple equality queries. This fix properly ranks common characters first.

### B. Dynamic Cross-Reference Resolution
- **Helper**: `resolveDefinition(def)` and `resolveRow(row)`.
- **Function**: Automatically intercepts CC-CEDICT cross-reference definitions matching `see [Chinese]` (e.g. `see 基友` or `see 他媽的|他妈的[ta1 ma1 de5]`), looks up the target definition in the database (checking both simplified and traditional fields), and replaces it with the actual meaning.
- **Example**: Searching `G友` returns `(slang) very close same-sex friend; gay partner` instead of `see 基友`.
- **Coverage**: Applied to search results, word details, favorites list, radical lists, and flashcards.

### C. Added HSK Vocabulary Endpoint (`/api/hsk/:level`)
- **Path**: `/api/hsk/:level?page=X&limit=Y`
- **Function**: Merges HSK characters and words using a `UNION ALL` subquery, sorts them by length and character, and paginates them correctly for the frontend.

---

## 4. Frontend UI Improvements

### A. Text Definition Cleaning (`src/utils/text.js`)
- **Helper**: `cleanDefinition(def)`.
- **Behavior**:
  - Strips parenthetical text `(...)`, bracket annotations `[...]`, and curly braces `{...}`.
  - Filters out dictionary metadata patterns (like `see also`, `cl:`, `variant of`, `erroneously for`).
  - Deduplicates meanings and caps results to **at most 3 items** for list previews.
- **Coverage**:
  - [SearchResultCard.jsx](file:///home/asem/StudioProjects/zihai/src/components/SearchResultCard.jsx)
  - [FavoritesPage.jsx](file:///home/asem/StudioProjects/zihai/src/pages/FavoritesPage.jsx)
  - [HSKPage.jsx](file:///home/asem/StudioProjects/zihai/src/pages/HSKPage.jsx)

### B. UI Clamping and Hover Tooltips
- List cards now clamp long definitions using Tailwind's `line-clamp-2` utility.
- Cards maintain the original, unabridged definition in the `title` tooltip so users can hover to read the full context.

---

## 5. Quick Commands
- **Build Frontend**: `npm run build`
- **Lint Files**: `npm run lint`
- **Restart Backend Process**: `pm2 restart zihai-v1`
- **View Backend Logs**: `pm2 logs zihai-v1`
