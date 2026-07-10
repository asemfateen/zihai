import { useState, useEffect, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import API_BASE, { fetchWithTimeout } from "../api";
import { useAuth } from "../context/AuthContext";
import { useSpeechSynthesis } from "../hooks/useSpeechSynthesis";
import confetti from "canvas-confetti";
import { motion, AnimatePresence } from "framer-motion";

export default function QuizPage() {
  const { user } = useAuth();
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);
  const [gameOver, setGameOver] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);
  const [error, setError] = useState(null);

  const { speak } = useSpeechSynthesis();
  const [searchParams] = useSearchParams();

  const startQuiz = useCallback(async () => {
    setLoading(true);
    setGameOver(false);
    setCurrentIndex(0);
    setScore(0);
    setStreak(0);
    setSelectedOption(null);
    setError(null);
    try {
      const hsk = searchParams.get("hsk");
      const url = hsk
        ? `${API_BASE}/api/quiz/generate?hsk=${hsk}`
        : `${API_BASE}/api/quiz/generate`;
      const res = await fetchWithTimeout(url, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        if (!data || data.length === 0) {
          throw new Error("No words available to generate a quiz for this HSK level.");
        }
        setQuestions(data);
      } else {
        throw new Error("Server returned an error generating quiz");
      }
    } catch (err) {
      console.error("Failed to load quiz:", err);
      setError(err.message || "Failed to load quiz. Please check your internet connection.");
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  useEffect(() => {
    if (user) startQuiz();
  }, [user, startQuiz]);

  const handleSelect = (option) => {
    if (selectedOption !== null) return; // Prevent multiple clicks

    setSelectedOption(option);
    const q = questions[currentIndex];

    // Play pronunciation
    speak(q.character);

    if (option === q.answer) {
      setScore((s) => s + 10 + streak * 5);
      setStreak((s) => s + 1);
    } else {
      setStreak(0);
    }

    setTimeout(() => {
      setSelectedOption(null);
      if (currentIndex + 1 >= questions.length) {
        setGameOver(true);
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
        });
      } else {
        setCurrentIndex((i) => i + 1);
      }
    }, 1500);
  };

  if (!user) return null;

  if (error) {
    return (
      <div className="min-h-screen bg-transparent relative z-10 text-text-primary flex items-center justify-center">
        <div className="bg-card/85 backdrop-blur-xl border border-border/50 rounded-3xl p-8 max-w-md text-center shadow-lg animate-fade-in mx-4">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold mb-2">Quiz Generation Failed</h2>
          <p className="text-text-secondary text-sm mb-6">{error}</p>
          <div className="flex gap-4 justify-center">
            <Link
              to="/"
              className="px-6 py-2.5 bg-surface border border-border/50 text-text-primary rounded-xl font-bold hover:scale-105 transition-transform cursor-pointer"
            >
              Dashboard
            </Link>
            <button
              onClick={startQuiz}
              className="px-6 py-2.5 bg-primary text-white rounded-xl font-bold hover:scale-105 transition-transform cursor-pointer"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-transparent relative z-10 text-text-primary flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-32 h-32 bg-card/80 backdrop-blur-xl border border-border/50 rounded-full mb-8"></div>
          <div className="text-xl font-bold">Generating Quiz...</div>
        </div>
      </div>
    );
  }

  if (gameOver) {
    return (
      <div className="min-h-screen bg-transparent relative z-10 text-text-primary pb-20">
        <div className="max-w-2xl mx-auto px-4 py-16 text-center animate-fade-in">
          <h1 className="text-5xl font-black mb-4">Quiz Complete!</h1>
          <p className="text-2xl text-text-secondary mb-12">
            Final Score: <span className="text-primary font-bold">{score}</span>
          </p>

          <div className="flex justify-center gap-4">
            <button
              onClick={startQuiz}
              className="px-8 py-4 bg-primary text-white rounded-2xl font-bold hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/20 transition-all text-lg"
            >
              Play Again
            </button>
            <Link
              to="/"
              className="px-8 py-4 bg-surface text-text-primary border border-border/50 rounded-2xl font-bold hover:-translate-y-1 hover:shadow-xl transition-all text-lg"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const q = questions[currentIndex];
  if (!q) return null;

  return (
    <div className="min-h-screen bg-transparent relative z-10 text-text-primary pb-20">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header Bar */}
        <div className="flex justify-between items-center mb-12 bg-card/80 backdrop-blur-xl border border-border/50 rounded-3xl p-6 shadow-sm">
          <div>
            <span className="text-text-secondary text-sm font-bold uppercase tracking-wider">
              Question
            </span>
            <div className="text-2xl font-black">
              {currentIndex + 1} / {questions.length}
            </div>
          </div>
          <div className="text-center">
            <span className="text-text-secondary text-sm font-bold uppercase tracking-wider">
              Streak
            </span>
            <div className="text-2xl font-black text-orange-500">
              {streak} 🔥
            </div>
          </div>
          <div className="text-right">
            <span className="text-text-secondary text-sm font-bold uppercase tracking-wider">
              Score
            </span>
            <div className="text-2xl font-black text-primary">{score}</div>
          </div>
        </div>

        {/* Card */}
        <div className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-3xl p-12 text-center mb-8 shadow-lg">
          <div className="text-2xl text-primary font-bold mb-4">{q.pinyin}</div>
          <div className="text-8xl font-black">{q.character}</div>
        </div>

        {/* Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {q.options.map((opt, i) => {
            let btnClass =
              "bg-card hover:bg-surface border-border/50 text-text-primary cursor-pointer hover:border-primary/50";
            let animationProps = {
              whileHover: { scale: 1.02, y: -2 },
              whileTap: { scale: 0.98 },
            };
            if (selectedOption !== null) {
              if (opt === q.answer) {
                btnClass =
                  "bg-emerald-500 border-emerald-600 text-white shadow-xl shadow-emerald-500/20 z-10";
                animationProps = {
                  animate: { scale: [1, 1.1, 1], rotate: [0, -2, 2, 0] },
                  transition: { duration: 0.5 },
                };
              } else if (opt === selectedOption) {
                btnClass = "bg-rose-500 border-rose-600 text-white";
                animationProps = {
                  animate: { x: [-10, 10, -10, 10, 0] },
                  transition: { duration: 0.4 },
                };
              } else {
                btnClass = "bg-surface border-border/50 opacity-50 grayscale";
                animationProps = { animate: { scale: 0.95 } };
              }
            }

            return (
              <motion.button
                key={`${currentIndex}-${i}`}
                {...animationProps}
                disabled={selectedOption !== null}
                onClick={() => handleSelect(opt)}
                className={`p-6 rounded-3xl text-left font-medium transition-colors duration-300 ${btnClass}`}
              >
                {opt}
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
