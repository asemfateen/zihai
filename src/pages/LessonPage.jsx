import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import HanziWriter from "hanzi-writer";
import confetti from "canvas-confetti";
import API_BASE, { fetchWithTimeout } from "../api";
import { XIcon, SpeakerIcon } from "../components/Icons";

function ProgressBar({ current, total }) {
  const percentage = Math.round((current / total) * 100);
  return (
    <div className="w-full bg-surface h-4 rounded-full overflow-hidden">
      <div
        className="bg-primary h-full transition-all duration-500 ease-out"
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
  const handleCheckRef = useRef(null);
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

  const handleCheck = (forceCorrect = false) => {
    if (isChecked) {
      setIsChecked(false);
      setSelectedAnswer(null);
      if (currentIndex + 1 < questions.length) {
        setCurrentIndex((curr) => curr + 1);
      } else {
        finishLesson();
      }
      return;
    }

    setIsChecked(true);
    let correct = forceCorrect;
    if (currentQuestion.type !== "writing") {
      const option = currentQuestion.options[selectedAnswer];
      correct = option?.isCorrect || false;
    }
    setIsCorrect(correct);
  };

  useEffect(() => {
    handleCheckRef.current = handleCheck;
  });

  // Setup HanziWriter for Writing questions
  useEffect(() => {
    if (currentQuestion?.type === "writing" && canvasRef.current) {
      canvasRef.current.innerHTML = "";
      setWritingDone(false);
      setSelectedAnswer(null);
      setIsChecked(false);

      const char = currentQuestion.targetWord.character.charAt(0); // Just test the first character for simplicity

      writerRef.current = HanziWriter.create(canvasRef.current, char, {
        width: 250,
        height: 250,
        padding: 5,
        strokeColor: "#ef4444", // text-red-500 or rose-500
        showOutline: true,
        outlineColor: "#e5e7eb",
        drawingColor: "#3b82f6",
      });

      writerRef.current.quiz({
        onComplete: () => {
          setWritingDone(true);
          setSelectedAnswer("done");
          // Auto-check for writing
          handleCheckRef.current(true);
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
          <span className="text-6xl">🔥</span>
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
    <div className="min-h-screen bg-transparent flex flex-col">
      {/* Header */}
      <div className="p-4 flex items-center gap-4 max-w-3xl mx-auto w-full">
        <button
          onClick={() => navigate("/journey")}
          className="p-2 text-text-secondary hover:bg-surface rounded-full"
        >
          <XIcon className="w-6 h-6" />
        </button>
        <ProgressBar current={currentIndex} total={questions.length} />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center max-w-3xl mx-auto w-full px-4 py-8">
        <h2 className="text-2xl font-bold text-text-primary mb-8 w-full text-left">
          {currentQuestion.type === "meaning" && "Select the correct meaning"}
          {currentQuestion.type === "pinyin" && "Select the correct pinyin"}
          {currentQuestion.type === "listening" && "What do you hear?"}
          {currentQuestion.type === "writing" && "Draw the character"}
        </h2>

        {/* Prompt Area */}
        <div className="mb-12 flex flex-col items-center justify-center">
          {currentQuestion.type === "listening" ? (
            <button
              onClick={() => playAudio(currentQuestion.targetWord.character)}
              className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center hover:bg-primary/20 transition-colors"
            >
              <SpeakerIcon className="w-12 h-12 text-primary" />
            </button>
          ) : currentQuestion.type === "writing" ? (
            <div className="flex flex-col items-center gap-4">
              <div className="text-2xl text-text-secondary">
                {currentQuestion.targetWord.pinyin} -{" "}
                {currentQuestion.targetWord.english_definition}
              </div>
              <div
                ref={canvasRef}
                className="bg-white rounded-xl shadow-inner border-2 border-border overflow-hidden"
              ></div>
            </div>
          ) : (
            <div className="text-6xl font-black text-text-primary">
              {currentQuestion.targetWord.character}
            </div>
          )}
        </div>

        {/* Options Grid */}
        {currentQuestion.type !== "writing" && (
          <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-4 mt-auto">
            {currentQuestion.options.map((option, idx) => {
              const isSelected = selectedAnswer === idx;

              let btnClass =
                "border-2 border-border bg-card text-text-primary hover:bg-surface hover:border-border-hover";
              if (isSelected && !isChecked)
                btnClass = "border-2 border-primary bg-primary/10 text-primary";
              if (isChecked && option.isCorrect)
                btnClass =
                  "border-2 border-green-500 bg-green-50 text-green-600";
              if (isChecked && isSelected && !option.isCorrect)
                btnClass = "border-2 border-red-500 bg-red-50 text-red-600";
              if (isChecked && !option.isCorrect && !isSelected)
                btnClass =
                  "border-2 border-border bg-card text-text-secondary opacity-50";

              return (
                <button
                  key={idx}
                  onClick={() => !isChecked && setSelectedAnswer(idx)}
                  disabled={isChecked}
                  className={`w-full p-4 rounded-2xl text-lg font-bold transition-all text-center ${btnClass}`}
                >
                  {option.text}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        className={`w-full border-t p-4 transition-colors ${isChecked ? (isCorrect ? "bg-green-100 border-green-200" : "bg-red-100 border-red-200") : "bg-card border-border"}`}
      >
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            {isChecked && isCorrect && (
              <div className="text-green-600 font-bold text-2xl flex items-center gap-2">
                <span>✅</span> Amazing!
              </div>
            )}
            {isChecked && !isCorrect && (
              <div className="text-red-600 font-bold text-2xl flex items-center gap-2">
                <span>❌</span> Correct answer:{" "}
                {currentQuestion.type !== "writing" &&
                  currentQuestion.options.find((o) => o.isCorrect)?.text}
              </div>
            )}
          </div>
          <button
            onClick={() => handleCheck(false)}
            disabled={selectedAnswer === null && !isChecked}
            className={`py-3 px-8 rounded-2xl font-bold text-lg transition-all ${
              selectedAnswer === null && !isChecked
                ? "bg-surface text-text-secondary cursor-not-allowed"
                : isChecked
                  ? isCorrect
                    ? "bg-green-500 text-white hover:bg-green-600"
                    : "bg-red-500 text-white hover:bg-red-600"
                  : "bg-primary text-white hover:bg-primary-hover shadow-lg shadow-primary/30"
            }`}
          >
            {isChecked ? "CONTINUE" : "CHECK"}
          </button>
        </div>
      </div>
    </div>
  );
}
