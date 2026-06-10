# Contributing Guidelines for AI Agents

To ensure the stability and consistency of the Zihai application, all AI agents must adhere to the following rules:

## 1. Do Not Revert Key UI Refactors
The following UI changes are permanent and should **not** be reverted:
-   **Explore Tools Dropdown**: Navigation items (Radicals, Flashcards, HSK, Pinyin, History, Favorites, Stats) MUST be grouped under the "Explore Tools" dropdown in the [Navbar](file:///home/asem/StudioProjects/zihai/src/components/Navbar.jsx).
-   **Homepage Tools Grid**: The authed [HomePage](file:///home/asem/StudioProjects/zihai/src/pages/HomePage.jsx) must feature an "Explore Tools" grid section.

## 2. Audio (TTS) Implementation
Always follow the [AUDIO_GUIDELINES.md](file:///home/asem/StudioProjects/zihai/AUDIO_GUIDELINES.md). 
-   Prioritize the backend proxy (`/api/tts`).
-   Use the `useSpeechSynthesis` hook.
-   Provide visual feedback (pulsing icons) when audio is playing.

## 3. Branching Strategy
-   **`main` Branch**: Reserved for stable, locked code. **Do not commit here** unless explicitly requested to update the stable reference.
-   **`development` Branch**: All new features, bug fixes, and experiments must happen here.

## 4. Development Workflow
-   **No PWA Caching in Dev**: PWA caching is disabled in development mode (see `vite.config.js`) to prevent stale code issues.
-   **Hard Refreshes**: If you don't see your changes, perform a hard refresh (`Ctrl+Shift+R`).
-   **Clean Slate**: If the dev server is acting up, use `npm run clean-dev` (if available) or restart the `npm run dev` process.

**Failure to follow these rules may result in code regression and user frustration.**
