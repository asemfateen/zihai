# 🚨 CRITICAL ALERT FOR ALL AI AGENTS 🚨

**READ THIS BEFORE MAKING ANY CHANGES TO THE CODEBASE.**

This project has strict architectural and UI requirements that must NOT be reverted.

## 🛑 1. NAVIGATION (NAVBAR)
-   **DO NOT REVERT THE NAVBAR.** 
-   All tools (Radicals, Flashcards, HSK Levels, Pinyin Chart, History, Favorites, Stats) **MUST** remain grouped under the **"Explore Tools"** dropdown.
-   Do not move these items back to the top-level navbar.

## 🛑 2. AUDIO (TTS)
-   **DO NOT CHANGE THE AUDIO LOGIC.**
-   The system uses a **Backend-First** approach via the `/api/tts` proxy.
-   Browser `speechSynthesis` is only a **fallback**.
-   Always use the `useSpeechSynthesis` hook. Reference `AUDIO_GUIDELINES.md` for details.

## 🛑 3. BRANCHING
-   **DO NOT COMMIT TO `main`.**
-   The `main` branch is locked for the stable version. 
-   Always perform your work on the `development` branch.

## 🛑 4. CACHING & DEVELOPMENT
-   **DO NOT ENABLE PWA CACHING IN DEV.**
-   `vite.config.js` is configured to disable caching during development. This is intentional to prevent stale code issues.
-   If you see "old code," run `npm run clean-dev`.

## 🛑 5. RESTORED PAGES
-   The following pages were manually restored and are now fully functional. Do not empty them or break their routing:
    - `HSKPage.jsx`
    - `PinyinChartPage.jsx`
    - `StatsPage.jsx`

**Failure to follow these rules will cause immediate regression of the app's stable state.**
