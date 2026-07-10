import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import API_BASE, { fetchWithTimeout } from "../api";
import { ClockIcon, CheckIcon, XIcon } from "../components/Icons";
import confetti from "canvas-confetti";

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function MockTestPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [phase, setPhase] = useState("setup");
  const [hskLevel, setHskLevel] = useState(1);
  const [test, setTest] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);
  const [reviewMode, setReviewMode] = useState(false);
  const submitting = useRef(false);

  const current = test?.questions?.[currentIndex];

  const startTest = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithTimeout(`${API_BASE}/api/mock-test/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hsk_level: hskLevel }),
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to generate test");
      }
      const data = await res.json();
      setTest(data);
      setTimeLeft(data.time_limit || 1800);
      setCurrentIndex(0);
      setSelected(null);
      setAnswers(new Array(data.questions.length).fill(null));
      setReviewMode(false);
      setPhase("active");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (option) => {
    if (selected !== null) return;
    setSelected(option);
    const newAnswers = [...answers];
    newAnswers[currentIndex] = {
      questionId: current?.id,
      selected: option,
      correct: current?.answer,
    };
    setAnswers(newAnswers);
  };

  const handleNext = () => {
    if (currentIndex + 1 < (test?.questions?.length || 0)) {
      setCurrentIndex((i) => i + 1);
      setSelected(null);
    } else {
      submitTest();
    }
  };

  const submitTest = useCallback(async () => {
    if (submitting.current) return;
    submitting.current = true;
    const timeTaken = (test?.time_limit || 1800) - timeLeft;
    try {
      const res = await fetchWithTimeout(`${API_BASE}/api/mock-test/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hsk_level: test?.hsk_level || hskLevel,
          answers: answers.map((a, i) => ({
            questionId: test.questions[i].id,
            selected: a?.selected || null,
            correct: test.questions[i].answer,
          })),
          time_taken: timeTaken,
        }),
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setResults(data);
        setPhase("results");
        if (data.percentage >= 60) {
          confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
        }
      } else {
        submitting.current = false;
      }
    } catch (err) {
      console.error("Failed to submit:", err);
      submitting.current = false;
    }
  }, [answers, test, timeLeft, hskLevel]);

  useEffect(() => {
    if (phase === "active" && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft((t) => {
          if (submitting.current) {
            clearInterval(timer);
            return t;
          }
          if (t <= 1) {
            clearInterval(timer);
            submitTest();
            return 0;
          }
          return t - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [phase, timeLeft, submitTest]);

  if (!user) return null;

  if (loading) {
    return (
      <div className="min-h-screen bg-transparent relative z-10 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-text-secondary text-lg font-medium">
            Generating mock test...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-transparent relative z-10 flex items-center justify-center px-4">
        <div className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-3xl p-8 max-w-md text-center">
          <p className="text-red-400 font-bold mb-4">{error}</p>
          <button
            onClick={() => setPhase("setup")}
            className="px-6 py-3 bg-primary text-white rounded-xl font-bold"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (phase === "results") {
    const passed = (results?.percentage || 0) >= 60;
    return (
      <div className="min-h-screen bg-transparent relative z-10 pb-20">
        <div className="max-w-2xl mx-auto px-4 pt-24">
          <div className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-3xl p-8 text-center">
            <div
              className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-6 ${passed ? "bg-emerald-500/20" : "bg-rose-500/20"}`}
            >
              <span className="text-5xl">{passed ? "🎉" : "💪"}</span>
            </div>
            <h1 className="text-3xl font-black text-text-primary mb-2">
              {passed ? "Test Passed!" : "Keep Practicing!"}
            </h1>
            <p className="text-text-secondary mb-8">
              HSK Level {test?.hsk_level || hskLevel}
            </p>
            <div className="flex justify-center gap-8 mb-8">
              <div>
                <p className="text-4xl font-black text-primary">
                  {results?.score}
                </p>
                <p className="text-sm text-text-secondary">Correct</p>
              </div>
              <div className="w-px bg-border/50" />
              <div>
                <p className="text-4xl font-black text-text-secondary">
                  {results?.total}
                </p>
                <p className="text-sm text-text-secondary">Total</p>
              </div>
              <div className="w-px bg-border/50" />
              <div>
                <p
                  className={`text-4xl font-black ${passed ? "text-emerald-500" : "text-rose-500"}`}
                >
                  {results?.percentage}%
                </p>
                <p className="text-sm text-text-secondary">Score</p>
              </div>
            </div>
            <div className="flex justify-center gap-4">
              <button
                onClick={() => setReviewMode(true)}
                className="px-6 py-3 bg-emerald-500 text-white rounded-2xl font-bold hover:scale-105 transition-all cursor-pointer"
              >
                Review Answers
              </button>
              <button
                onClick={startTest}
                className="px-6 py-3 bg-primary text-white rounded-2xl font-bold hover:scale-105 transition-all cursor-pointer"
              >
                Retry
              </button>
              <button
                onClick={() => navigate("/")}
                className="px-6 py-3 bg-surface text-text-primary border border-border/50 rounded-2xl font-bold hover:scale-105 transition-all cursor-pointer"
              >
                Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "results" && reviewMode && test) {
    return (
      <div className="min-h-screen bg-transparent relative z-10 pb-32">
        <div className="max-w-2xl mx-auto px-4 pt-24 animate-fade-in">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-black text-text-primary">Review Answers</h1>
            <button
              onClick={() => setReviewMode(false)}
              className="px-4 py-2 bg-surface text-text-primary border border-border/50 rounded-xl font-bold hover:scale-102 transition-transform cursor-pointer"
            >
              Back to Score
            </button>
          </div>

          <div className="space-y-4">
            {test.questions.map((q, idx) => {
              const userAnswer = answers[idx]?.selected;
              const isCorrect = userAnswer === q.answer;

              return (
                <div 
                  key={q.id}
                  className={`bg-card/85 backdrop-blur-xl border rounded-3xl p-6 shadow-sm ${
                    isCorrect ? 'border-emerald-500/20' : 'border-rose-500/25'
                  }`}
                >
                  <div className="flex justify-between items-start gap-4 mb-4">
                    <div>
                      <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md ${
                        q.section === 1 ? 'bg-emerald-500/10 text-emerald-500' :
                        q.section === 2 ? 'bg-blue-500/10 text-blue-500' :
                        'bg-purple-500/10 text-purple-500'
                      }`}>
                        Q{idx + 1} - {q.type === 'vocabulary' ? 'Vocabulary' : q.type === 'pinyin' ? 'Pinyin' : 'Character'}
                      </span>
                    </div>
                    <span className={`text-sm font-bold flex items-center gap-1 ${
                      isCorrect ? 'text-emerald-500' : 'text-rose-500'
                    }`}>
                      {isCorrect ? (
                        <>
                          <CheckIcon className="w-4 h-4 text-emerald-500" /> Correct
                        </>
                      ) : (
                        <>
                          <XIcon className="w-4 h-4 text-rose-500" /> Incorrect
                        </>
                      )}
                    </span>
                  </div>

                  <div className="mb-4">
                    <p className="text-xs text-text-secondary uppercase font-bold tracking-wider mb-1">Question Prompt</p>
                    <p className="text-3xl font-black text-text-primary">{q.prompt}</p>
                    {q.pinyin && (
                      <p className="text-sm font-medium text-primary mt-1">{q.pinyin}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-1">Options</p>
                    {q.options.map((opt, oIdx) => {
                      let optClass = "border-border/50 bg-surface/30 text-text-primary";
                      if (opt === q.answer) {
                        optClass = "border-emerald-500/30 bg-emerald-500/10 text-emerald-500 font-bold";
                      } else if (opt === userAnswer && !isCorrect) {
                        optClass = "border-rose-500/30 bg-rose-500/10 text-rose-500 font-bold";
                      }

                      return (
                        <div
                          key={oIdx}
                          className={`p-3 border rounded-xl text-sm flex justify-between items-center ${optClass}`}
                        >
                          <span>{opt}</span>
                          {opt === q.answer && <CheckIcon className="w-4 h-4 text-emerald-500" />}
                          {opt === userAnswer && !isCorrect && <XIcon className="w-4 h-4 text-rose-500" />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (phase === "active" && test) {
    return (
      <div className="min-h-screen bg-transparent relative z-10 pb-20">
        <div className="max-w-3xl mx-auto px-4 pt-24">
          <div className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-3xl p-4 sm:p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <span className="text-xs font-bold uppercase tracking-widest text-text-secondary">
                  HSK {test.hsk_level}
                </span>
                <span className="text-xs font-bold uppercase tracking-widest text-text-secondary">
                  Q {currentIndex + 1}/{test.questions.length}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider ${
                  current?.section === 1 ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                  current?.section === 2 ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' :
                  'bg-purple-500/10 text-purple-500 border border-purple-500/20'
                }`}>
                  {current?.section === 1 ? 'Section 1: Vocabulary' :
                   current?.section === 2 ? 'Section 2: Pinyin' :
                   'Section 3: Characters'}
                </span>
              </div>
              <div
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm ${timeLeft < 300 ? "bg-rose-500/20 text-rose-400 animate-pulse" : "bg-surface text-text-primary"}`}
              >
                <ClockIcon className="w-4 h-4" />
                {formatTime(timeLeft)}
              </div>
            </div>
            <div className="w-full h-2 bg-surface rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{
                  width: `${((currentIndex + 1) / test.questions.length) * 100}%`,
                }}
              />
            </div>
          </div>

          <div className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-3xl p-6 sm:p-8 mb-6">
            {current?.type === "vocabulary" && (
              <div className="text-center">
                <p className="text-sm text-text-secondary mb-2 font-medium uppercase tracking-wider">
                  Select the correct definition
                </p>
                <p className="text-6xl sm:text-7xl font-black text-text-primary mb-2">
                  {current.prompt}
                </p>
                {current.pinyin && (
                  <p className="text-lg text-primary font-medium">
                    {current.pinyin}
                  </p>
                )}
              </div>
            )}
            {current?.type === "pinyin" && (
              <div className="text-center">
                <p className="text-sm text-text-secondary mb-2 font-medium uppercase tracking-wider">
                  Select the correct pinyin
                </p>
                <p className="text-6xl sm:text-7xl font-black text-text-primary mb-2">
                  {current.prompt}
                </p>
              </div>
            )}
            {current?.type === "reverse" && (
              <div className="text-center">
                <p className="text-sm text-text-secondary mb-2 font-medium uppercase tracking-wider">
                  Select the correct character
                </p>
                <p className="text-2xl text-text-secondary font-medium mb-4">
                  {current.prompt}
                </p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {current?.options.map((opt, i) => {
              let btnClass =
                "bg-card/80 backdrop-blur-xl border border-border/50 text-text-primary hover:bg-surface hover:border-primary/50";
              if (selected === opt) {
                btnClass = "bg-primary/20 border-primary text-primary";
              }
              return (
                <button
                  key={i}
                  onClick={() => handleSelect(opt)}
                  disabled={selected !== null}
                  className={`w-full p-4 rounded-2xl text-lg font-medium border-2 transition-all text-left ${btnClass}`}
                >
                  {opt}
                </button>
              );
            })}
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={handleNext}
              disabled={selected === null}
              className={`px-8 py-3 rounded-2xl font-bold text-lg transition-all ${
                selected !== null
                  ? "bg-primary text-white hover:bg-primary-hover shadow-lg shadow-primary/30"
                  : "bg-surface text-text-secondary cursor-not-allowed"
              }`}
            >
              {currentIndex + 1 < test.questions.length ? "Next →" : "Submit"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent relative z-10 pb-20">
      <div className="max-w-2xl mx-auto px-4 pt-24">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black text-text-primary mb-2">
            HSK Mock Test
          </h1>
          <p className="text-text-secondary">
            Simulate the real HSK exam experience
          </p>
        </div>

        <div className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-3xl p-8 shadow-sm">
          <div className="mb-6">
            <label className="block text-sm font-bold text-text-secondary uppercase tracking-wider mb-3">
              Select HSK Level
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {[1, 2, 3, 4, 5, 6].map((level) => (
                <button
                  key={level}
                  onClick={() => setHskLevel(level)}
                  className={`py-3 rounded-2xl font-bold text-lg transition-all ${
                    hskLevel === level
                      ? "bg-primary text-white shadow-lg shadow-primary/30"
                      : "bg-surface text-text-secondary hover:bg-surface/80 border border-border/50"
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-surface/50 rounded-2xl p-4 mb-6 space-y-2 text-sm text-text-secondary">
            <p>
              • <strong>30 questions</strong> across vocabulary, pinyin, and
              character recognition
            </p>
            <p>
              • <strong>30-minute time limit</strong> with auto-submit
            </p>
            <p>• Score breakdown by section at the end</p>
            <p>• Track your progress with past results</p>
          </div>

          <button
            onClick={startTest}
            className="w-full py-4 bg-primary text-white rounded-2xl font-bold text-lg hover:bg-primary-hover transition-all shadow-lg shadow-primary/30"
          >
            Start Test
          </button>
        </div>
      </div>
    </div>
  );
}
