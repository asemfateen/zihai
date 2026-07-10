import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import API_BASE, { fetchWithTimeout } from "../api";
import {
  HeartIcon,
  FlashcardIcon,
  ClockIcon,
  GridIcon,
  DashboardIcon,
  SpeakerIcon,
  UserIcon,
} from "../components/Icons";
import { motion, AnimatePresence } from "framer-motion";

function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  if (!user) {
    return <GuestHome />;
  }

  return <AuthedHome />;
}

function GuestHome() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef(null);
  const debounceRef = useRef(null);
  const abortControllerRef = useRef(null);

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    setFocusedIndex(-1);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (abortControllerRef.current) abortControllerRef.current.abort();

    if (value.length >= 1) {
      debounceRef.current = setTimeout(() => {
        abortControllerRef.current = new AbortController();
        fetchWithTimeout(
          `${API_BASE}/api/search?q=${encodeURIComponent(value)}&limit=6`,
          {
            signal: abortControllerRef.current.signal,
          },
        )
          .then((res) => res.json())
          .then((data) => {
            if (!data) return;
            setSuggestions(data.slice(0, 6));
            setShowDropdown(true);
          })
          .catch((err) => {
            if (err.name === "AbortError") return;
            console.error("Search suggestion failed:", err);
            setSuggestions([]);
            setShowDropdown(false);
          });
      }, 200);
    } else {
      setSuggestions([]);
      setShowDropdown(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      setShowDropdown(false);
      setFocusedIndex(-1);
    }
    if (showDropdown && suggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setFocusedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : 0,
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setFocusedIndex((prev) =>
          prev > 0 ? prev - 1 : suggestions.length - 1,
        );
      } else if (
        e.key === "Enter" &&
        focusedIndex >= 0 &&
        focusedIndex < suggestions.length
      ) {
        e.preventDefault();
        handleSelect(suggestions[focusedIndex]);
        return;
      }
    }
  };

  const handleSelect = (suggestion) => {
    setShowDropdown(false);
    setFocusedIndex(-1);
    navigate(`/word/${suggestion.id}`);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      setShowDropdown(false);
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  return (
    <div className="min-h-screen bg-transparent relative overflow-hidden pb-20">
      {/* Decorative ambient glowing backdrops */}
      <div className="absolute top-20 left-10 w-96 h-96 bg-primary/10 rounded-full blur-[100px] pointer-events-none -z-10 animate-pulse-slow"></div>
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-rose-500/5 rounded-full blur-[100px] pointer-events-none -z-10 animate-pulse-slow"></div>

      {/* Header / Guest Nav */}
      <header className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between animate-fade-in">
        <button
          onClick={() => navigate("/")}
          className="text-xl font-black bg-gradient-to-r from-primary to-orange-500 bg-clip-text text-transparent cursor-pointer bg-transparent border-none p-0 hover:opacity-80 transition-opacity"
        >
          字海 Zihai
        </button>
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/login")}
            className="text-sm font-bold text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
          >
            Log In
          </button>
          <button
            onClick={() => navigate("/register")}
            className="px-5 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
          >
            Sign Up Free
          </button>
        </div>
      </header>

      <div className="flex flex-col items-center justify-center px-4 pt-16 sm:pt-24 pb-20 max-w-4xl mx-auto text-center relative z-10">
        {/* Glow Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-gradient-to-r from-primary/10 via-rose-500/10 to-orange-500/10 border border-primary/20 rounded-full text-xs font-bold text-primary mb-8 animate-fade-in shadow-[0_0_15px_rgba(239,68,68,0.05)]">
          <span>✨</span> Introducing Zihai V2
        </div>

        <h1 className="text-6.5xl sm:text-7.5xl md:text-8.5xl lg:text-9.5xl font-black bg-gradient-to-r from-primary via-rose-500 to-orange-500 bg-clip-text text-transparent mb-6 tracking-tight drop-shadow-sm leading-none">
          字海
        </h1>
        <p className="text-lg sm:text-xl md:text-2xl text-text-secondary mb-12 font-light max-w-xl leading-relaxed">
          The ultimate Chinese learning platform. Dive into stroke orders,
          spaced repetition flashcards, and immersive graded reading.
        </p>

        {/* Unified Search Box */}
        <div
          ref={containerRef}
          className="w-full max-w-xl relative animate-fade-in shadow-2xl shadow-primary/5 rounded-2xl mb-12"
        >
          <form onSubmit={handleSubmit}>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Search characters, pinyin, or definitions..."
                value={query}
                onChange={handleSearchChange}
                onKeyDown={handleKeyDown}
                className="flex-1 px-5 py-4 bg-card/60 backdrop-blur-xl text-text-primary text-base sm:text-lg border border-border/50 rounded-2xl outline-none focus:border-primary transition-all placeholder:text-text-secondary focus:ring-4 focus:ring-primary/10 shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)]"
              />
              <button
                type="submit"
                className="px-6 py-4 bg-gradient-to-r from-primary to-rose-600 text-white text-base sm:text-lg font-bold rounded-2xl hover:shadow-xl hover:shadow-primary/30 transition-all hover:scale-[1.02] active:scale-[0.98] border border-primary/20 cursor-pointer whitespace-nowrap"
              >
                Search
              </button>
            </div>
          </form>

          {showDropdown && suggestions.length > 0 && (
            <div
              className="absolute top-full left-0 right-0 mt-3 bg-card/90 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl overflow-y-auto z-50 max-h-72 text-left"
              role="listbox"
            >
              {suggestions.map((s, i) => (
                <div
                  key={s.id}
                  onClick={() => handleSelect(s)}
                  onMouseEnter={() => setFocusedIndex(i)}
                  role="option"
                  aria-selected={i === focusedIndex ? "true" : "false"}
                  className={`flex items-center gap-4 px-5 py-3.5 cursor-pointer border-b border-border/30 last:border-b-0 transition-colors ${
                    i === focusedIndex
                      ? "bg-primary/10 text-primary"
                      : "text-text-primary hover:bg-surface"
                  }`}
                >
                  <span className="text-2xl font-black">{s.simplified}</span>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-primary">
                      {s.pinyin}
                    </span>
                    <span className="text-xs text-text-secondary line-clamp-1">
                      {s.definition}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Tools */}
        <div className="animate-fade-in flex gap-4 justify-center">
          <button
            onClick={() => navigate("/analyzer")}
            className="px-6 py-3.5 bg-card/40 backdrop-blur-xl border border-border/50 rounded-2xl shadow-sm hover:shadow-md hover:border-primary/20 hover:-translate-y-0.5 transition-all flex items-center gap-2.5 text-text-primary font-bold text-sm cursor-pointer"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-primary"
            >
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"></path>
            </svg>
            Text Analyzer
          </button>
          <button
            onClick={() => navigate("/reading")}
            className="px-6 py-3.5 bg-card/40 backdrop-blur-xl border border-border/50 rounded-2xl shadow-sm hover:shadow-md hover:border-primary/20 hover:-translate-y-0.5 transition-all flex items-center gap-2.5 text-text-primary font-bold text-sm cursor-pointer"
          >
            <span className="text-lg">📖</span>
            Graded Reader
          </button>
        </div>

        {/* Overhauled Feature Preview Cards */}
        <div className="mt-16 w-full max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 animate-fade-in text-left">
          {[
            {
              icon: "🗺️",
              title: "HSK Expedition",
              desc: "Complete level-by-level progressive Chinese courses aligned with HSK 1 to 6 standards.",
              color: "from-primary/10 to-transparent",
              border: "hover:border-primary/40 hover:shadow-primary/5",
            },
            {
              icon: "🃏",
              title: "Spaced Flashcards",
              desc: "Harness the FSRS active recall algorithm to review vocabulary exactly when you need to.",
              color: "from-rose-500/10 to-transparent",
              border: "hover:border-rose-500/40 hover:shadow-rose-500/5",
            },
            {
              icon: "✍️",
              title: "Interactive Strokes",
              desc: "Learn proper character stroke orders with live drawing guides and handwriting feedback.",
              color: "from-amber-500/10 to-transparent",
              border: "hover:border-amber-500/40 hover:shadow-amber-500/5",
            },
            {
              icon: "🏆",
              title: "Mock Exams",
              desc: "Access full HSK test practice, score breakdowns, and track HSK level readiness.",
              color: "from-emerald-500/10 to-transparent",
              border: "hover:border-emerald-500/40 hover:shadow-emerald-500/5",
            },
          ].map((f, i) => (
            <div
              key={f.title}
              className={`p-6 rounded-[1.5rem] bg-card/50 backdrop-blur-2xl border border-border/50 bg-gradient-to-br ${f.color} hover:-translate-y-1 hover:shadow-2xl transition-all duration-300 group cursor-pointer ${f.border}`}
              style={{ animationDelay: `${400 + i * 80}ms` }}
            >
              <span className="text-3xl block group-hover:scale-110 group-hover:-rotate-6 transition-transform duration-300">
                {f.icon}
              </span>
              <h3 className="text-base font-black text-text-primary mt-4 mb-2">
                {f.title}
              </h3>
              <p className="text-xs text-text-secondary leading-relaxed font-medium">
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AuthedHome() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [favoritesCount, setFavoritesCount] = useState(null);
  const [flashcardsDue, setFlashcardsDue] = useState(null);
  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [seeding, setSeeding] = useState(false);
  const [wotd, setWotd] = useState(null);
  const [progress, setProgress] = useState(null);
  const [showTour, setShowTour] = useState(false);
  const [tourStep, setTourStep] = useState(0);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [progRes, favRes, flashRes, histRes, wotdRes] = await Promise.all([
        fetchWithTimeout(`${API_BASE}/api/progress`, {
          credentials: "include",
        }),
        fetchWithTimeout(`${API_BASE}/api/favorites`, {
          credentials: "include",
        }),
        fetchWithTimeout(`${API_BASE}/api/flashcards/due`, {
          credentials: "include",
        }),
        fetchWithTimeout(`${API_BASE}/api/history`, { credentials: "include" }),
        fetchWithTimeout(`${API_BASE}/api/wotd`),
      ]);
      if (!progRes.ok || !favRes.ok || !flashRes.ok || !histRes.ok || !wotdRes.ok) {
        throw new Error("Failed to load stats dashboard");
      }
      setProgress(await progRes.json());
      setFavoritesCount((await favRes.json()).length);
      setFlashcardsDue((await flashRes.json()).length);
      setHistory((await histRes.json()).slice(0, 5));
      setWotd(await wotdRes.json());
    } catch (err) {
      console.error("Failed to fetch home data:", err);
      setError("Unable to load dashboard details. Please verify backend connection.");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSeedDeck = async () => {
    setSeeding(true);
    try {
      const res = await fetchWithTimeout(`${API_BASE}/api/flashcards/seed`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        // Refresh flashcardsDue
        const dueRes = await fetchWithTimeout(
          `${API_BASE}/api/flashcards/due`,
          { credentials: "include" },
        );
        if (dueRes.ok) setFlashcardsDue((await dueRes.json()).length);
      }
    } catch (err) {
      console.error("Failed to seed:", err);
    } finally {
      setSeeding(false);
    }
  };

  const nextTourStep = () => {
    if (tourStep < 2) {
      setTourStep((prev) => prev + 1);
    } else {
      localStorage.setItem("zihai_onboarded", "true");
      setShowTour(false);
    }
  };

  const skipTour = () => {
    localStorage.setItem("zihai_onboarded", "true");
    setShowTour(false);
  };

  useEffect(() => {
    fetchData();
    if (user && !localStorage.getItem("zihai_onboarded")) {
      setShowTour(true);
    }
  }, [fetchData, user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-transparent relative z-10 pb-20 overflow-hidden animate-pulse">
        <div className="max-w-4xl mx-auto px-4 pt-24 pb-8">
          {/* Header Skeleton */}
          <div className="h-44 bg-card/45 border border-border/50 rounded-[2.5rem] mb-8"></div>
          {/* Bento Grid Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="col-span-1 md:col-span-3 h-[300px] bg-card/45 border border-border/50 rounded-[2.5rem]"></div>
            <div className="col-span-1 md:col-span-2 h-[300px] bg-card/45 border border-border/50 rounded-[2.5rem]"></div>
            <div className="col-span-1 md:col-span-2 h-[220px] bg-card/45 border border-border/50 rounded-[2.5rem]"></div>
            <div className="col-span-1 md:col-span-3 h-[220px] bg-card/45 border border-border/50 rounded-[2.5rem]"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-transparent relative z-10 text-text-primary flex items-center justify-center">
        <div className="bg-card/85 backdrop-blur-xl border border-border/50 rounded-[2.5rem] p-8 max-w-md text-center shadow-lg animate-fade-in mx-4">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold mb-2">Failed to load Dashboard</h2>
          <p className="text-text-secondary text-sm mb-6">{error}</p>
          <button
            onClick={() => { setError(null); fetchData(); }}
            className="px-6 py-2.5 bg-primary text-white rounded-xl font-bold hover:scale-105 transition-transform cursor-pointer"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent relative z-10 pb-20 overflow-hidden">
      {/* Background ambient glowing details */}
      <div className="absolute top-20 right-10 w-96 h-96 bg-primary/5 rounded-full blur-[120px] pointer-events-none -z-10 animate-pulse-slow"></div>
      <div className="absolute bottom-20 left-10 w-96 h-96 bg-rose-500/5 rounded-full blur-[120px] pointer-events-none -z-10 animate-pulse-slow"></div>

      <div className="max-w-4xl mx-auto px-4 pt-24 pb-8 animate-fade-in">
        {/* Welcome & Quick Stats Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 bg-card/45 backdrop-blur-xl border border-border/50 rounded-[2.5rem] p-6 sm:p-8 shadow-sm">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
              Explorer Dashboard
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-text-primary mt-3.5 mb-1.5">
              Welcome back,{" "}
              {user?.name || user?.email?.split("@")[0] || "Explorer"}!
            </h1>
            <p className="text-sm text-text-secondary leading-relaxed font-medium">
              {!progress || progress.xp < 100
                ? "Ready to start your Chinese journey? 🚀"
                : "You are making amazing progress! Keep it up! 💪"}
            </p>
          </div>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Journey (Expedition Map) - Giant 3-Column Bento Card */}
          <div
            onClick={() => navigate("/journey")}
            className="col-span-1 md:col-span-3 bg-gradient-to-br from-primary/15 via-rose-500/5 to-transparent border border-primary/20 rounded-[2.5rem] p-8 flex flex-col justify-between hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-1 transition-all duration-300 cursor-pointer group min-h-[300px] relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[80px] -z-10 group-hover:bg-primary/20 transition-all duration-500"></div>

            <div className="flex justify-between items-start">
              <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center text-3xl group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300">
                🗺️
              </div>
              <span className="text-xs font-bold uppercase tracking-widest text-primary bg-primary/10 px-4 py-1.5 rounded-full border border-primary/20 shadow-sm animate-pulse">
                Resume Expedition
              </span>
            </div>

            <div className="mt-8">
              <h2 className="text-3xl font-black text-text-primary mb-2 group-hover:text-primary transition-colors">
                The HSK Journey
              </h2>
              <p className="text-sm text-text-secondary leading-relaxed max-w-sm mb-6 font-medium">
                Your level-by-level curriculum. Learn vocabulary, practice
                writing structures, and master syntax.
              </p>

              {/* Progress bar simulation */}
              <div className="w-full bg-surface/50 border border-border/50 rounded-full h-3.5 overflow-hidden p-0.5">
                <div
                  className="bg-gradient-to-r from-primary to-orange-500 h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, Math.max(15, (progress?.xp || 0) / 10))}%`,
                  }}
                ></div>
              </div>
            </div>
          </div>

          {/* Flashcards Status Card - 2-Column Bento Card */}
          <div
            onClick={() => (flashcardsDue > 0 ? navigate("/flashcards") : null)}
            className="col-span-1 md:col-span-2 bg-card/85 backdrop-blur-xl border border-border/50 rounded-[2.5rem] p-8 flex flex-col justify-between hover:shadow-2xl hover:shadow-rose-500/5 hover:-translate-y-1 transition-all duration-300 cursor-pointer group min-h-[300px] relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>

            <div className="flex justify-between items-start">
              <div className="w-14 h-14 rounded-2xl bg-rose-500/10 flex items-center justify-center text-3xl group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                🃏
              </div>
              <span className="text-xs font-bold uppercase tracking-widest text-text-secondary bg-surface px-3 py-1 rounded-full border border-border shadow-sm">
                Spaced Repetition
              </span>
            </div>

            <div className="mt-6 w-full">
              {flashcardsDue === 0 ? (
                <div className="flex flex-col gap-2">
                  <p className="text-sm font-semibold text-text-secondary leading-relaxed">
                    Your flashcard deck is empty! Complete a lesson to auto-seed
                    cards.
                  </p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSeedDeck();
                    }}
                    disabled={seeding}
                    className="w-full py-3 bg-surface hover:bg-primary hover:text-white border border-border/50 hover:border-primary text-text-primary rounded-xl font-bold transition-all text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
                  >
                    {seeding ? "Seeding..." : "🌱 Seed HSK 1 Starter Pack"}
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-5xl font-black text-text-primary">
                      {loading ? "..." : (flashcardsDue ?? 0)}
                    </span>
                    <span className="text-xs font-bold text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-md">
                      Due Today
                    </span>
                  </div>
                  <p className="text-text-secondary text-xs font-medium mb-5">
                    Cards waiting for review
                  </p>
                  <button className="w-full py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary-hover shadow-lg shadow-primary/20 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]">
                    Start Reviewing
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Quick Tools Grid - Full Width Bento Section */}
          <div className="col-span-1 md:col-span-5 bg-card/45 backdrop-blur-xl border border-border/50 rounded-[2.5rem] p-6 shadow-sm mt-2">
            <h3 className="text-xs font-black text-text-secondary uppercase tracking-widest mb-4 bg-surface inline-block px-3.5 py-1.5 rounded-full border border-border shadow-sm">
              Quick Tools
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              {[
                {
                  label: "HSK Levels",
                  icon: "🔍",
                  path: "/hsk",
                  bg: "hover:bg-orange-500/5 hover:border-orange-500/30",
                },
                {
                  label: "Radicals",
                  icon: "⼭",
                  path: "/radicals",
                  bg: "hover:bg-blue-500/5 hover:border-blue-500/30",
                },
                {
                  label: "Pinyin",
                  icon: "🔊",
                  path: "/pinyin",
                  bg: "hover:bg-rose-500/5 hover:border-rose-500/30",
                },
                {
                  label: "Analyzer",
                  icon: "📝",
                  path: "/analyzer",
                  bg: "hover:bg-purple-500/5 hover:border-purple-500/30",
                },
                {
                  label: "Achievements",
                  icon: "🏅",
                  path: "/achievements",
                  bg: "hover:bg-emerald-500/5 hover:border-emerald-500/30",
                },
                {
                  label: "Leaderboard",
                  icon: "🏁",
                  path: "/leaderboard",
                  bg: "hover:bg-amber-500/5 hover:border-amber-500/30",
                },
              ].map((t) => (
                <button
                  key={t.label}
                  onClick={() => navigate(t.path)}
                  className={`flex flex-col items-center gap-3 p-4 bg-card border border-border/55 rounded-2xl text-xs font-bold text-text-primary transition-all duration-300 hover:-translate-y-1 hover:shadow-md cursor-pointer ${t.bg}`}
                >
                  <span className="text-2xl">{t.icon}</span>
                  <span>{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Graded Reading & Quiz Mode Bento Cards */}
          <div
            onClick={() => navigate("/reading")}
            className="col-span-1 md:col-span-2 bg-card/85 backdrop-blur-xl border border-border/50 rounded-[2.5rem] p-6 flex items-center justify-between hover:shadow-xl hover:-translate-y-1 cursor-pointer transition-all duration-300 group mt-2"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-purple-500/10 flex items-center justify-center text-3xl group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                📖
              </div>
              <div>
                <h4 className="text-base font-black text-text-primary mb-0.5">
                  Graded Reader
                </h4>
                <p className="text-xs text-text-secondary">
                  Read stories matched to your HSK level
                </p>
              </div>
            </div>
            <div className="text-purple-500 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </div>
          </div>

          <div
            onClick={() => navigate("/quiz")}
            className="col-span-1 md:col-span-2 bg-card/85 backdrop-blur-xl border border-border/50 rounded-[2.5rem] p-6 flex items-center justify-between hover:shadow-xl hover:-translate-y-1 cursor-pointer transition-all duration-300 group mt-2"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center text-3xl group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300">
                🎮
              </div>
              <div>
                <h4 className="text-base font-black text-text-primary mb-0.5">
                  Quiz Mode
                </h4>
                <p className="text-xs text-text-secondary">
                  Practice vocabulary active recall quizzes
                </p>
              </div>
            </div>
            <div className="text-amber-500 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </div>
          </div>

          {/* Stats Button */}
          <div
            onClick={() => navigate("/stats")}
            className="col-span-1 md:col-span-1 bg-card/85 backdrop-blur-xl border border-border/50 rounded-[2.5rem] p-6 flex flex-col justify-center items-center gap-2.5 hover:shadow-xl hover:-translate-y-1 cursor-pointer transition-all duration-300 group mt-2"
          >
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-2xl group-hover:scale-110 group-hover:-rotate-6 transition-transform duration-300">
              📊
            </div>
            <span className="text-xs font-bold text-text-primary">Stats</span>
          </div>

          {/* Word of the Day Lore Banner - Full Width */}
          {wotd && (
            <div
              onClick={() => navigate(`/word/${wotd.id}`)}
              className="col-span-1 md:col-span-5 bg-card/85 backdrop-blur-xl border border-orange-500/30 rounded-[2.5rem] p-6 shadow-[0_0_15px_rgba(249,115,22,0.05)] hover:shadow-[0_0_30px_rgba(249,115,22,0.15)] cursor-pointer hover:-translate-y-1 transition-all duration-300 flex flex-col md:flex-row items-center gap-6 mt-2 relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl -z-10 group-hover:bg-orange-500/20 transition-all duration-500"></div>
              <div className="flex-shrink-0 w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center text-4xl text-white font-black shadow-lg shadow-orange-500/30 group-hover:scale-110 transition-transform duration-500">
                {wotd.character}
              </div>
              <div className="flex-1 text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-orange-500 bg-orange-500/10 px-3 py-1 rounded-full border border-orange-500/20">
                    Lore Drop
                  </span>
                  <span className="text-xs text-text-secondary font-medium">
                    Word of the Day
                  </span>
                </div>
                <h3 className="text-xl font-black text-text-primary mb-1">
                  {wotd.character} ({wotd.pinyin})
                </h3>
                <p className="text-text-secondary text-sm line-clamp-1 font-medium">
                  {wotd.definition || wotd.english_definition}
                </p>
              </div>
              <div className="hidden md:flex text-orange-500 opacity-50 group-hover:opacity-100 group-hover:translate-x-2 transition-all">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3-Step Guided Tour Overlay */}
      {showTour && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-md">
          <div
            className="relative w-full max-w-md bg-card/60 backdrop-blur-3xl border border-primary/30 rounded-[2rem] p-8 shadow-2xl animate-fade-in transform hover:scale-[1.01] transition-transform duration-300"
            style={{ transformStyle: "preserve-3d", perspective: "1000px" }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent rounded-[2rem] pointer-events-none"></div>

            <button
              onClick={skipTour}
              className="absolute top-4 right-4 text-xs font-bold uppercase tracking-wider text-text-secondary hover:text-text-primary px-3 py-1 bg-surface/50 border border-border/50 rounded-xl transition-colors"
            >
              Skip
            </button>

            {tourStep === 0 && (
              <div className="text-center mt-4 animate-fade-in">
                <div className="w-16 h-16 bg-primary/20 text-primary rounded-2xl flex items-center justify-center text-3xl mx-auto mb-6 border border-primary/30">
                  🗺️
                </div>
                <h2 className="text-2xl font-black text-text-primary mb-3">
                  1. The Expedition
                </h2>
                <p className="text-text-secondary text-sm leading-relaxed mb-8">
                  Your progressive, level-by-level Chinese path. Start here to
                  learn vocabulary, pinyin, meaning, and writing structure
                  through interactive, bite-sized lessons.
                </p>
              </div>
            )}

            {tourStep === 1 && (
              <div className="text-center mt-4 animate-fade-in">
                <div className="w-16 h-16 bg-rose-500/20 text-rose-500 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-6 border border-rose-500/30">
                  🌱
                </div>
                <h2 className="text-2xl font-black text-text-primary mb-3">
                  2. Spaced Repetition
                </h2>
                <p className="text-text-secondary text-sm leading-relaxed mb-8">
                  Zihai automatically imports words you learn in your lessons
                  directly into your Flashcard deck. We use the FSRS (Spaced
                  Repetition) algorithm to schedule reviews at the optimal time
                  to guarantee retention.
                </p>
              </div>
            )}

            {tourStep === 2 && (
              <div className="text-center mt-4 animate-fade-in">
                <div className="w-16 h-16 bg-amber-500/20 text-amber-500 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-6 border border-amber-500/30">
                  ⚡
                </div>
                <h2 className="text-2xl font-black text-text-primary mb-3">
                  3. The 7-Day Sprint
                </h2>
                <p className="text-text-secondary text-sm leading-relaxed mb-8">
                  Consistency is key. Practice every day to maintain your
                  streak, finish your weekly sprint, and unlock permanent
                  cultural stories and premium theme rewards!
                </p>
              </div>
            )}

            {/* Tour Navigation Controls */}
            <div className="flex items-center justify-between mt-4">
              <div className="flex gap-1.5">
                {[0, 1, 2].map((s) => (
                  <div
                    key={s}
                    className={`w-2 h-2 rounded-full transition-all duration-300 ${s === tourStep ? "bg-primary w-6" : "bg-surface border border-border/50"}`}
                  />
                ))}
              </div>
              <button
                onClick={nextTourStep}
                className="px-6 py-3 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary-hover shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
              >
                {tourStep === 2 ? "Let's Go!" : "Next →"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default HomePage;
