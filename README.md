# 🌊 Zihai (字海) — Premium Chinese Dictionary & Learning Engine

<p align="center">
  <img src="https://img.shields.io/badge/Stage-Development-orange?style=for-the-badge" alt="Development Stage">
  <img src="https://img.shields.io/badge/Frontend-React%20%7C%20Tailwind-blue?style=for-the-badge&logo=react" alt="Frontend Tech">
  <img src="https://img.shields.io/badge/Backend-Node.js%20%7C%20Express-green?style=for-the-badge&logo=node.js" alt="Backend Tech">
  <img src="https://img.shields.io/badge/Database-SQLite-003B57?style=for-the-badge&logo=sqlite" alt="Database">
</p>

**Zihai (字海 - "Sea of Characters")** is a high-performance, dark-themed Chinese-English dictionary and smart learning application built for the modern language learner. Designed to bridge the gap between cluttered, outdated traditional dictionaries and sleek, developer-centric user interfaces, Zihai redefines how learners explore, study, and master the Chinese language.

Built with a fast **React (Vite) and Tailwind CSS** frontend, a scalable **Node.js/Express** backend, and an optimized, offline-capable **SQLite** database, Zihai delivers an instantaneous, fluid experience whether you are looking up a complex character or drilling flashcards.

---

## 🌟 Key Features

### 🔍 1. Multi-Criteria Smart Search Engine
Traditional dictionaries break down when you don't type *exactly* what they expect. Zihai’s intelligent search engine handles multi-layered queries effortlessly:
* **Smart Pinyin Splitting:** Type running pinyin without spaces or tone marks (e.g., typing `nihao` instantly splits into `nǐ hǎo` and returns `你好`).
* **Hanzi Search:** Look up characters directly with optimized multi-column indexing (`pinyin_search`, `hanzi`, `definition`).
* **English Definitions:** Fast semantic matching across English definitions to find the exact Chinese word you need.

### 📖 2. Interactive Word & Character Exploration
Every word page is a comprehensive learning dashboard:
* **Visual Stroke Order:** Seamless integration with `hanzi-writer` provides interactive, stroke-by-stroke drawing animations to master writing mechanics.
* **Character Drill-Down:** Tap on any individual character within a compound word to instantly explore its specific meanings, radical composition, and usage.
* **Audio Pronunciation:** High-quality crystal-clear audio playback for proper tone and native pronunciation acquisition.

### 🧠 3. Advanced Retention & Study Tools (SRS)
Zihai goes beyond a simple lookup tool by embedding a fully realized spaced repetition flashcard deck right into your dictionary workflow:
* **SM-2 Algorithm:** Powered by the scientifically proven Spaced Repetition scheduling algorithm (the math behind Anki) to dynamically schedule reviews right before you are about to forget a word.
* **Custom Decks & Favorites:** Organize your learning journey by building tailored vocabulary lists or quick-saving words to your master Favorites deck.
* **Search History:** A frictionless tracking system that remembers recent searches, transforming passive lookups into active review sessions.

### 🔒 4. Secure Full User System
Take your data with you across devices with a secure, robust authentication pipeline:
* Traditional email/password authentication backed by industry-standard security.
* Integrated **Google OAuth 2.0** for frictionless, single-tap onboarding.
* Cloud-synced user data ensuring study streaks and flashcard intervals are never lost.

---

## 🛠️ Tech Stack

* **Frontend:** React.js (Vite), Tailwind CSS, Hanzi-Writer (SVG stroke animation).
* **Backend:** Node.js, Express.js.
* **Database:** SQLite (Embedded, highly indexed for lightning-fast querying).
* **Authentication:** JWT (JSON Web Tokens), Passport.js, Google OAuth 2.0.
* **Core Logic:** Custom Pinyin-syllable splitting engine, SM-2 Spaced Repetition algorithm.

---

## 📂 Project Structure

```text
zihai/
├── backend/
│   ├── config/             # Database and Passport OAuth configurations
│   ├── controllers/        # Request handlers (Auth, Dictionary, Flashcards)
│   ├── data/               # SQLite database file and raw dictionary JSON
│   ├── middleware/         # JWT verification, error handling
│   ├── models/             # Database schemas and query interfaces
│   ├── routes/             # Express API route definitions
│   └── server.js           # Backend application entry point
├── frontend/
│   ├── src/
│   │   ├── components/     # Reusable UI elements (Navbar, SearchBar, Cards)
│   │   ├── context/        # Global state management (AuthContext, Theme)
│   │   ├── pages/          # View components (Home, WordPage, Decks, Profile)
│   │   ├── services/       # API call handlers (axios configuration)
│   │   ├── App.jsx         # App routing and layout root
│   │   └── main.jsx        # React DOM mounting point
│   ├── tailwind.config.js  # Premium dark theme styling rules
│   └── vite.config.js      # Frontend build configurations
└── README.md
