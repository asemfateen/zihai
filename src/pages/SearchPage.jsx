import { useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import SearchResultCard from "../components/SearchResultCard";
import API_BASE, { fetchWithTimeout } from "../api";
import { useAuth } from "../context/AuthContext";

function SearchPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get("q") || "";
  const [localQuery, setLocalQuery] = useState(q);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const { user } = useAuth();
  const abortRef = useRef(null);

  // Autocomplete suggestions state
  const [suggestions, setSuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef(null);
  const debounceRef = useRef(null);
  const autocompleteAbortRef = useRef(null);

  const displayResults = q.trim() ? results : [];

  const handleQueryChange = (e) => {
    const value = e.target.value;
    setLocalQuery(value);
    setFocusedIndex(-1);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (autocompleteAbortRef.current) autocompleteAbortRef.current.abort();

    if (value.length >= 1) {
      debounceRef.current = setTimeout(() => {
        autocompleteAbortRef.current = new AbortController();
        fetchWithTimeout(`${API_BASE}/api/search?q=${encodeURIComponent(value)}&limit=6`, {
          signal: autocompleteAbortRef.current.signal,
        })
          .then((res) => res.json())
          .then((data) => {
            if (!data) return;
            setSuggestions(data.slice(0, 6));
            setShowDropdown(true);
          })
          .catch((err) => {
            if (err.name === "AbortError") return;
            console.error("Autocomplete failed:", err);
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
        setFocusedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setFocusedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
      } else if (e.key === "Enter" && focusedIndex >= 0 && focusedIndex < suggestions.length) {
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

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (localQuery.trim()) {
      setShowDropdown(false);
      setSearchParams({ q: localQuery.trim() });
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (autocompleteAbortRef.current) autocompleteAbortRef.current.abort();
    };
  }, []);

  useEffect(() => {
    setLocalQuery(q);
  }, [q]);

  const fetchSearchResults = useCallback(async (query, signal) => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    setError(false);
    try {
      const res = await fetchWithTimeout(
        `${API_BASE}/api/search?q=${encodeURIComponent(query)}`,
        { signal },
      );
      if (!res.ok) {
        setError(true);
        return;
      }
      const data = await res.json();
      setResults(data);
    } catch (err) {
      if (err.name === "AbortError") return;
      console.error("Search failed:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;
    fetchSearchResults(q, controller.signal);
    return () => {
      controller.abort();
    };
  }, [q, fetchSearchResults]);

  const saveHistory = useCallback(async () => {
    if (!q.trim() || !user) return;
    try {
      await fetchWithTimeout(`${API_BASE}/api/history`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ query: q.trim() }),
      });
    } catch (err) {
      console.error("Failed to save search history:", err);
    }
  }, [q, user]);

  useEffect(() => {
    if (!q.trim() || !user) return;
    const timer = setTimeout(saveHistory, 500);
    return () => {
      clearTimeout(timer);
    };
  }, [q, user, saveHistory]);

  return (
    <div className="min-h-screen bg-transparent relative z-10">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Hero Search Bar */}
        <div ref={containerRef} className="mb-8 relative">
          <form onSubmit={handleSearchSubmit} className="relative group">
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
              value={localQuery}
              onChange={handleQueryChange}
              onKeyDown={handleKeyDown}
              placeholder="Search characters, pinyin, or English..."
              className="w-full bg-surface/80 backdrop-blur-xl text-text-primary text-lg sm:text-xl border-2 border-border/50 rounded-[2rem] py-4 pl-14 pr-6 outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all shadow-sm hover:shadow-md"
            />
          </form>

          {showDropdown && suggestions.length > 0 && (
            <div
              className="absolute top-full left-0 right-0 mt-2 bg-card/90 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl overflow-y-auto z-50 max-h-72"
              role="listbox"
            >
              {suggestions.map((s, i) => (
                <div
                  key={s.id}
                  onClick={() => handleSelect(s)}
                  onMouseEnter={() => setFocusedIndex(i)}
                  role="option"
                  aria-selected={i === focusedIndex ? 'true' : 'false'}
                  className={`flex items-center gap-4 px-5 py-3.5 cursor-pointer border-b border-border/30 last:border-b-0 transition-colors ${
                    i === focusedIndex ? 'bg-primary/10 text-primary' : 'text-text-primary hover:bg-surface'
                  }`}
                >
                  <span className="text-2xl font-black">{s.simplified}</span>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-primary">{s.pinyin}</span>
                    <span className="text-xs text-text-secondary line-clamp-1">{s.definition}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions (Empty State) */}
        {!q.trim() && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-fade-in">
            <div className="bg-card/50 backdrop-blur-md border border-border/50 rounded-2xl p-5 flex flex-col items-center justify-center text-center hover:bg-surface hover:-translate-y-1 transition-all cursor-not-allowed opacity-70">
              <div className="w-12 h-12 bg-blue-500/10 text-blue-500 rounded-full flex items-center justify-center mb-3">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </div>
              <span className="font-bold text-sm text-text-primary">
                Camera
              </span>
              <span className="text-xs text-text-secondary">Coming soon</span>
            </div>
            <div className="bg-card/50 backdrop-blur-md border border-border/50 rounded-2xl p-5 flex flex-col items-center justify-center text-center hover:bg-surface hover:-translate-y-1 transition-all cursor-not-allowed opacity-70">
              <div className="w-12 h-12 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mb-3">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                  />
                </svg>
              </div>
              <span className="font-bold text-sm text-text-primary">
                Handwriting
              </span>
              <span className="text-xs text-text-secondary">Coming soon</span>
            </div>
          </div>
        )}

        {q.trim() && displayResults.length > 0 && (
          <h2 className="text-sm font-bold tracking-widest uppercase text-text-secondary mb-4 ml-2">
            {displayResults.length} Results Found
          </h2>
        )}

        {loading && (
          <div className="flex flex-col gap-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-xl p-5"
              >
                <div className="flex items-center gap-4">
                  <div className="skeleton w-14 h-14 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <div className="skeleton h-5 w-32" />
                    <div className="skeleton h-4 w-48" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="text-center py-12 text-red-400">
            <p className="text-lg font-medium">Something went wrong.</p>
            <p className="text-sm mt-1 mb-4">Please try again.</p>
            <button
              onClick={() => {
                if (abortRef.current) abortRef.current.abort();
                const controller = new AbortController();
                abortRef.current = controller;
                fetchSearchResults(q, controller.signal);
              }}
              className="px-5 py-2 bg-primary text-text-primary rounded-lg hover:bg-primary-hover transition-colors font-medium"
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && q.trim() && displayResults.length === 0 && (
          <div className="text-center py-12 text-text-secondary">
            No results found for "{q}"
          </div>
        )}

        {!loading && displayResults.length > 0 && (
          <div className="flex flex-col gap-3">
            {displayResults.map((result, index) => (
              <SearchResultCard key={result.id} result={result} index={index} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default SearchPage;
