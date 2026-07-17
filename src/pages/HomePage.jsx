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
import DailyQuests from "../components/DailyQuests";
import ActivityHeatmap from "../components/ActivityHeatmap";

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

      <header className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-end animate-fade-in">
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

        <h1 className="text-[5rem] sm:text-[6.5rem] md:text-[8rem] lg:text-[9.5rem] font-black bg-gradient-to-r from-primary via-rose-500 to-orange-500 bg-clip-text text-transparent mb-6 tracking-tight drop-shadow-sm leading-none select-none">
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
  const [stats, setStats] = useState(null);
  const [showTour, setShowTour] = useState(false);
  const [tourStep, setTourStep] = useState(0);

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

  const getFlavorText = () => {
    if (!progress) return "Ready to start your Chinese journey? 🚀";
    const streak = progress.streak_days || 0;
    const xp = progress.xp || 0;
    
    if (progress.streak_broken && progress.previous_streak > 0) {
      return `The flashcards have missed you. Let's rebuild your broken ${progress.previous_streak}-day streak! 🕯️`;
    }
    if (streak >= 7) {
      return `Unstoppable! You are on a legendary ${streak}-day streak! 🔥`;
    }
    if (streak >= 3) {
      return `${streak}-day streak! Keep the fire burning! ⚡`;
    }
    if (xp > 500) {
      return "Slow down, you're going to break the space-time continuum! 🚀";
    }
    if (xp > 200) {
      return "You are making amazing progress! Keep it up! 💪";
    }
    return "Ready to start your Chinese journey? 🚀";
  };

  const speakWord = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'zh-CN';
      utterance.rate = 0.85;
      window.speechSynthesis.speak(utterance);
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
    };
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [progRes, favRes, flashRes, histRes, wotdRes, statsRes] = await Promise.all([
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
        fetchWithTimeout(`${API_BASE}/api/stats`, { credentials: "include" }),
      ]);
      if (!progRes.ok || !favRes.ok || !flashRes.ok || !histRes.ok || !wotdRes.ok || !statsRes.ok) {
        throw new Error("Failed to load stats dashboard");
      }
      setProgress(await progRes.json());
      setFavoritesCount((await favRes.json()).length);
      setFlashcardsDue((await flashRes.json()).length);
      setHistory((await histRes.json()).slice(0, 5));
      setWotd(await wotdRes.json());
      setStats(await statsRes.json());
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
    <div className="h-full w-full bg-transparent relative z-10 overflow-hidden flex flex-col">
      {/* Background ambient glowing details */}
      <div className="absolute top-20 right-10 w-96 h-96 bg-primary/5 rounded-full blur-[120px] pointer-events-none -z-10 animate-pulse-slow"></div>
      <div className="absolute bottom-20 left-10 w-96 h-96 bg-rose-500/5 rounded-full blur-[120px] pointer-events-none -z-10 animate-pulse-slow"></div>

      <div className="max-w-6xl mx-auto px-4 pt-4 pb-4 animate-fade-in w-full lg:h-[calc(100vh-4.5rem)] flex flex-col min-h-0 justify-between gap-4">
        
        {/* Header: Greeting on left, search on right */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 w-full px-2 py-1">
          <div>
            <h1 className="text-lg sm:text-xl font-black text-text-primary">
              Welcome back, {user?.name || user?.email?.split("@")[0] || "Explorer"}!
            </h1>
            <p className="text-xs text-text-secondary font-medium mt-0.5">
              {getFlavorText()}
            </p>
          </div>
          
          {/* Unified Search Box - Styled like SearchPage.jsx */}
          <div ref={containerRef} className="relative z-20 w-full md:max-w-2xl">
            <form onSubmit={handleSubmit} className="relative group">
              <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 text-text-secondary group-focus-within:text-primary transition-colors"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search characters, pinyin, or English..."
                value={query}
                onChange={handleSearchChange}
                onKeyDown={handleKeyDown}
                className="w-full bg-surface/80 backdrop-blur-xl text-text-primary text-base sm:text-lg border-2 border-border/50 rounded-[2rem] py-3 pl-14 pr-6 outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all shadow-sm hover:shadow-md placeholder:text-text-secondary font-medium"
              />
            </form>
 
            {showDropdown && suggestions.length > 0 && (
              <div
                className="absolute top-full left-0 right-0 mt-2 bg-card/90 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl overflow-y-auto z-50 max-h-72 text-left"
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
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-bold text-primary truncate">
                        {s.pinyin}
                      </span>
                      <span className="text-xs text-text-secondary truncate">
                        {s.definition}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Main Content Layout: Hero on Left, Side Panel on Right */}
        <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-6 mt-2">
          
        {/* Main Content Layout - Two Columns (Flex Split matching HTML Layout) */}
        <div className="flex-1 px-2 pb-[20px] overflow-hidden flex flex-col lg:flex-row gap-6">
          
          {/* Left Column (Wide) */}
          <div className="flex-1 flex flex-col gap-6 min-h-0">
            {/* Continue Journey Hero Card */}
            <div 
              onClick={() => navigate("/journey")}
              className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-3xl p-6 relative overflow-hidden group cursor-pointer hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500"
            >
              {/* Subtle background glow */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
              <div className="relative z-10 flex justify-between items-start">
                <div className="max-w-[70%]">
                  <span className="inline-flex items-center gap-1.5 bg-primary/20 text-primary px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wider font-bold mb-4 border border-primary/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                    Current Focus
                  </span>
                  <h3 className="text-3xl font-black text-text-primary mb-3">Continue Journey</h3>
                  <p className="text-sm text-text-secondary mb-8 leading-relaxed">
                    Advance through your personalized HSK curriculum. Master new characters, practice writing, and perfect your tones.
                  </p>
                  {/* Progress Section */}
                  <div className="space-y-2 w-full max-w-md">
                    <div className="flex justify-between items-center text-xs font-semibold">
                      <span className="text-text-secondary">Level Progress</span>
                      <span className="text-primary font-bold">{Math.min(100, Math.max(15, (progress?.xp || 0) % 100))}%</span>
                    </div>
                    <div className="h-2 w-full bg-surface/80 rounded-full overflow-hidden border border-border/20">
                      <div 
                        className="h-full bg-gradient-to-r from-rose-500/80 via-primary to-primary rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(78,222,163,0.5)]"
                        style={{
                          width: `${Math.min(100, Math.max(15, (progress?.xp || 0) % 100))}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
                {/* Map Icon / Graphic */}
                <div className="w-24 h-24 bg-surface/50 rounded-2xl border border-border/50 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform duration-300 relative shrink-0">
                  <div className="absolute inset-0 bg-primary/5 rounded-2xl"></div>
                  <span className="text-5xl select-none">🗺️</span>
                </div>
            </div>
            </div>

            {/* Quick Stats Banner */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 shrink-0">
              <div className="bg-card/40 backdrop-blur-xl border border-border/40 rounded-2xl p-4 flex items-center gap-3">
                <span className="text-2xl select-none">🔥</span>
                <div>
                  <div className="text-[10px] uppercase font-bold tracking-wider text-text-secondary">Streak</div>
                  <div className="text-sm font-black text-text-primary">{stats?.streak || 0} Days</div>
                </div>
              </div>
              <div className="bg-card/40 backdrop-blur-xl border border-border/40 rounded-2xl p-4 flex items-center gap-3">
                <span className="text-2xl select-none">💎</span>
                <div>
                  <div className="text-[10px] uppercase font-bold tracking-wider text-text-secondary">Gems</div>
                  <div className="text-sm font-black text-text-primary">{progress?.gems || 0}</div>
                </div>
              </div>
              <div className="bg-card/40 backdrop-blur-xl border border-border/40 rounded-2xl p-4 flex items-center gap-3">
                <span className="text-2xl select-none">🃏</span>
                <div>
                  <div className="text-[10px] uppercase font-bold tracking-wider text-text-secondary">Flashcards</div>
                  <div className="text-sm font-black text-text-primary">{stats?.totalCards || 0}</div>
                </div>
              </div>
              <div className="bg-card/40 backdrop-blur-xl border border-border/40 rounded-2xl p-4 flex items-center gap-3">
                <span className="text-2xl select-none">🏆</span>
                <div>
                  <div className="text-[10px] uppercase font-bold tracking-wider text-text-secondary">Mastered</div>
                  <div className="text-sm font-black text-text-primary">{stats?.masteredCards || 0}</div>
                </div>
              </div>
            </div>

            {/* Activity Heatmap (Simulated) */}
            <div className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-3xl p-6 flex-1 flex flex-col justify-between min-h-0">
              <div className="flex justify-between items-center mb-4 shrink-0">
                <h4 className="text-lg font-black text-text-primary">Activity</h4>
                <span className="text-xs text-text-secondary">Last 365 Days</span>
              </div>
              <div className="flex-1 min-h-0 flex items-center justify-center w-full overflow-hidden">
                <ActivityHeatmap data={stats?.heatmap || []} />
              </div>
            </div>
          </div>

          {/* Right Column (Narrow) */}
          <div className="w-full lg:w-[380px] flex flex-col gap-6 shrink-0 min-h-0">
            {/* Spaced Repetition */}
            <div 
              onClick={() => (flashcardsDue > 0 ? navigate("/flashcards") : null)}
              className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-3xl p-6 flex items-center justify-between group cursor-pointer hover:bg-surface-container-high transition-colors shadow-sm shrink-0"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-surface/50 rounded-xl flex items-center justify-center border border-border/50 shadow-inner">
                  <span className="text-2xl select-none">🃏</span>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-text-primary">Spaced Repetition</h4>
                  {flashcardsDue > 0 ? (
                    <p className="text-xs font-semibold text-rose-500 mt-0.5 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                      {flashcardsDue} reviews due
                    </p>
                  ) : (
                    <p className="text-xs text-text-secondary mt-0.5">Up to date! Great job.</p>
                  )}
                </div>
              </div>
              <span className="text-text-secondary group-hover:text-primary transition-colors group-hover:translate-x-1 ml-2 select-none">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
              </span>
            </div>

            {/* Daily Quests */}
            <div className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-3xl p-6 flex-1 flex flex-col min-h-0">
              <DailyQuests onGemsUpdated={fetchData} />
            </div>

            {/* Word of the Day */}
            {wotd && (
              <div 
                onClick={() => navigate(`/word/${wotd.id}`)}
                className="bg-card/60 backdrop-blur-xl border border-orange-500/20 rounded-3xl p-5 flex items-center gap-4 relative overflow-hidden group cursor-pointer hover:border-orange-500/35 transition-all shadow-sm shrink-0"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent"></div>
                <div className={`h-14 bg-gradient-to-br from-orange-400 to-rose-500 text-white rounded-xl flex items-center justify-center font-black shadow-lg shadow-orange-500/20 relative z-10 shrink-0 ${wotd.character.length > 2 ? 'px-3 text-lg w-auto' : 'w-14 text-2xl'}`}>
                  {wotd.character}
                </div>
                <div className="relative z-10 flex-1 min-w-0">
                  <span className="text-[9px] font-bold text-orange-500 uppercase tracking-wider mb-0.5 block select-none">Word of the Day</span>
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-sm font-black text-text-primary truncate">{wotd.pinyin}</h4>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        speakWord(wotd.character);
                      }}
                      aria-label="Pronounce word"
                      className="text-text-secondary hover:text-primary transition-colors shrink-0 cursor-pointer"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M12 18.75V5.25L7.75 9.5H4.5v5h3.25L12 18.75z" /></svg>
                    </button>
                  </div>
                  <p className="text-xs text-text-secondary truncate mt-0.5">{wotd.definition || wotd.english_definition}</p>
                </div>
              </div>
            )}
          </div>
        </div>
          
        </div>

        {/* Mac-OS Style Bottom App Drawer for Tools */}
        <div className="mt-2 bg-surface/40 backdrop-blur-2xl border border-border/50 rounded-[2rem] py-3 px-4 flex justify-center shadow-lg mx-auto max-w-max shrink-0 relative z-20">
          <div className="flex items-center gap-2 sm:gap-4 lg:gap-6 overflow-x-auto lg:overflow-visible hide-scrollbar">
            {[
              { label: "HSK Levels", icon: "🔍", path: "/hsk" },
              { label: "Radicals", icon: "⼭", path: "/radicals" },
              { label: "Pinyin", icon: "🔊", path: "/pinyin" },
              { label: "Analyzer", icon: "📝", path: "/analyzer" },
              { label: "Reader", icon: "📖", path: "/reading" },
              { label: "Quiz", icon: "🎮", path: "/quiz" },
              { label: "Stats", icon: "📊", path: "/stats" },
              { label: "Achievements", icon: "🏅", path: "/achievements" },
              { label: "Leaderboard", icon: "🏁", path: "/leaderboard" }
            ].map((t) => (
              <button
                key={t.label}
                onClick={() => navigate(t.path)}
                className="group relative flex flex-col items-center justify-center w-14 h-14 lg:w-16 lg:h-16 rounded-2xl bg-card border border-border/50 hover:bg-surface hover:border-primary/50 hover:shadow-[0_0_15px_rgba(74,222,128,0.25)] transition-all duration-300 cursor-pointer shrink-0 shadow-sm"
              >
                <span className="text-2xl leading-none group-hover:scale-105 transition-transform duration-300">{t.icon}</span>
                <span className="text-[11px] font-bold text-text-primary opacity-0 group-hover:opacity-100 transition-all duration-200 absolute -top-10 whitespace-nowrap bg-surface/90 backdrop-blur px-3 py-1.5 rounded-lg border border-border shadow-xl pointer-events-none z-50 transform origin-bottom">
                  {t.label}
                  <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-surface/90 border-b border-r border-border rotate-45"></div>
                </span>
              </button>
            ))}
          </div>
        </div>
    </div>

      {/* 3-Step Guided Tour Overlay */}
      {showTour && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
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
