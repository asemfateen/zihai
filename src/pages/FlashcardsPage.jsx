import { useState, useEffect, useRef, useLayoutEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import API_BASE, { fetchWithTimeout } from "../api";
import { useSpeechSynthesis } from "../hooks/useSpeechSynthesis";
import { CheckIcon, SpeakerIcon, SpeakerWaveIcon, XIcon } from "../components/Icons";
import StrokeOrderSection from "../components/StrokeOrderSection";
import confetti from "canvas-confetti";
import { motion, AnimatePresence } from "framer-motion";

function FlashcardsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [cards, setCards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [complete, setComplete] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [cardPhase, setCardPhase] = useState("idle");
  const [toast, setToast] = useState(null);
  const [error, setError] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [incorrectCount, setIncorrectCount] = useState(0);
  const [skippedIds, setSkippedIds] = useState(new Set());
  // Removed custom drag state since framer-motion handles it
  const transitionTimerRef = useRef(null);
  const toastTimerRef = useRef(null);
  const mountedRef = useRef(true);

  const fetchDueCardsRef = useRef(null);
  const sessionDeckRef = useRef([]);

  useEffect(() => {
    fetchDueCardsRef.current = async () => {
      setError(false);
      setLoading(true);
      try {
        const res = await fetchWithTimeout(`${API_BASE}/api/flashcards/due`, {
          credentials: "include",
        });
        if (!mountedRef.current) return;
        if (res.ok) {
          const data = await res.json();
          if (!mountedRef.current) return;
          const mapped = data.map((c) => ({
            ...c,
            simplified: c.character,
            definition: c.english_definition,
          }));
          setCards(mapped);
          if (mapped.length > 0) sessionDeckRef.current = mapped;
          setError(false);
        } else {
          setError(true);
        }
      } catch (err) {
        console.error("Failed to fetch due cards:", err);
        if (mountedRef.current) setError(true);
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    };
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    if (!user) {
      navigate("/login");
      return;
    }
    const controller = new AbortController();
    fetchDueCardsRef.current();
    return () => {
      controller.abort();
      mountedRef.current = false;
      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [user, navigate]);

  const { speak: speakTTS, isSpeaking, isLoading } = useSpeechSynthesis();

  const currentCharacter =
    cards[currentIndex]?.character || cards[currentIndex]?.simplified;
  const speak = () => {
    if (!currentCharacter) return;
    speakTTS(currentCharacter);
  };

  const showToast = (message) => {
    setToast(message);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      if (mountedRef.current) setToast(null);
    }, 2500);
  };

  const cardsRef = useRef([]);
  useLayoutEffect(() => {
    cardsRef.current = cards;
  });

  const advanceToNext = (newCards) => {
    setFlipped(false);
    setCardPhase("exiting");
    transitionTimerRef.current = setTimeout(() => {
      if (!mountedRef.current) return;
      if (newCards) {
        setCards(newCards);
        setCurrentIndex(0);
      } else {
        setCurrentIndex((prev) => prev + 1);
      }
      setCardPhase("entering");
      transitionTimerRef.current = setTimeout(() => {
        if (mountedRef.current) setCardPhase("idle");
        setAnimating(false);
      }, 350);
    }, 350);
  };

  const handleResult = async (quality) => {
    if (animating || cardPhase !== "idle") return;
    setAnimating(true);
    const currentCards = cardsRef.current;
    const idx = currentIndex;
    const word = currentCards[idx];
    if (!word) {
      setAnimating(false);
      return;
    }

    let apiError = null;
    try {
      const res = await fetchWithTimeout(
        `${API_BASE}/api/flashcards/${word.id}/result`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ quality }),
        },
      );
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        apiError = errData.error || "Failed to save result";
        showToast(apiError);
        setAnimating(false);
        return;
      }
    } catch (err) {
      setAnimating(false);
      return;
    }

    if (quality >= 3) {
      setCorrectCount((prev) => prev + 1);
      if (idx + 1 >= currentCards.length) {
        setComplete(true);
        confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
        setAnimating(false);
      } else {
        advanceToNext(null);
      }
    } else {
      setIncorrectCount((prev) => prev + 1);
      if (currentCards.length <= 1) {
        setComplete(true);
        confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
        setAnimating(false);
      } else {
        const reshuffled = [
          ...currentCards.slice(0, idx),
          ...currentCards.slice(idx + 1),
          word,
        ];
        advanceToNext(reshuffled);
      }
    }
  };

  const handleSkip = () => {
    if (animating || cardPhase !== "idle") return;
    setAnimating(true);
    const currentCards = cardsRef.current;
    const idx = currentIndex;
    const card = currentCards[idx];
    if (!card) {
      setAnimating(false);
      return;
    }
    const newSkipped = new Set(skippedIds);
    newSkipped.add(card.id);
    setSkippedIds(newSkipped);

    if (newSkipped.size >= currentCards.length) {
      setComplete(true);
      setAnimating(false);
      return;
    }

    const remaining = currentCards.filter((_, i) => i !== idx);
    const reshuffled = [...remaining, card];
    advanceToNext(reshuffled);
  };

  const handleDragEnd = (event, info) => {
    const offset = info.offset.x;
    const velocity = info.velocity.x;

    if (offset > 100 || velocity > 500) {
      handleResult(4); // Remembered
    } else if (offset < -100 || velocity < -500) {
      handleResult(0); // Forgot
    }
  };

  if (!user) return null;

  if (loading) {
    return (
      <div className="min-h-screen bg-transparent relative z-10">
        <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
          <div className="skeleton w-full h-3 rounded-full" />
          <div className="skeleton w-full min-h-80 rounded-2xl" />
          <div className="flex gap-4">
            <div className="skeleton flex-1 h-14 rounded-xl" />
            <div className="skeleton flex-1 h-14 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-transparent relative z-10">
        <div className="flex flex-col items-center justify-center py-20 px-4">
          <p className="text-lg font-medium text-red-400 mb-2">
            Something went wrong.
          </p>
          <p className="text-sm text-red-400 mb-6">Please try again.</p>
          <button
            onClick={() => fetchDueCardsRef.current()}
            className="px-6 py-3 bg-primary text-text-primary rounded-lg hover:bg-primary-hover transition-colors font-medium"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="min-h-screen bg-transparent relative z-10">
        <div className="flex flex-col items-center justify-center py-20 px-4">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4 bg-primary/20">
            <CheckIcon className="w-8 h-8" style={{ stroke: "#c0392b" }} />
          </div>
          <h1 className="text-3xl font-bold text-text-primary mb-2">
            All caught up!
          </h1>
          <p className="text-text-secondary text-lg mb-6 text-center">
            No cards due for review right now. Check back later.
          </p>
          <button
            onClick={() => navigate("/")}
            className="px-6 py-3 bg-primary text-text-primary rounded-lg hover:bg-primary-hover transition-colors font-medium"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  if (complete) {
    return (
      <div className="min-h-screen bg-transparent relative z-10">
        <div className="flex flex-col items-center justify-center py-20 px-4">
          <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mb-6">
            <CheckIcon className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-text-primary mb-2">
            Session complete!
          </h1>
          <p className="text-text-secondary text-lg mb-2 text-center">
            You reviewed {cards.length} card{cards.length > 1 ? "s" : ""}.
          </p>
          <p className="text-text-secondary mb-6 text-center">
            <span className="text-green-400">{correctCount} correct</span>{" "}
            &middot;{" "}
            <span className="text-red-400">{incorrectCount} to review</span>
          </p>
          <div className="flex gap-4">
            <button
              onClick={() => {
                setCards([...sessionDeckRef.current]);
                setComplete(false);
                setCurrentIndex(0);
                setFlipped(false);
                setCardPhase("idle");
                setCorrectCount(0);
                setIncorrectCount(0);
                setSkippedIds(new Set());
                setAnimating(false);
              }}
              className="px-6 py-3 bg-surface/80 backdrop-blur-xl border border-border/50 text-text-primary rounded-lg hover:border-primary transition-colors font-medium"
            >
              Review Again
            </button>
            <button
              onClick={() => {
                setComplete(false);
                setCurrentIndex(0);
                setFlipped(false);
                setCardPhase("idle");
                setCorrectCount(0);
                setIncorrectCount(0);
                setSkippedIds(new Set());
                setAnimating(false);
                fetchDueCardsRef.current();
              }}
              className="px-6 py-3 bg-surface/80 backdrop-blur-xl border border-border/50 text-text-primary rounded-lg hover:border-primary transition-colors font-medium"
            >
              Study More
            </button>
            <button
              onClick={() => navigate("/")}
              className="px-6 py-3 bg-primary text-text-primary rounded-lg hover:bg-primary-hover transition-colors font-medium"
            >
              Go Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  const progress = ((currentIndex + 1) / cards.length) * 100;
  const card = cards[currentIndex];

  return (
    <div className="min-h-screen bg-transparent relative z-10">
      <div className="max-w-lg mx-auto px-4 py-6">
        {toast && (
          <div
            className="fixed top-28 left-1/2 -translate-x-1/2 z-[60] px-5 py-2.5 bg-card/80 backdrop-blur-xl border border-border/50 rounded-lg shadow-lg text-text-primary text-sm animate-fade-in"
            role="status"
            aria-live="polite"
          >
            {toast}
          </div>
        )}
        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-text-secondary">
              {currentIndex + 1} / {cards.length}
            </span>
            <div className="flex items-center gap-3 text-xs">
              <span className="text-green-400">{correctCount} correct</span>
              <span className="text-red-400">{incorrectCount} missed</span>
            </div>
            <button
              onClick={() => navigate("/")}
              className="text-text-secondary hover:text-text-primary transition-colors"
            >
              <XIcon className="w-5 h-5" />
            </button>
          </div>
          <div className="w-full h-3 bg-surface/80 backdrop-blur-xl rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Card */}
        <div className="mb-8 relative flex justify-center perspective-[1000px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={card.id || currentIndex}
              initial={{ opacity: 0, x: 50, scale: 0.9, rotateY: 0 }}
              animate={{
                opacity: 1,
                x: 0,
                scale: 1,
                rotateY: flipped ? 180 : 0,
              }}
              exit={{
                opacity: 0,
                x: -50,
                scale: 0.9,
                transition: { duration: 0.2 },
              }}
              transition={{
                duration: 0.4,
                type: "spring",
                stiffness: 200,
                damping: 20,
              }}
              drag={flipped && cardPhase === "idle" ? "x" : false}
              dragConstraints={{ left: 0, right: 0 }}
              onDragEnd={handleDragEnd}
              onClick={() => {
                if (cardPhase === "idle" && !flipped) setFlipped(true);
              }}
              style={{ transformStyle: "preserve-3d" }}
              className={`w-full min-h-[300px] sm:min-h-[400px] group relative z-10 ${
                flipped
                  ? "cursor-grab active:cursor-grabbing"
                  : "cursor-pointer hover:-translate-y-2"
              }`}
            >
              {/* Front */}
              <div
                className="absolute inset-0 bg-card/80 backdrop-blur-xl border border-border/50 rounded-3xl flex flex-col items-center justify-center p-8 shadow-sm group-hover:shadow-xl group-hover:shadow-primary/20 transition-all duration-300"
                style={{ backfaceVisibility: "hidden" }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl"></div>
                <p className="text-8xl sm:text-9xl font-black text-text-primary mb-6 select-none drop-shadow-sm relative z-10 group-hover:scale-105 transition-transform duration-300">
                  {card.character || card.simplified}
                </p>
                <p className="text-sm font-bold uppercase tracking-widest text-text-secondary bg-surface/50 px-4 py-2 rounded-full border border-border/50 relative z-10 shadow-sm">
                  Tap to reveal
                </p>
              </div>

              {/* Back */}
              <div
                className="absolute inset-0 bg-card/80 backdrop-blur-xl border border-border/50 rounded-3xl flex flex-col items-center justify-center p-8 shadow-xl shadow-primary/10"
                style={{
                  backfaceVisibility: "hidden",
                  transform: "rotateY(180deg)",
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-100 rounded-3xl"></div>
                <div className="relative z-10 flex flex-col items-center w-full h-full justify-between">
                  <div className="flex-1 flex flex-col items-center justify-center w-full pointer-events-none select-none">
                    <div className="flex items-center gap-4 mb-6 pointer-events-auto">
                      <p className="text-3xl sm:text-4xl font-bold text-primary drop-shadow-sm">
                        {card.pinyin}
                      </p>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          speak();
                        }}
                        className={`flex items-center justify-center w-12 h-12 rounded-full bg-surface/80 backdrop-blur-xl border border-border/50 text-text-secondary hover:text-primary hover:border-primary hover:shadow-md hover:shadow-primary/20 transition-all hover:scale-105 active:scale-95 cursor-pointer ${
                          isSpeaking 
                            ? "animate-pulse text-primary border-primary shadow-md shadow-primary/20" 
                            : isLoading
                            ? "text-primary border-primary/40 shadow-md shadow-primary/10"
                            : ""
                        }`}
                      >
                        {isSpeaking ? (
                          <SpeakerWaveIcon className="w-6 h-6 animate-bounce" />
                        ) : isLoading ? (
                          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <SpeakerIcon className="w-6 h-6" />
                        )}
                      </button>
                    </div>
                    <h3 className="text-xs font-black text-text-secondary uppercase tracking-widest mb-3 bg-surface inline-block px-3 py-1 rounded-full border border-border shadow-sm">
                      Definition
                    </h3>
                    {card.definitions && card.definitions.length > 0 ? (
                      <div className="space-y-2 mt-1 max-w-sm text-left">
                        {card.definitions.map((part, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <span className="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold mt-0.5">
                              {i + 1}
                            </span>
                            <p className="text-base sm:text-lg text-text-primary font-medium">
                              {part}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xl sm:text-2xl text-text-primary text-center font-medium max-w-sm">
                        {card.english_definition ||
                          card.definition ||
                          "No definition available"}
                      </p>
                    )}

                    {card.classifiers && card.classifiers.length > 0 && (
                      <div className="flex flex-wrap gap-2 items-center mt-4 pt-3 border-t border-border/30 w-full max-w-sm">
                        <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider bg-surface px-2.5 py-0.5 rounded-full border border-border shadow-sm">Measure Words</span>
                        <div className="flex gap-1.5 flex-wrap">
                          {card.classifiers.map((c, idx) => (
                            <span key={idx} className="text-xs font-bold text-primary bg-primary/5 border border-primary/20 px-2.5 py-0.5 rounded-lg">{c}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-8 text-xs font-bold text-text-secondary/60 uppercase tracking-widest flex items-center gap-2 select-none">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="m15 18-6-6 6-6" />
                    </svg>
                    Swipe to review
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="m9 18 6-6-6-6" />
                    </svg>
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Action buttons (Fallback for Desktop/Accessibility) */}
        {flipped && cardPhase === "idle" && (
          <div className="flex gap-4 animate-fade-in [animation-delay:100ms] sm:hidden opacity-50 hover:opacity-100 transition-opacity">
            <button
              onClick={() => handleResult(0)}
              disabled={animating}
              className="flex-1 py-3 bg-surface border border-border/50 text-text-secondary rounded-xl text-sm font-medium hover:bg-surface-hover"
            >
              Forgot
            </button>
            <button
              onClick={() => handleResult(4)}
              disabled={animating}
              className="flex-1 py-3 bg-surface border border-border/50 text-text-secondary rounded-xl text-sm font-medium hover:bg-surface-hover"
            >
              Got it
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default FlashcardsPage;
