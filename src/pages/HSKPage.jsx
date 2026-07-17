import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import API_BASE, { fetchWithTimeout } from "../api";
import {
  CheckIcon,
  PlusIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PlayIcon,
  SpeakerIcon,
  SpeakerWaveIcon,
} from "../components/Icons";
import { useSpeechSynthesis } from "../hooks/useSpeechSynthesis";
import { cleanDefinition } from "../utils/text";

function HSKPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { speak, isSpeaking, supported } = useSpeechSynthesis();
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [words, setWords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalWords, setTotalWords] = useState(0);
  const [actionLoading, setActionLoading] = useState({});
  const [toast, setToast] = useState(null);

  const HSK_LEVELS = [
    {
      level: 1,
      name: "Foundation",
      desc: "HSK 1 · 150 Words",
      position: "left",
    },
    {
      level: 2,
      name: "Elementary",
      desc: "HSK 2 · 300 Words",
      position: "right",
    },
    {
      level: 3,
      name: "Intermediate",
      desc: "HSK 3 · 600 Words",
      position: "left",
    },
    {
      level: 4,
      name: "Conversational",
      desc: "HSK 4 · 1200 Words",
      position: "right",
    },
    {
      level: 5,
      name: "Advanced",
      desc: "HSK 5 · 2500 Words",
      position: "left",
    },
    {
      level: 6,
      name: "Mastery",
      desc: "HSK 6 · 5000+ Words",
      position: "right",
    },
  ];

  const showToastMessage = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const fetchWords = useCallback(async (level, pageNum) => {
    setLoading(true);
    try {
      const res = await fetchWithTimeout(
        `${API_BASE}/api/hsk/${level}?page=${pageNum}&limit=50`,
        {
          credentials: "include",
        },
      );
      if (res.ok) {
        const data = await res.json();
        setWords(data.words);
        setTotalPages(data.totalPages);
        setTotalWords(data.total);
      } else {
        showToastMessage("We couldn't load your vocabulary right now.");
      }
    } catch (err) {
      console.error("Fetch words failed:", err);
      showToastMessage("Network error loading vocabulary");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    if (selectedLevel !== null) {
      fetchWords(selectedLevel, page);
    }
  }, [user, navigate, selectedLevel, page, fetchWords]);

  const handleSelectLevel = (level) => {
    setSelectedLevel(level);
    setPage(1);
    setWords([]);
  };

  const handleToggleDeck = async (word) => {
    const wordId = word.id;
    setActionLoading((prev) => ({ ...prev, [wordId]: true }));
    const inDeck = word.inDeck;
    const url = inDeck
      ? `${API_BASE}/api/flashcards/${wordId}`
      : `${API_BASE}/api/flashcards/${wordId}/add`;
    const method = inDeck ? "DELETE" : "POST";

    try {
      const res = await fetchWithTimeout(url, {
        method,
        credentials: "include",
      });
      if (res.ok) {
        setWords((prev) =>
          prev.map((w) => (w.id === wordId ? { ...w, inDeck: !inDeck } : w)),
        );
        showToastMessage(
          inDeck ? "Removed from flashcards" : "Added to flashcards",
        );
      } else {
        showToastMessage("We couldn't complete that action. Please give it another try.");
      }
    } catch (err) {
      console.error("Toggle deck item failed:", err);
      showToastMessage("Network error updating deck status");
    }
    setActionLoading((prev) => ({ ...prev, [wordId]: false }));
  };

  return (
    <div className="min-h-screen bg-transparent relative z-10 text-text-primary">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {toast && (
          <div className="fixed top-20 left-1/2 transform -translate-x-1/2 bg-card/80 backdrop-blur-xl border border-border/50 px-4 py-2 rounded-lg shadow-xl text-sm font-medium text-text-primary z-50 animate-fade-in">
            {toast}
          </div>
        )}

        {selectedLevel === null ? (
          <div className="flex flex-col items-center">
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold mb-3 tracking-tight text-text-primary">
                The Path to Mastery
              </h1>
              <p className="text-text-secondary text-base max-w-lg mx-auto">
                Follow the skill tree to master Mandarin Chinese, from
                foundation to absolute fluency.
              </p>
            </div>

            <div className="relative w-full max-w-2xl mx-auto py-8">
              {/* Central Path Line */}
              <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-border/50 transform -translate-x-1/2 rounded-full hidden sm:block"></div>

              <div className="space-y-16 sm:space-y-24 relative">
                {HSK_LEVELS.map((lvl, index) => (
                  <div
                    key={lvl.level}
                    className={`flex w-full items-center justify-between animate-fade-in`}
                    style={{ animationDelay: `${(index + 1) * 150}ms` }}
                  >
                    {/* Left Node */}
                    <div
                      className={`w-[calc(50%-2rem)] flex ${lvl.position === "left" ? "justify-end" : "justify-end opacity-0 pointer-events-none hidden sm:flex"}`}
                    >
                      {lvl.position === "left" && (
                        <div className="bg-card/90 backdrop-blur-xl border-2 border-border/50 hover:border-primary rounded-3xl p-6 text-right w-full max-w-xs transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-primary/20 group">
                          <h2 className="text-2xl font-bold mb-1 text-text-primary group-hover:text-primary transition-colors">
                            {lvl.name}
                          </h2>
                          <p className="text-xs text-text-secondary mb-5 font-semibold tracking-wider uppercase">
                            {lvl.desc}
                          </p>
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => handleSelectLevel(lvl.level)}
                              className="px-4 py-2 bg-surface text-text-primary rounded-xl font-bold hover:bg-surface/80 transition-colors text-sm border border-border/50"
                            >
                              Browse
                            </button>
                            <button
                              onClick={() => navigate(`/quiz?hsk=${lvl.level}`)}
                              className="px-4 py-2 bg-primary text-text-primary rounded-xl font-bold hover:bg-primary-hover transition-colors text-sm shadow-lg shadow-primary/20"
                            >
                              Quiz
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Central Icon */}
                    <div className="hidden sm:flex relative z-10 w-16 h-16 rounded-full bg-surface border-4 border-card items-center justify-center shadow-xl text-primary font-bold text-xl shadow-primary/10">
                      {lvl.level}
                    </div>

                    {/* Mobile Center Layout */}
                    <div className="flex sm:hidden w-full justify-center">
                      <div className="bg-card/90 backdrop-blur-xl border border-border/50 rounded-3xl p-6 text-center w-full max-w-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/10">
                        <div className="w-12 h-12 rounded-full bg-surface border-2 border-primary/30 items-center justify-center text-primary font-bold text-lg mx-auto mb-3 flex">
                          {lvl.level}
                        </div>
                        <h2 className="text-2xl font-bold mb-1 text-text-primary">
                          {lvl.name}
                        </h2>
                        <p className="text-xs text-text-secondary mb-5 font-semibold tracking-wider uppercase">
                          {lvl.desc}
                        </p>
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={() => handleSelectLevel(lvl.level)}
                            className="px-4 py-2 bg-surface text-text-primary rounded-xl font-bold hover:bg-surface/80 transition-colors text-sm border border-border/50"
                          >
                            Browse
                          </button>
                          <button
                            onClick={() => navigate(`/quiz?hsk=${lvl.level}`)}
                            className="px-4 py-2 bg-primary text-text-primary rounded-xl font-bold hover:bg-primary-hover transition-colors text-sm shadow-lg shadow-primary/20"
                          >
                            Quiz
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Right Node */}
                    <div
                      className={`w-[calc(50%-2rem)] flex ${lvl.position === "right" ? "justify-start" : "justify-start opacity-0 pointer-events-none hidden sm:flex"}`}
                    >
                      {lvl.position === "right" && (
                        <div className="bg-card/90 backdrop-blur-xl border-2 border-border/50 hover:border-primary rounded-3xl p-6 text-left w-full max-w-xs transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-primary/20 group">
                          <h2 className="text-2xl font-bold mb-1 text-text-primary group-hover:text-primary transition-colors">
                            {lvl.name}
                          </h2>
                          <p className="text-xs text-text-secondary mb-5 font-semibold tracking-wider uppercase">
                            {lvl.desc}
                          </p>
                          <div className="flex gap-2 justify-start">
                            <button
                              onClick={() => navigate(`/quiz?hsk=${lvl.level}`)}
                              className="px-4 py-2 bg-primary text-text-primary rounded-xl font-bold hover:bg-primary-hover transition-colors text-sm shadow-lg shadow-primary/20"
                            >
                              Quiz
                            </button>
                            <button
                              onClick={() => handleSelectLevel(lvl.level)}
                              className="px-4 py-2 bg-surface text-text-primary rounded-xl font-bold hover:bg-surface/80 transition-colors text-sm border border-border/50"
                            >
                              Browse
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between gap-4 mb-6">
              <button
                onClick={() => setSelectedLevel(null)}
                className="px-3 py-1.5 bg-card/80 backdrop-blur-xl border border-border/50 text-text-primary rounded-lg text-sm flex items-center gap-1.5 hover:bg-surface/80 backdrop-blur-xl cursor-pointer transition-colors"
              >
                <ChevronLeftIcon className="w-4 h-4" />
                Back to Path
              </button>
              <h2 className="text-2xl font-bold text-text-primary tracking-tight">
                HSK {selectedLevel} Lexicon
              </h2>
              <button
                onClick={() => navigate(`/quiz?hsk=${selectedLevel}`)}
                className="px-4 py-2 bg-primary text-text-primary rounded-lg font-semibold hover:bg-primary-hover transition-colors flex items-center gap-2 text-sm cursor-pointer shadow-lg shadow-primary/20"
              >
                <PlayIcon className="w-4.5 h-4.5" />
                Quiz Me
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
              {loading ? (
                <div className="col-span-full py-20 flex justify-center items-center">
                  <span className="animate-spin text-primary font-bold text-3xl">
                    🍵
                  </span>
                </div>
              ) : words.length === 0 ? (
                <div className="col-span-full py-12 text-center text-text-secondary text-sm bg-card/80 backdrop-blur-xl border border-border/50 rounded-3xl shadow-sm">
                  No words found in this branch.
                </div>
              ) : (
                words.map((word, index) => (
                  <div
                    key={word.id}
                    className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-3xl p-5 flex flex-col justify-between hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 animate-fade-in group min-h-[140px]"
                    style={{ animationDelay: `${((index % 10) + 1) * 50}ms` }}
                  >
                    <div className="space-y-2">
                      <div className="flex items-baseline gap-2">
                        <span
                          className="text-3xl font-bold cursor-pointer hover:text-primary transition-colors text-text-primary"
                          onClick={() =>
                            navigate(
                              `/word/${encodeURIComponent(word.character)}`,
                            )
                          }
                        >
                          {word.character}
                        </span>
                        <span className="text-sm font-semibold text-primary">
                          {word.pinyin}
                        </span>
                      </div>
                      <p
                        className="text-sm text-text-secondary line-clamp-2"
                        title={
                          word.english_definition || "No definition available"
                        }
                      >
                        {cleanDefinition(word.english_definition)}
                      </p>
                    </div>

                    <div className="flex items-center justify-end gap-2 mt-4 opacity-70 group-hover:opacity-100 transition-opacity">
                      {supported && (
                        <button
                          onClick={() => speak(word.character)}
                          className={`p-2 border rounded-xl flex items-center justify-center transition-all cursor-pointer hover:scale-110 active:scale-95 ${
                            isSpeaking
                              ? "bg-primary/20 border-primary text-primary animate-pulse"
                              : "bg-surface border-border/50 text-text-secondary hover:border-primary hover:text-primary hover:bg-primary/5"
                          }`}
                          title="Listen to pronunciation"
                        >
                          {isSpeaking ? (
                            <SpeakerWaveIcon className="w-4 h-4" />
                          ) : (
                            <SpeakerIcon className="w-4 h-4" />
                          )}
                        </button>
                      )}
                      <button
                        onClick={() => handleToggleDeck(word)}
                        disabled={actionLoading[word.id]}
                        className={`p-2 border rounded-xl flex items-center justify-center transition-all cursor-pointer hover:scale-110 active:scale-95 ${
                          word.inDeck
                            ? "bg-primary/15 border-primary/30 text-primary hover:bg-primary/25"
                            : "bg-surface border-border/50 text-text-secondary hover:border-primary hover:text-primary hover:bg-primary/5"
                        }`}
                      >
                        {actionLoading[word.id] ? (
                          <span className="w-4 h-4 flex items-center justify-center text-xs animate-spin font-bold">
                            ...
                          </span>
                        ) : word.inDeck ? (
                          <CheckIcon className="w-4 h-4" />
                        ) : (
                          <PlusIcon className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-4 py-4">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="p-2 bg-card/80 backdrop-blur-xl border border-border/50 rounded-lg text-text-primary disabled:opacity-50 hover:bg-surface/80 backdrop-blur-xl cursor-pointer transition-colors shadow-sm"
                >
                  <ChevronLeftIcon className="w-5 h-5" />
                </button>
                <span className="text-sm text-text-secondary font-medium">
                  Page {page} of {totalPages}
                </span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="p-2 bg-card/80 backdrop-blur-xl border border-border/50 rounded-lg text-text-primary disabled:opacity-50 hover:bg-surface/80 backdrop-blur-xl cursor-pointer transition-colors shadow-sm"
                >
                  <ChevronRightIcon className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default HSKPage;
