# 字海 Zihai — Chinese Dictionary

A full-stack Chinese dictionary and learning tool. Search for characters, build vocabulary lists, study with spaced-repetition flashcards, and explore stroke order animations.

## Features

- **Search** — Look up characters by hanzi, pinyin, or English definition with fuzzy matching
- **Stroke Order** — Animated character stroke order diagrams (via Hanzi Writer)
- **Text-to-Speech** — Listen to pronunciation with the Web Speech API
- **Flashcards** — Spaced-repetition (SM-2 algorithm) with due-card tracking
- **Vocabulary Lists** — Create custom word lists for organized learning
- **Favorites** — Bookmark characters for quick reference
- **Search History** — Review recent searches (persisted per user)
- **Authentication** — Register/login with JWT + bcrypt, password reset via email
- **PWA** — Installable as a progressive web app with offline caching
- **Dark/Light Theme** — Toggle between themes with system preference detection

## Stack

| Layer   | Technology                                                   |
| ------- | ------------------------------------------------------------ |
| Frontend| React 19, Vite 8, Tailwind CSS 4, React Router 7             |
| Backend | Express 5, better-sqlite3                                    |
| Auth    | bcryptjs, jsonwebtoken, HTTP-only cookies, CSRF protection   |
| Deploy  | Vercel (frontend), Railway (backend)                         |

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Setup

```bash
# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Edit .env as needed (defaults work for local dev)

# Initialize the dictionary database
# The backend auto-creates tables on first run.
# Populate the database by running the load scripts in backend/:
# (Requires a dictionary data source - see backend scripts)
cd backend
node loadDictionary.js
```

### Development

```bash
# Start both frontend (Vite on :5173) and backend (Express on :3002)
npm run dev
```

The Vite dev server proxies `/api` requests to the Express backend.

### Production

```bash
# Build the frontend
npm run build

# Start the backend (serves the built frontend from dist/)
npm start
```

## Project Structure

```
zihai/
├── backend/                  # Express API server
│   ├── server.js             # Routes, auth, DB queries
│   ├── pinyinUtils.js        # Pinyin normalization utilities
│   ├── loadDictionary.js     # Dictionary data loader
│   ├── addVocabulary.js      # Vocabulary import scripts
│   ├── zihai.db              # SQLite database
│   └── .env                  # Backend environment variables
├── src/                      # React frontend
│   ├── App.jsx               # Router configuration
│   ├── main.jsx              # Entry point
│   ├── api.js                # HTTP client with CSRF + retry
│   ├── pages/                # Route components
│   │   ├── HomePage.jsx      # Guest landing / authed dashboard
│   │   ├── SearchPage.jsx    # Search results
│   │   ├── WordPage.jsx      # Single word detail
│   │   ├── FlashcardsPage.jsx# SM-2 review session
│   │   ├── FavoritesPage.jsx
│   │   ├── ListsPage.jsx     # Vocabulary list management
│   │   ├── HistoryPage.jsx
│   │   ├── ProfilePage.jsx
│   │   ├── LoginPage.jsx
│   │   ├── RegisterPage.jsx
│   │   ├── ForgotPasswordPage.jsx
│   │   ├── ResetPasswordPage.jsx
│   │   └── NotFoundPage.jsx
│   ├── components/           # Reusable UI
│   │   ├── Navbar.jsx        # Top nav with search + auth
│   │   ├── SearchResultCard.jsx
│   │   ├── StrokeOrderSection.jsx
│   │   ├── WordListDropdown.jsx
│   │   ├── Spinner.jsx
│   │   └── ...
│   ├── hooks/                # Custom React hooks
│   │   ├── useHanziWriter.js
│   │   ├── useSpeechSynthesis.js
│   │   ├── useTheme.js
│   │   ├── useWordData.js
│   │   └── ...
│   └── context/
│       └── AuthContext.jsx   # Auth state management
├── index.html
├── vite.config.js            # Vite + Tailwind + PWA config
├── vercel.json               # Vercel deployment config
└── package.json
```

## Environment Variables

### Backend (`backend/.env`)

| Variable         | Description                                      |
| ---------------- | ------------------------------------------------ |
| `JWT_SECRET`     | Secret key for signing JWT tokens                |
| `PORT`           | Server port (default 3002)                       |
| `NODE_ENV`       | `development` or `production`                    |
| `FRONTEND_URL`   | Frontend URL for password reset links            |
| `SMTP_HOST`      | SMTP server for password reset emails            |
| `SMTP_PORT`      | SMTP port (default 587)                          |
| `SMTP_USER`      | SMTP username                                    |
| `SMTP_PASS`      | SMTP password                                    |
| `SMTP_FROM`      | From address for emails                          |
| `ALLOWED_ORIGIN` | Extra CORS origin (optional)                     |

### Frontend (`VITE_API_URL` in `.env`)

| Variable        | Description                                    |
| --------------- | ---------------------------------------------- |
| `VITE_API_URL`  | Backend URL (blank for dev proxy, set for prod) |

## API Endpoints

| Method   | Endpoint                              | Auth     | Description                |
| -------- | ------------------------------------- | -------- | -------------------------- |
| POST     | `/api/register`                       | —        | Create account             |
| POST     | `/api/login`                          | —        | Log in                     |
| POST     | `/api/logout`                         | —        | Log out                    |
| GET      | `/api/me`                             | Required | Current user info          |
| GET      | `/api/profile`                        | Required | Profile with stats         |
| PATCH    | `/api/profile`                        | Required | Update display name        |
| POST     | `/api/profile/change-password`        | Required | Change password            |
| GET      | `/api/search?q=`                      | —        | Search words               |
| GET      | `/api/word/:id`                       | —        | Word detail                |
| POST     | `/api/history`                        | Required | Save search to history     |
| GET      | `/api/history`                        | Required | Get search history         |
| DELETE   | `/api/history`                        | Required | Clear search history       |
| POST     | `/api/favorites/:wordId`              | Required | Add favorite               |
| DELETE   | `/api/favorites/:wordId`              | Required | Remove favorite            |
| GET      | `/api/favorites/:wordId`              | Required | Check if favorited         |
| GET      | `/api/favorites`                      | Required | List favorites             |
| GET/POST | `/api/lists`                          | Required | List/Create vocab lists    |
| DELETE   | `/api/lists/:listId`                  | Required | Delete list                |
| POST     | `/api/lists/:listId/words/:wordId`    | Required | Add word to list           |
| DELETE   | `/api/lists/:listId/words/:wordId`    | Required | Remove word from list      |
| GET      | `/api/lists/:listId`                  | Required | Get list with words        |
| GET      | `/api/flashcards/due`                 | Required | Due cards for review       |
| POST     | `/api/flashcards/:wordId/init`        | Required | Init flashcard             |
| POST     | `/api/flashcards/:wordId/add`         | Required | Add to deck                |
| POST     | `/api/flashcards/:wordId/result`      | Required | Submit review (SM-2)       |
| DELETE   | `/api/flashcards/:wordId`             | Required | Remove from deck           |
| POST     | `/api/forgot-password`                | —        | Request password reset     |
| POST     | `/api/reset-password`                 | —        | Reset password with token  |

## Deployment

The frontend is configured for **Vercel** (`vercel.json`) with API rewrites pointing to the backend on Railway. The backend deploys independently with its own environment variables.
