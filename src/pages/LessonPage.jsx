import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import HanziWriter from "hanzi-writer";
import confetti from "canvas-confetti";
import { motion } from "framer-motion";
import API_BASE, { fetchWithTimeout } from "../api";
import { XIcon, SpeakerIcon } from "../components/Icons";

function ProgressBar({ current, total }) {
  const percentage = Math.round((current / total) * 100);
  return (
    <div className="w-full bg-surface border border-border/50 h-3 rounded-full overflow-hidden p-[2px]">
      <div
        className="bg-gradient-to-r from-primary to-orange-500 h-full rounded-full transition-all duration-500 ease-out"
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}

export default function LessonPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const unit = parseInt(id, 10) || 1;

  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [isChecked, setIsChecked] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [xpGained, setXpGained] = useState(0);

  // Writing Quiz State
  const writerRef = useRef(null);
  const canvasRef = useRef(null);
  const [writingDone, setWritingDone] = useState(false);
  const [error, setError] = useState(null);

  const fetchLesson = () => {
    setLoading(true);
    setError(null);
    fetchWithTimeout(`${API_BASE}/api/lessons/${unit}`, {
      credentials: "include",
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load lesson questions");
        return res.json();
      })
      .then((data) => {
        if (!data.questions || data.questions.length === 0) {
          throw new Error("No questions available for this lesson unit.");
        }
        setQuestions(data.questions);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load lesson:", err);
        setError(err.message || "Failed to load lesson. Verify network settings.");
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchLesson();
  }, [unit]);

  const currentQuestion = questions[currentIndex];

  const playSuccessSound = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = "sine";
      const now = ctx.currentTime;
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(659.25, now + 0.08); // E5
      osc.frequency.setValueAtTime(783.99, now + 0.16); // G5
      osc.frequency.setValueAtTime(1046.50, now + 0.24); // C6
      
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.45);
    } catch (err) {
      console.warn("AudioContext failed to start:", err);
    }
  };

  const playFailureSound = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = "sawtooth";
      const now = ctx.currentTime;
      osc.frequency.setValueAtTime(220.00, now); // A3
      osc.frequency.setValueAtTime(147.83, now + 0.12); // F#3
      
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.35);
    } catch (err) {
      console.warn("AudioContext failed to start:", err);
    }
  };

  const finishLesson = async () => {
    setCompleted(true);
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ["#ef4444", "#f59e0b", "#3b82f6", "#10b981"],
    });

    try {
      const res = await fetchWithTimeout(
        `${API_BASE}/api/progress/lesson-complete`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ xpGained: 15, unit }),
          credentials: "include",
        },
      );
      const data = await res.json();
      setXpGained(data.xp_gained || 15);
    } catch (err) {
      console.error("Failed to post xp:", err);
    }
  };

  const handleSelectOption = (idx) => {
    if (isChecked) return;

    setSelectedAnswer(idx);
    setIsChecked(true);

    const option = currentQuestion.options[idx];
    const correct = option?.isCorrect || false;
    setIsCorrect(correct);

    if (correct) {
      playSuccessSound();
    } else {
      playFailureSound();
    }

    // Auto-advance after 1.25s delay
    setTimeout(() => {
      setIsChecked(false);
      setSelectedAnswer(null);
      if (currentIndex + 1 < questions.length) {
        setCurrentIndex((curr) => curr + 1);
      } else {
        finishLesson();
      }
    }, 1250);
  };

  // Setup HanziWriter for Writing questions
  useEffect(() => {
    if (currentQuestion?.type === "writing" && canvasRef.current) {
      canvasRef.current.innerHTML = "";
      setWritingDone(false);
      setSelectedAnswer(null);
      setIsChecked(false);

      const char = currentQuestion.targetWord.character.charAt(0);

      writerRef.current = HanziWriter.create(canvasRef.current, char, {
        width: 250,
        height: 250,
        padding: 15,
        strokeColor: "#3b82f6",
        showOutline: true,
        outlineColor: "#cbd5e1",
        drawingColor: "#10b981",
        drawingWidth: 12,
        strokeWidth: 10,
      });

      writerRef.current.quiz({
        onComplete: () => {
          setWritingDone(true);
          setSelectedAnswer("done");
          setIsChecked(true);
          setIsCorrect(true);
          playSuccessSound();

          setTimeout(() => {
            setIsChecked(false);
            setSelectedAnswer(null);
            if (currentIndex + 1 < questions.length) {
              setCurrentIndex((curr) => curr + 1);
            } else {
              finishLesson();
            }
          }, 1250);
        },
      });
    }
  }, [currentIndex, currentQuestion]);

  const playAudio = (text) => {
    const audioUrl = `${API_BASE}/api/tts?text=${encodeURIComponent(text)}`;
    const audio = new Audio(audioUrl);
    audio.play().catch((e) => console.error("Audio play blocked", e));
  };

  // Auto-play audio for listening questions
  useEffect(() => {
    if (currentQuestion?.type === "listening" && !isChecked) {
      playAudio(currentQuestion.targetWord.character);
    }
  }, [currentIndex, currentQuestion, isChecked]);

  if (error) {
    return (
      <div className="min-h-screen bg-transparent relative z-10 text-text-primary flex items-center justify-center">
        <div className="bg-card/85 backdrop-blur-xl border border-border/50 rounded-3xl p-8 max-w-md text-center shadow-lg animate-fade-in mx-4">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold mb-2">Lesson Loading Failed</h2>
          <p className="text-text-secondary text-sm mb-6">{error}</p>
          <div className="flex gap-4 justify-center">
            <Link
              to="/journey"
              className="px-6 py-2.5 bg-surface border border-border/50 text-text-primary rounded-xl font-bold hover:scale-105 transition-transform cursor-pointer"
            >
              Back
            </Link>
            <button
              onClick={fetchLesson}
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
      <div className="min-h-screen bg-transparent flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-2xl font-bold text-text-primary mb-4">
          No words found for this unit!
        </h2>
        <button onClick={() => navigate("/journey")} className="btn-primary">
          Back to Journey
        </button>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="min-h-screen bg-transparent flex flex-col items-center justify-center p-6 animate-fade-in text-center">
        <div className="w-32 h-32 bg-amber-100 rounded-full flex items-center justify-center mb-8 shadow-xl">
          <span className="text-6xl animate-bounce">🔥</span>
        </div>
        <h1 className="text-4xl font-black text-text-primary mb-4">
          Lesson Complete!
        </h1>
        <p className="text-xl text-text-secondary mb-12">
          You gained{" "}
          <span className="font-bold text-amber-500">+{xpGained} XP</span>
        </p>
        <button
          onClick={() => navigate("/journey")}
          className="w-full max-w-sm py-4 bg-primary text-white rounded-2xl font-bold text-lg hover:scale-105 transition-transform shadow-lg shadow-primary/30"
        >
          Continue
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent flex flex-col justify-between">
      {/* Header */}
      <div className="p-4 flex items-center gap-4 max-w-3xl mx-auto w-full">
        <button
          onClick={() => navigate("/journey")}
          className="p-2 text-text-secondary hover:bg-surface rounded-full transition-colors"
          aria-label="Exit lesson"
        >
          <XIcon className="w-6 h-6" />
        </button>
        <ProgressBar current={currentIndex} total={questions.length} />
      </div>

      {/* Main Content Card Container */}
      <div className="flex-1 flex flex-col items-center justify-center max-w-xl mx-auto w-full px-4 py-8">
        <div className="w-full bg-card/65 backdrop-blur-xl border border-border/50 rounded-[2rem] p-8 shadow-xl flex flex-col items-center">
          <span className="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20 mb-6">
            Question {currentIndex + 1} of {questions.length}
          </span>
          
          <h2 className="text-2xl font-black text-text-primary mb-8 text-center leading-tight">
            {currentQuestion.type === "meaning" && "Select the correct meaning"}
            {currentQuestion.type === "pinyin" && "Select the correct pinyin"}
            {currentQuestion.type === "listening" && "What do you hear?"}
            {currentQuestion.type === "writing" && "Draw the character"}
          </h2>

          {/* Prompt Area */}
          <div className="mb-10 flex flex-col items-center justify-center min-h-[140px]">
            {currentQuestion.type === "listening" ? (
              <button
                onClick={() => playAudio(currentQuestion.targetWord.character)}
                className="w-28 h-28 bg-primary/10 rounded-full flex items-center justify-center hover:bg-primary/20 transition-all hover:scale-105 active:scale-95 shadow-md shadow-primary/5"
                aria-label="Play pronunciation"
              >
                <SpeakerIcon className="w-14 h-14 text-primary" />
              </button>
            ) : currentQuestion.type === "writing" ? (
              <div className="flex flex-col items-center gap-4">
                <div className="text-xl text-text-secondary font-medium">
                  {currentQuestion.targetWord.pinyin} -{" "}
                  {currentQuestion.targetWord.english_definition}
                </div>
                <div
                  ref={canvasRef}
                  className="bg-white rounded-2xl shadow-inner border border-border/50 overflow-hidden"
                ></div>
              </div>
            ) : (
              <div className="text-7xl font-black text-text-primary tracking-tight select-none bg-gradient-to-br from-text-primary to-text-secondary bg-clip-text text-transparent">
                {currentQuestion.targetWord.character}
              </div>
            )}
          </div>

          {/* Options Grid */}
          {currentQuestion.type !== "writing" && (
            <div className="w-full flex flex-col gap-3.5">
              {currentQuestion.options.map((option, idx) => {
                const isSelected = selectedAnswer === idx;

                let btnClass =
                  "w-full p-5 rounded-2xl text-base font-bold text-center shadow-sm cursor-pointer border transition-colors duration-300 ";
                let animationProps = {
                  whileHover: { scale: 1.02, y: -2 },
                  whileTap: { scale: 0.98 },
                };

                if (selectedAnswer !== null) {
                  if (option.isCorrect) {
                    btnClass += "border-emerald-500 bg-emerald-500/10 text-emerald-500 shadow-xl shadow-emerald-500/5";
                    animationProps = {
                      animate: { scale: [1, 1.05, 1], rotate: [0, -1, 1, 0] },
                      transition: { duration: 0.5 },
                    };
                  } else if (isSelected) {
                    btnClass += "border-rose-500 bg-rose-500/10 text-rose-500";
                    animationProps = {
                      animate: { x: [-10, 10, -10, 10, 0] },
                      transition: { duration: 0.4 },
                    };
                  } else {
                    btnClass += "border-border/10 bg-card/10 text-text-secondary opacity-40";
                    animationProps = { animate: { scale: 0.96 } };
                  }
                } else {
                  btnClass += "border-border/40 bg-card/60 hover:bg-surface hover:border-border text-text-primary";
                }

                return (
                  <motion.button
                    key={`${currentIndex}-${idx}`}
                    {...animationProps}
                    disabled={selectedAnswer !== null}
                    onClick={() => handleSelectOption(idx)}
                    className={btnClass}
                  >
                    {option.text}
                  </motion.button>
                );
              })}
            </div>
          )}
        </div>
      </div>
      
      {/* Bottom spacer for layout balance */}
      <div className="h-8"></div>
    </div>
  );
}
