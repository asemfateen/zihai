import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import compression from "compression";
import path from "path";
import os from "os";
import { fileURLToPath } from "url";
import { db, pool } from "./db.js";
import { setCsrfCookie, csrfProtection } from "./middleware/auth.js";
import { apiLimiter, authLimiter } from "./middleware/rateLimiter.js";
import { convertNumberedPinyin } from "./utils/pinyin.js";

// Import routers
import authRouter from "./routes/auth.js";
import dictionaryRouter from "./routes/dictionary.js";
import flashcardsRouter from "./routes/flashcards.js";
import storiesRouter from "./routes/stories.js";
import quizRouter from "./routes/quiz.js";
import achievementsRouter from "./routes/achievements.js";
import ttsRouter from "./routes/tts.js";
import progressRouter from "./routes/progress.js";
import lessonsRouter from "./routes/lessons.js";
import leaderboardRouter from "./routes/leaderboard.js";
import mockTestRouter from "./routes/mocktest.js";
import adminRouter from "./routes/admin.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.set("trust proxy", 1);
const PORT = process.env.PORT || 3002;

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.jsdelivr.net"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https://*"],
        connectSrc: ["'self'", "https://*", "http://*", "ws://*", "wss://*"],
        mediaSrc: ["'self'", "data:", "blob:", "https://*", "http://*"],
      },
    },
  }),
);
app.use(compression());

// Configure CORS
const localIps = [];
try {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === "IPv4" && !net.internal) {
        localIps.push(net.address);
      }
    }
  }
} catch {
  /* ignore */
}

app.use(
  cors({
    origin: function (origin, callback) {
      const allowed = [
        "https://zihai.vercel.app",
        /https:\/\/zihai-.*\.vercel\.app$/,
        /https?:\/\/.*\.railway\.app$/,
        /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\]):\d+$/,
        /^chrome-extension:\/\/[a-z]{32}$/,
      ];
      for (const ip of localIps) {
        allowed.push(
          new RegExp(`^https?:\\/\\/${ip.replace(/\./g, "\\.")}:\\d+$`),
        );
      }
      if (process.env.ALLOWED_ORIGIN) {
        allowed.push(process.env.ALLOWED_ORIGIN);
      }
      if (
        !origin ||
        allowed.some((a) =>
          typeof a === "string" ? a === origin : a.test(origin),
        )
      ) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    exposedHeaders: ["x-csrf-token"],
  }),
);

app.use(cookieParser());
app.use(setCsrfCookie);
app.use(express.json({ limit: "10kb" }));

// Body parsing error handler
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({ error: "Invalid JSON in request body" });
  }
  if (err.type === "entity.too.large" || err.status === 413) {
    return res.status(413).json({ error: "Request body too large" });
  }
  next(err);
});

// Recursive Pinyin Formatter Middleware
function recursiveFormatPinyin(obj) {
  if (!obj || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      obj[i] = recursiveFormatPinyin(obj[i]);
    }
    return obj;
  }
  for (const key of Object.keys(obj)) {
    if (key === "pinyin" && typeof obj[key] === "string") {
      obj[key] = convertNumberedPinyin(obj[key]);
    } else if (typeof obj[key] === "object") {
      obj[key] = recursiveFormatPinyin(obj[key]);
    }
  }
  return obj;
}

app.use("/api/", (req, res, next) => {
  const originalJson = res.json;
  res.json = function (body) {
    if (body) {
      body = recursiveFormatPinyin(body);
    }
    return originalJson.call(this, body);
  };

  if (
    ["/login", "/register", "/forgot-password", "/reset-password"].includes(
      req.path,
    )
  ) {
    return authLimiter(req, res, next);
  } else {
    return apiLimiter(req, res, next);
  }
});

// Register global CSRF Protection on state-changing API endpoints
app.use("/api", (req, res, next) => {
  const isPublicAuth = [
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
    "/logout",
  ].includes(req.path);
  if (isPublicAuth) {
    return next();
  }
  return csrfProtection(req, res, next);
});

// Ping endpoint
app.get("/api/ping", (req, res) => {
  res.json({ status: "ok" });
});

// Register routes
app.use("/api", authRouter);
app.use("/api", dictionaryRouter);
app.use("/api", flashcardsRouter);
app.use("/api", storiesRouter);
app.use("/api", quizRouter);
app.use("/api", achievementsRouter);
app.use("/api", ttsRouter);
app.use("/api", progressRouter);
app.use("/api/lessons", lessonsRouter);
app.use("/api/leaderboard", leaderboardRouter);
app.use("/api/mock-test", mockTestRouter);
app.use("/api/admin", adminRouter);

app.get("/api/settings", async (req, res) => {
  try {
    const settings = await db.all("SELECT * FROM app_settings");
    const settingsMap = settings.reduce((acc, row) => {
      acc[row.key] = row.value;
      return acc;
    }, {});
    res.json(settingsMap);
  } catch (err) {
    // If table doesn't exist yet, return empty
    res.json({});
  }
});

app.post("/api/log-error", (req, res) => {
  console.log("\n\n--- FRONTEND ERROR ---");
  console.log(req.body.error);
  console.log(req.body.stack);
  console.log("----------------------\n\n");
  res.json({ ok: true });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal server error" });
});

// Serve frontend assets (Production or Development)
if (process.env.NODE_ENV === "production") {
  const distPath = path.join(__dirname, "../dist");
  app.use(express.static(distPath));

  app.use((req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
} else if (process.env.NODE_ENV !== "test") {
  try {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
      root: path.join(__dirname, "../"),
    });
    app.use(vite.middlewares);
    console.log("Vite dev server integrated in middleware mode.");
  } catch (err) {
    console.error(
      "Failed to start Vite dev server in middleware mode:",
      err.message,
    );
  }
}

// Graceful Shutdown
function shutdown() {
  console.log("Shutting down gracefully...");
  try {
    pool.end();
  } catch {}
  process.exit(0);
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err);
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection:", reason);
});

if (process.env.NODE_ENV !== "test") {
  // Seed Admin User
  import("bcryptjs")
    .then(async (bcrypt) => {
      const adminEmail = "admin";
      try {
        const existing = await db.get("SELECT id FROM users WHERE email = $1", [adminEmail]);
        if (!existing) {
          const hash = await bcrypt.hash("123456", 10);
          await db.run(
            "INSERT INTO users (email, password_hash, is_admin) VALUES ($1, $2, $3)",
            [adminEmail, hash, 1]
          );
          console.log("Seeded admin user (admin / 123456)");
        }
      } catch (e) {
        console.error("Failed to seed admin", e);
      }
    })
    .catch((err) => console.error("bcrypt load failed for seeding", err));

  const server = app.listen(PORT, () => {
    console.log(`Zihai backend running on http://localhost:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
  });

  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.error(`\nPort ${PORT} is already in use.`);
      console.error(
        `Stop the other backend process or run: kill $(lsof -t -i:${PORT})`,
      );
      process.exit(1);
    } else {
      console.error("Server error:", err);
      process.exit(1);
    }
  });
}

export { app, db };
