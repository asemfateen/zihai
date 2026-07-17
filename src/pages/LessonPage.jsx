import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import HanziWriter from "hanzi-writer";
import confetti from "canvas-confetti";
import { motion, AnimatePresence } from "framer-motion";
import API_BASE, { fetchWithTimeout } from "../api";
import {
  XIcon,
  SpeakerIcon,
  SpeakerWaveIcon,
  CheckIcon,
  ReplayIcon,
  ChevronRightIcon,
  PlayIcon,
} from "../components/Icons";

// ─── Colour helpers ─────────────────────────────────────────────────────────

const TONE_COLORS = {
  1: "text-red-500",
  2: "text-orange-500",
  3: "text-green-500",
  4: "text-blue-500",
};

function getToneNumber(pinyin) {
  if (!pinyin) return 0;
  const toneChars = ["āēīōūǖ", "áéíóúǘ", "ǎěǐǒǔǚ", "àèìòùǜ"];
  for (let t = 0; t < toneChars.length; t++) {
    for (const ch of toneChars[t]) {
      if (pinyin.includes(ch)) return t + 1;
    }
  }
  return 0;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── Audio helpers ──────────────────────────────────────────────────────────

function playSuccessSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === "suspended") ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(523.25, now);
    osc.frequency.setValueAtTime(659.25, now + 0.08);
    osc.frequency.setValueAtTime(783.99, now + 0.16);
    osc.frequency.setValueAtTime(1046.5, now + 0.24);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.45);
  } catch (err) {
    console.warn("AudioContext failed:", err);
  }
}

function playDingSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === "suspended") ctx.resume();
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();
    osc1.type = "sine";
    osc2.type = "sine";
    const now = ctx.currentTime;
    osc1.frequency.setValueAtTime(523.25, now);
    osc1.frequency.exponentialRampToValueAtTime(783.99, now + 0.06);
    osc2.frequency.setValueAtTime(783.99, now + 0.04);
    osc2.frequency.exponentialRampToValueAtTime(1046.5, now + 0.14);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);
    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.35);
    osc2.stop(now + 0.35);
  } catch (err) {
    console.warn("AudioContext failed:", err);
  }
}

function playTTS(text) {
  try {
    const audio = new Audio(
      `/api/tts?text=${encodeURIComponent(text)}&t=${Date.now()}`,
    );
    audio.play().catch(() => {
      // fallback: browser SpeechSynthesis
      if ("speechSynthesis" in window) {
        const u = new SpeechSynthesisUtterance(text);
        u.lang = "zh-CN";
        u.rate = 0.8;
        window.speechSynthesis.speak(u);
      }
    });
  } catch {
    // silently ignore audio errors
  }
}

// ─── LocalStorage helpers ───────────────────────────────────────────────────

const STORAGE_KEY_PREFIX = "zihai_lesson_";

function saveSession(unit, state) {
  try {
    localStorage.setItem(
      STORAGE_KEY_PREFIX + unit,
      JSON.stringify({ unit, ...state, _ts: Date.now() }),
    );
  } catch {
    /* quota exceeded – ignore */
  }
}

function loadSession(unit) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PREFIX + unit);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data.unit !== unit) return null;
    // expire after 2 hours
    if (Date.now() - data._ts > 2 * 60 * 60 * 1000) {
      localStorage.removeItem(STORAGE_KEY_PREFIX + unit);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function clearSession(unit) {
  try {
    localStorage.removeItem(STORAGE_KEY_PREFIX + unit);
  } catch {
    /* ignore */
  }
}

// ─── ProgressBar ────────────────────────────────────────────────────────────

function ProgressBar({ current, total, label }) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;
  return (
    <div className="w-full space-y-1.5">
      {label && (
        <div className="flex justify-between text-xs font-medium text-text-secondary">
          <span>{label}</span>
          <span>
            {current}/{total}
          </span>
        </div>
      )}
      <div className="w-full bg-surface border border-border/50 h-3 rounded-full overflow-hidden p-[2px]">
        <div
          className="bg-gradient-to-r from-primary to-orange-500 h-full rounded-full transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─── StageBadge ─────────────────────────────────────────────────────────────

const STAGE_LABELS = {
  meet: "MEET",
  dive: "DEEP DIVE",
  check: "CHECK",
  review: "REVIEW",
};

const STAGE_COLORS = {
  meet: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  dive: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  check: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  review: "bg-rose-500/15 text-rose-400 border-rose-500/30",
};

function StageBadge({ stage }) {
  const label = STAGE_LABELS[stage] || stage;
  const colors = STAGE_COLORS[stage] || "bg-primary/10 text-primary border-primary/20";
  return (
    <motion.span
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      key={stage}
      className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${colors}`}
    >
      {label}
    </motion.span>
  );
}

// ─── MeetStage ──────────────────────────────────────────────────────────────

function MeetStage({ charData, onGotIt }) {
  const [audioPlayed, setAudioPlayed] = useState(false);
  const tone = getToneNumber(charData.pinyin);
  const toneColor = TONE_COLORS[tone] || "text-text-primary";

  const handlePlayAudio = useCallback(() => {
    playTTS(charData.character);
    setAudioPlayed(true);
  }, [charData.character]);

  // Auto-play once on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      playTTS(charData.character);
      setAudioPlayed(true);
    }, 400);
    return () => clearTimeout(timer);
  }, [charData.character]);

  return (
    <motion.div
      key={`meet-${charData.character}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center py-8 text-center"
    >
      {/* Character — animates in big */}
      <motion.div
        initial={{ scale: 0.3, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 150, damping: 15, delay: 0.1 }}
        className="text-8xl sm:text-9xl font-black text-text-primary tracking-tight select-none mb-6"
      >
        {charData.character}
      </motion.div>

      {/* Pinyin with tone colour */}
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className={`text-2xl sm:text-3xl font-bold mb-2 ${toneColor}`}
      >
        {charData.pinyin}
      </motion.p>

      {/* Definition slides in */}
      <motion.p
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.5, type: "spring", stiffness: 100 }}
        className="text-xl text-text-secondary mb-10"
      >
        {charData.definition}
      </motion.p>

      {/* Audio replay button */}
      <motion.button
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.7 }}
        onClick={handlePlayAudio}
        className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center hover:bg-primary/20 transition-all hover:scale-105 active:scale-95 mb-10 shadow-md shadow-primary/5"
        title="Tap to hear pronunciation"
      >
        <SpeakerWaveIcon className="w-8 h-8 text-primary" />
      </motion.button>

      {/* Got it button */}
      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9 }}
        onClick={onGotIt}
        className="px-10 py-4 bg-primary text-white rounded-2xl font-bold text-lg hover:scale-105 transition-transform shadow-lg shadow-primary/30 flex items-center gap-2"
      >
        Got it <ChevronRightIcon className="w-5 h-5" />
      </motion.button>
    </motion.div>
  );
}

// ─── DeepDiveStage ──────────────────────────────────────────────────────────

function DeepDiveStage({ charData, onGotIt, onSkip }) {
  const writerRef = useRef(null);
  const [hanziReady, setHanziReady] = useState(false);
  const [hanziFailed, setHanziFailed] = useState(false);

  // Setup HanziWriter for stroke animation
  useEffect(() => {
    if (!writerRef.current || !charData.character) return;
    const isChinese = /[\u4E00-\u9FFF]/.test(charData.character);
    if (!isChinese) {
      setHanziFailed(true);
      return;
    }

    writerRef.current.innerHTML = "";
    let writer;

    try {
      writer = HanziWriter.create(writerRef.current, charData.character, {
        width: 180,
        height: 180,
        padding: 10,
        strokeColor: "#3b82f6",
        outlineColor: "#334155",
        showOutline: true,
        strokeAnimationSpeed: 1,
        delayBetweenStrokes: 300,
        showCharacter: false,
        radicalColor: "#f43f5e",
        onLoadCharDataError: () => setHanziFailed(true),
      });

      // Auto-animate after a short delay
      setTimeout(() => {
        if (writer && typeof writer.animateCharacter === "function") {
          writer.animateCharacter({
            onComplete: () => setHanziReady(true),
          });
        }
      }, 300);
    } catch {
      setHanziFailed(true);
    }

    return () => {
      if (writer && typeof writer.pauseAnimation === "function") {
        writer.pauseAnimation();
      }
    };
  }, [charData.character]);

  const handleReplayAnimation = () => {
    if (!writerRef.current) return;
    writerRef.current.innerHTML = "";
    setHanziReady(false);
    setHanziFailed(false);

    try {
      const writer = HanziWriter.create(writerRef.current, charData.character, {
        width: 180,
        height: 180,
        padding: 10,
        strokeColor: "#3b82f6",
        outlineColor: "#334155",
        showOutline: true,
        strokeAnimationSpeed: 1,
        delayBetweenStrokes: 300,
        showCharacter: false,
        onLoadCharDataError: () => setHanziFailed(true),
      });
      setTimeout(() => {
        if (writer && typeof writer.animateCharacter === "function") {
          writer.animateCharacter({
            onComplete: () => setHanziReady(true),
          });
        }
      }, 300);
    } catch {
      setHanziFailed(true);
    }
  };

  const handlePlayExample = (sentence) => {
    playTTS(sentence);
  };

  const examples = charData.examples || [];

  return (
    <motion.div
      key={`dive-${charData.character}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex flex-col items-center py-4"
    >
      {/* Small character header */}
      <motion.div className="text-5xl font-black text-text-primary mb-6 select-none">
        {charData.character}
      </motion.div>

      {/* Stroke Order */}
      <div className="w-full max-w-xs mx-auto mb-6">
        <h3 className="text-xs font-bold uppercase tracking-widest text-text-secondary mb-3 text-center">
          Stroke Order
        </h3>
        <div className="flex flex-col items-center gap-3">
          <div
            ref={writerRef}
            className="w-[180px] h-[180px] bg-surface/40 backdrop-blur-md rounded-2xl border border-border/50 overflow-hidden"
          />
          {hanziFailed && (
            <div className="text-7xl font-black text-text-primary select-none">
              {charData.character}
            </div>
          )}
          <button
            onClick={handleReplayAnimation}
            className="flex items-center gap-2 px-4 py-2 bg-surface border border-border/50 text-text-primary rounded-xl text-sm font-semibold hover:bg-surface/80 transition-all hover:scale-105 active:scale-95"
          >
            <ReplayIcon className="w-4 h-4" />
            Replay
          </button>
        </div>
      </div>

      {/* Radical */}
      {charData.radical && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="w-full max-w-sm bg-surface/30 backdrop-blur-sm border border-border/40 rounded-2xl p-4 mb-4"
        >
          <span className="text-xs font-bold uppercase tracking-widest text-text-secondary">
            Radical{" "}
          </span>
          <span className="text-2xl font-bold text-text-primary ml-2">
            {charData.radical}
          </span>
          {charData.radicalMeaning && (
            <span className="text-text-secondary ml-1">
              ({charData.radicalMeaning})
            </span>
          )}
        </motion.div>
      )}

      {/* Examples */}
      {examples.length > 0 && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="w-full max-w-sm space-y-3 mb-6"
        >
          <h3 className="text-xs font-bold uppercase tracking-widest text-text-secondary text-center">
            Examples
          </h3>
          {examples.slice(0, 2).map((ex, i) => (
            <div
              key={i}
              className="bg-surface/30 backdrop-blur-sm border border-border/40 rounded-2xl p-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xl font-bold text-text-primary">
                    {ex.sentence}
                  </p>
                  {ex.pinyin && (
                    <p className="text-sm text-text-secondary mt-1">
                      {ex.pinyin}
                    </p>
                  )}
                  {ex.translation && (
                    <p className="text-sm text-text-secondary/70 mt-0.5">
                      {ex.translation}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handlePlayExample(ex.sentence)}
                  className="p-2 text-text-secondary hover:text-primary hover:bg-primary/10 rounded-full transition-colors shrink-0 ml-2"
                  title="Hear sentence"
                >
                  <SpeakerIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </motion.div>
      )}

      {/* Bottom actions */}
      <div className="flex items-center gap-4 mt-2">
        <button
          onClick={onSkip}
          className="px-6 py-3 bg-surface border border-border/50 text-text-secondary rounded-2xl font-semibold hover:scale-105 transition-transform"
        >
          Skip
        </button>
        <button
          onClick={onGotIt}
          className="px-8 py-3 bg-primary text-white rounded-2xl font-bold hover:scale-105 transition-transform shadow-lg shadow-primary/30 flex items-center gap-2"
        >
          Got it <ChevronRightIcon className="w-5 h-5" />
        </button>
      </div>
    </motion.div>
  );
}

// ─── CheckStage ─────────────────────────────────────────────────────────────

function CheckStage({ charData, onCorrect, onWrong, onNext, showResult }) {
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [correct, setCorrect] = useState(false);

  // Generate distractors + correct answer
  const [options, setOptions] = useState([]);

  useEffect(() => {
    const correctAnswer = charData.definition;
    // We'll get distractors from the charData if provided, otherwise generate placeholders
    const distractors = (charData.distractors || []).slice(0, 3);
    while (distractors.length < 3) {
      distractors.push(`Option ${distractors.length + 2}`);
    }
    // Shuffle so correct is not always first
    const allOptions = shuffle([
      { text: correctAnswer, isCorrect: true },
      ...distractors.map((d) => ({ text: d, isCorrect: false })),
    ]);
    setOptions(allOptions);
    setSelectedIdx(null);
    setAnswered(false);
    setCorrect(false);
  }, [charData.character, charData.definition, charData.distractors]);

  const handleSelect = (idx) => {
    if (answered) return;
    setSelectedIdx(idx);
    setAnswered(true);
    const isCorrect = options[idx].isCorrect;
    setCorrect(isCorrect);

    if (isCorrect) {
      playSuccessSound();
      onCorrect();
    } else {
      onWrong();
    }
  };

  const handleNext = () => {
    if (correct) {
      onNext();
    } else {
      // Re-show the Meet card — parent handles this
      onNext(false /* signal to re-meet */);
    }
  };

  return (
    <motion.div
      key={`check-${charData.character}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex flex-col items-center py-4"
    >
      {/* Question prompt */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="text-center mb-8"
      >
        <div className="text-6xl sm:text-7xl font-black text-text-primary mb-4 select-none">
          {charData.character}
        </div>
        <h2 className="text-xl font-bold text-text-primary">
          What does{" "}
          <span className="text-primary">{charData.character}</span> mean?
        </h2>
      </motion.div>

      {/* Options */}
      <div className="w-full max-w-sm flex flex-col gap-3 mb-6">
        {options.map((opt, idx) => {
          const isSelected = selectedIdx === idx;
          let btnClass =
            "w-full p-4 sm:p-5 rounded-2xl text-base font-bold text-center shadow-sm cursor-pointer border transition-all duration-300 ";

          if (answered) {
            if (opt.isCorrect) {
              btnClass +=
                "border-emerald-500 bg-emerald-500/10 text-emerald-500 shadow-xl shadow-emerald-500/5";
            } else if (isSelected) {
              btnClass +=
                "border-rose-500 bg-rose-500/10 text-rose-500";
            } else {
              btnClass +=
                "border-border/10 bg-card/10 text-text-secondary opacity-40";
            }
          } else {
            btnClass +=
              "border-border/40 bg-card/60 hover:bg-surface hover:border-border text-text-primary";
          }

          return (
            <motion.button
              key={idx}
              whileHover={!answered ? { scale: 1.02, y: -2 } : {}}
              whileTap={!answered ? { scale: 0.98 } : {}}
              disabled={answered}
              onClick={() => handleSelect(idx)}
              className={btnClass}
            >
              {opt.text}
            </motion.button>
          );
        })}
      </div>

      {/* Feedback */}
      <AnimatePresence mode="wait">
        {answered && (
          <motion.div
            key="feedback"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-center mb-4"
          >
            {correct ? (
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <CheckIcon className="w-7 h-7 text-emerald-500" />
                </div>
                <p className="text-emerald-500 font-bold text-lg">Correct!</p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-rose-400 font-bold text-base">
                  Not quite — this is{" "}
                  <span className="text-2xl font-black text-rose-300">
                    {charData.character}
                  </span>
                </p>
                <p className="text-text-secondary text-sm">
                  {charData.definition}
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Next button — only after answering */}
      {answered && (
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={handleNext}
          className="px-10 py-3.5 bg-primary text-white rounded-2xl font-bold text-lg hover:scale-105 transition-transform shadow-lg shadow-primary/30 flex items-center gap-2"
        >
          {correct ? "Next" : "Show me again"}{" "}
          <ChevronRightIcon className="w-5 h-5" />
        </motion.button>
      )}
    </motion.div>
  );
}

// ─── ReviewStage ────────────────────────────────────────────────────────────

function ReviewStage({ learnedChars, onComplete, onReTeach }) {
  const [reviewQueue, setReviewQueue] = useState([]);
  const [currentReviewIdx, setCurrentReviewIdx] = useState(0);
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [correct, setCorrect] = useState(false);
  const [missedChars, setMissedChars] = useState([]);
  const [reviewDone, setReviewDone] = useState(false);

  // Build review questions from learned chars
  useEffect(() => {
    const questions = learnedChars.map((ch) => {
      const askMeaning = Math.random() > 0.5;
      const distractors = (ch.distractors || []).slice(0, 3);
      while (distractors.length < 3) {
        distractors.push(`Option ${distractors.length + 2}`);
      }

      let correctText, questionText, allOptions;
      if (askMeaning) {
        correctText = ch.definition;
        questionText = `What does ${ch.character} mean?`;
        allOptions = shuffle([
          { text: correctText, isCorrect: true },
          ...distractors.map((d) => ({ text: d, isCorrect: false })),
        ]);
      } else {
        correctText = ch.pinyin;
        questionText = `How do you read ${ch.character}?`;
        // For pinyin, generate plausible wrong pinyins
        const wrongPinyins = generateWrongPinyins(ch.pinyin, learnedChars);
        allOptions = shuffle([
          { text: correctText, isCorrect: true },
          ...wrongPinyins.map((p) => ({ text: p, isCorrect: false })),
        ]);
      }

      return {
        character: ch.character,
        pinyin: ch.pinyin,
        definition: ch.definition,
        questionText,
        correctText,
        options: allOptions,
        charData: ch,
      };
    });
    setReviewQueue(shuffle(questions));
    setCurrentReviewIdx(0);
    setMissedChars([]);
    setReviewDone(false);
  }, [learnedChars]);

  const currentQ = reviewQueue[currentReviewIdx];

  const handleSelect = (idx) => {
    if (answered) return;
    setSelectedIdx(idx);
    setAnswered(true);
    const isCorrect = options[idx].isCorrect;
    setCorrect(isCorrect);
    if (isCorrect) {
      playSuccessSound();
    } else {
      setMissedChars((prev) => {
        if (!prev.find((c) => c.character === currentQ.character)) {
          return [...prev, currentQ.charData];
        }
        return prev;
      });
    }
  };

  const handleNext = () => {
    if (currentReviewIdx + 1 < reviewQueue.length) {
      setCurrentReviewIdx((i) => i + 1);
      setSelectedIdx(null);
      setAnswered(false);
      setCorrect(false);
    } else {
      setReviewDone(true);
      playDingSound();
    }
  };

  if (reviewDone) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center py-8 text-center"
      >
        <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mb-6">
          <CheckIcon className="w-10 h-10 text-emerald-500" />
        </div>
        <h2 className="text-2xl font-black text-text-primary mb-2">
          Review Complete!
        </h2>
        {missedChars.length > 0 && (
          <p className="text-text-secondary mb-4">
            {missedChars.length} character{missedChars.length > 1 ? "s" : ""}{" "}
            need{" "}
            <button
              onClick={() => onReTeach(missedChars)}
              className="text-primary font-semibold underline hover:no-underline"
            >
              re-teaching
            </button>
          </p>
        )}
        <button
          onClick={onComplete}
          className="px-10 py-4 bg-primary text-white rounded-2xl font-bold text-lg hover:scale-105 transition-transform shadow-lg shadow-primary/30 mt-4"
        >
          Finish Session
        </button>
      </motion.div>
    );
  }

  if (!currentQ) return null;

  const { character, questionText, options } = currentQ;

  return (
    <motion.div
      key={`review-${currentReviewIdx}`}
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      className="flex flex-col items-center py-4"
    >
      {/* Progress indicator */}
      <div className="text-xs font-bold uppercase tracking-widest text-text-secondary mb-4">
        Review {currentReviewIdx + 1} of {reviewQueue.length}
      </div>

      {/* Character */}
      <div className="text-6xl sm:text-7xl font-black text-text-primary mb-4 select-none">
        {character}
      </div>

      {/* Question */}
      <h2 className="text-lg font-bold text-text-primary mb-8 text-center">
        {questionText}
      </h2>

      {/* Options */}
      <div className="w-full max-w-sm flex flex-col gap-3 mb-6">
        {options.map((opt, idx) => {
          const isSelected = selectedIdx === idx;
          let btnClass =
            "w-full p-4 sm:p-5 rounded-2xl text-base font-bold text-center shadow-sm cursor-pointer border transition-all duration-300 ";

          if (answered) {
            if (opt.isCorrect) {
              btnClass +=
                "border-emerald-500 bg-emerald-500/10 text-emerald-500 shadow-xl shadow-emerald-500/5";
            } else if (isSelected) {
              btnClass += "border-rose-500 bg-rose-500/10 text-rose-500";
            } else {
              btnClass +=
                "border-border/10 bg-card/10 text-text-secondary opacity-40";
            }
          } else {
            btnClass +=
              "border-border/40 bg-card/60 hover:bg-surface hover:border-border text-text-primary";
          }

          return (
            <motion.button
              key={idx}
              whileHover={!answered ? { scale: 1.02, y: -2 } : {}}
              whileTap={!answered ? { scale: 0.98 } : {}}
              disabled={answered}
              onClick={() => handleSelect(idx)}
              className={btnClass}
            >
              {opt.text}
            </motion.button>
          );
        })}
      </div>

      {/* Feedback + Next */}
      <AnimatePresence mode="wait">
        {answered && (
          <motion.div
            key="fb"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-4"
          >
            {correct ? (
              <div className="flex items-center gap-2 justify-center">
                <CheckIcon className="w-5 h-5 text-emerald-500" />
                <span className="text-emerald-500 font-bold">Correct!</span>
              </div>
            ) : (
              <p className="text-rose-400 text-sm">
                The correct answer is{" "}
                <span className="font-black text-rose-300">{currentQ.correctText}</span>
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {answered && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={handleNext}
          className="px-8 py-3.5 bg-primary text-white rounded-2xl font-bold hover:scale-105 transition-transform shadow-lg shadow-primary/30 flex items-center gap-2"
        >
          {currentReviewIdx + 1 < reviewQueue.length ? "Next" : "See Results"}{" "}
          <ChevronRightIcon className="w-5 h-5" />
        </motion.button>
      )}
    </motion.div>
  );
}

function generateWrongPinyins(correctPinyin, learnedChars) {
  // Generate plausible wrong pinyins by altering tones or using other chars' pinyins
  const others = learnedChars
    .filter((c) => c.pinyin !== correctPinyin)
    .map((c) => c.pinyin);
  const wrong = [];
  // Try tone variants
  const base = correctPinyin.replace(/[āáǎà]/g, "a")
    .replace(/[ēéěè]/g, "e")
    .replace(/[īíǐì]/g, "i")
    .replace(/[ōóǒò]/g, "o")
    .replace(/[ūúǔù]/g, "u")
    .replace(/[ǖǘǚǜ]/g, "ü");
  const toneMarks = ["āēīōūǖ", "áéíóúǘ", "ǎěǐǒǔǚ", "àèìòùǜ"];
  // Add tone variants that differ from the original
  for (let t = 0; t < 4; t++) {
    if (wrong.length >= 3) break;
    const variant = applyTone(base, toneMarks[t]);
    if (variant !== correctPinyin) {
      wrong.push(variant);
    }
  }
  // Fill remaining with other chars' pinyins
  for (const p of others) {
    if (wrong.length >= 3) break;
    if (!wrong.includes(p) && p !== correctPinyin) {
      wrong.push(p);
    }
  }
  while (wrong.length < 3) {
    wrong.push(`tone${wrong.length + 2}`);
  }
  return wrong.slice(0, 3);
}

function applyTone(base, toneMarksStr) {
  // Map vowels a,e,i,o,u,ü to their tone-marked versions
  const vowelMap = {};
  const plainVowels = ["a", "e", "i", "o", "u", "ü"];
  for (let i = 0; i < plainVowels.length; i++) {
    vowelMap[plainVowels[i]] = toneMarksStr[i];
  }
  // Find the vowel to tone (last vowel, or second-to-last if 'u'/'ü' followed by vowel)
  let result = "";
  let replaced = false;
  for (let i = base.length - 1; i >= 0; i--) {
    const ch = base[i];
    if (!replaced && vowelMap[ch]) {
      result = base.slice(0, i) + vowelMap[ch] + base.slice(i + 1);
      replaced = true;
      break;
    }
  }
  if (!replaced) result = base;
  return result;
}

// ─── SessionComplete ────────────────────────────────────────────────────────

function SessionComplete({ learnedChars, xpGained, onContinue }) {
  useEffect(() => {
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ["#ef4444", "#f59e0b", "#3b82f6", "#10b981"],
    });
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 120, damping: 14 }}
      className="min-h-screen bg-transparent flex flex-col items-center justify-center p-6 text-center"
    >
      {/* Fire/celebration */}
      <motion.div
        initial={{ scale: 0, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
        className="w-28 h-28 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mb-8 shadow-xl"
      >
        <span className="text-6xl animate-bounce">🔥</span>
      </motion.div>

      <h1 className="text-4xl font-black text-text-primary mb-2">
        Lesson Complete!
      </h1>
      <p className="text-xl text-text-secondary mb-3">
        You gained{" "}
        <span className="font-bold text-amber-500">+{xpGained} XP</span>
      </p>

      {/* Character list */}
      <div className="flex flex-wrap gap-3 justify-center mb-8 max-w-sm">
        {learnedChars.map((ch, i) => (
          <motion.div
            key={ch.character || i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + i * 0.1 }}
            className="bg-card/60 border border-border/40 rounded-2xl px-4 py-2 flex items-center gap-2"
          >
            <span className="text-2xl font-black">{ch.character}</span>
            <span className="text-xs text-text-secondary">
              {ch.pinyin} · {ch.definition}
            </span>
          </motion.div>
        ))}
      </div>

      <button
        onClick={onContinue}
        className="w-full max-w-sm py-4 bg-primary text-white rounded-2xl font-bold text-lg hover:scale-105 transition-transform shadow-lg shadow-primary/30"
      >
        Continue
      </button>
    </motion.div>
  );
}

// ─── SessionLengthChooser ───────────────────────────────────────────────────

function SessionLengthChooser({ onChoose, savedSession }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-h-screen bg-transparent flex items-center justify-center p-6"
    >
      <div className="w-full max-w-md bg-card/85 backdrop-blur-xl border border-border/50 rounded-[2rem] p-8 shadow-lg text-center">
        <div className="text-5xl mb-6">📚</div>
        <h1 className="text-2xl font-black text-text-primary mb-2">
          Start Learning
        </h1>
        <p className="text-text-secondary text-sm mb-8">
          Choose your session length to begin
        </p>

        {savedSession && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mb-6 bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4"
          >
            <p className="text-sm text-amber-400 font-semibold mb-2">
              ⏸️ You were learning:
            </p>
            <p className="text-base font-bold text-text-primary mb-3">
              {savedSession.learnedChars
                .map((c) => c.character)
                .join(", ")}
            </p>
            <button
              onClick={() => onChoose(savedSession.sessionLength, true)}
              className="px-6 py-2.5 bg-amber-500 text-white rounded-xl font-bold text-sm hover:scale-105 transition-transform w-full"
            >
              Resume Session
            </button>
          </motion.div>
        )}

        <div className="flex flex-col gap-4">
          <button
            onClick={() => onChoose(3, false)}
            className="w-full p-5 bg-surface border border-border/40 rounded-2xl text-left hover:bg-surface/80 hover:-translate-y-0.5 transition-all"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-text-primary text-lg">
                  Quick Session
                </h3>
                <p className="text-sm text-text-secondary mt-1">
                  3 characters · ~5 minutes
                </p>
              </div>
              <div className="text-3xl">⚡</div>
            </div>
          </button>
          <button
            onClick={() => onChoose(5, false)}
            className="w-full p-5 bg-surface border border-border/40 rounded-2xl text-left hover:bg-surface/80 hover:-translate-y-0.5 transition-all"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-text-primary text-lg">
                  Full Expedition
                </h3>
                <p className="text-sm text-text-secondary mt-1">
                  5 characters · ~10 minutes
                </p>
              </div>
              <div className="text-3xl">🚀</div>
            </div>
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main LessonPage ────────────────────────────────────────────────────────

export default function LessonPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const unit = parseInt(id, 10) || 1;

  // Data
  const [characters, setCharacters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Session state
  const [sessionPhase, setSessionPhase] = useState("choose"); // choose | active | complete
  const [sessionLength, setSessionLength] = useState(3);
  const [currentCharIndex, setCurrentCharIndex] = useState(0);
  const [charStage, setCharStage] = useState("meet"); // meet | dive | check | review
  const [learnedChars, setLearnedChars] = useState([]);
  const [missedChars, setMissedChars] = useState([]);
  const [reTeachQueue, setReTeachQueue] = useState([]);
  const [reviewMode, setReviewMode] = useState(false);
  const [reviewCharIndex, setReviewCharIndex] = useState(0);
  const [xpGained, setXpGained] = useState(0);
  const [postingProgress, setPostingProgress] = useState(false);

  // Resume tracking
  const [hasSavedSession, setHasSavedSession] = useState(false);
  const [savedSessionData, setSavedSessionData] = useState(null);

  // Check if we already have a saved session
  useEffect(() => {
    const saved = loadSession(unit);
    if (saved && saved.learnedChars && saved.learnedChars.length > 0) {
      setHasSavedSession(true);
      setSavedSessionData(saved);
    }
  }, [unit]);

  // Fetch teaching data
  const fetchCharacters = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchWithTimeout(`${API_BASE}/api/teach/${unit}`, {
      credentials: "include",
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load lesson data");
        return res.json();
      })
      .then((data) => {
        if (!data || (Array.isArray(data) && data.length === 0)) {
          throw new Error("No characters found for this lesson");
        }
        // data can be an array or { characters: [...] }
        const chars = Array.isArray(data)
          ? data
          : data.characters || data.words || [];
        if (chars.length === 0) {
          throw new Error("No characters found for this lesson");
        }
        setCharacters(chars);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load lesson:", err);
        setError(err.message || "Failed to load lesson data.");
        setLoading(false);
      });
  }, [unit]);

  useEffect(() => {
    fetchCharacters();
  }, [fetchCharacters]);

  // ─── Session length chosen ─────────────────────────────────────────────

  const handleChooseLength = useCallback(
    (length, resume) => {
      setSessionLength(length);
      if (resume && savedSessionData) {
        // Restore saved session
        setLearnedChars(savedSessionData.learnedChars || []);
        setMissedChars(savedSessionData.missedChars || []);
        setCurrentCharIndex(savedSessionData.currentCharIndex || 0);
        setCharStage(savedSessionData.charStage || "meet");
        setReviewMode(savedSessionData.reviewMode || false);
        setReviewCharIndex(savedSessionData.reviewCharIndex || 0);
        setXpGained(savedSessionData.xpGained || 0);
        setSessionPhase("active");
      } else {
        // Fresh start
        setLearnedChars([]);
        setMissedChars([]);
        setCurrentCharIndex(0);
        setCharStage("meet");
        setReviewMode(false);
        setReviewCharIndex(0);
        setXpGained(0);
        setSessionPhase("active");
      }
    },
    [savedSessionData],
  );

  // ─── Stage transition handlers ─────────────────────────────────────────

  const currentChar = characters[currentCharIndex];

  // Got it on Meet → go to Deep Dive
  const handleMeetGotIt = useCallback(() => {
    setCharStage("dive");
    setReTeachQueue([]);
  }, []);

  // Got it on Deep Dive → go to Check
  const handleDiveGotIt = useCallback(() => {
    setCharStage("check");
  }, []);

  // Skip Deep Dive → go to Check
  const handleDiveSkip = useCallback(() => {
    setCharStage("check");
  }, []);

  // Check: correct answer
  const handleCheckCorrect = useCallback(() => {
    // Character is learned
  }, []);

  // Check: wrong answer
  const handleCheckWrong = useCallback(() => {
    if (currentChar) {
      setMissedChars((prev) => {
        if (!prev.find((c) => c.character === currentChar.character)) {
          return [...prev, currentChar];
        }
        return prev;
      });
    }
  }, [currentChar]);

  // Check: next after correct answer, or re-meet after wrong
  const handleCheckNext = useCallback(
    (wasCorrect) => {
      if (wasCorrect === false) {
        // Wrong answer — re-show the MEET card briefly
        setCharStage("meet");
        return;
      }

      // Mark character as learned
      if (currentChar) {
        setLearnedChars((prev) => {
          if (!prev.find((c) => c.character === currentChar.character)) {
            return [...prev, currentChar];
          }
          return prev;
        });
      }

      // Decide: review check or move to next character
      const nextIdx = currentCharIndex + 1;
      const charsDone = learnedChars.length + 1; // +1 for current

      // After every 3 chars, or at end, do review
      const shouldReview =
        (charsDone % 3 === 0 || nextIdx >= sessionLength) &&
        charsDone > 0;

      if (shouldReview && nextIdx < sessionLength) {
        // Mid-session review
        setReviewMode(true);
        setReviewCharIndex(0);
        setCharStage("review");
      } else if (nextIdx >= sessionLength) {
        // End of session — final review
        setReviewMode(true);
        setReviewCharIndex(0);
        setCharStage("review");
      } else {
        // Next character
        setCurrentCharIndex(nextIdx);
        setCharStage("meet");
      }
    },
    [currentChar, currentCharIndex, learnedChars, sessionLength],
  );

  // Review complete
  const handleReviewComplete = useCallback(() => {
    if (currentCharIndex + 1 >= sessionLength) {
      // Session is fully done
      finishSession();
    } else {
      // Resume to next character
      setReviewMode(false);
      setCurrentCharIndex((i) => i + 1);
      setCharStage("meet");
    }
  }, [currentCharIndex, sessionLength]);

  // Re-teach missed chars from review
  const handleReTeach = useCallback(
    (missed) => {
      // Insert missed chars before the current position, then restart from meet
      setReTeachQueue(missed);
      // We'll handle this by inserting into characters... simpler: just mark stage
      setReviewMode(false);
      setCharStage("meet");
      // We'll use reTeachQueue to override the current char
    },
    [],
  );

  // ─── Finish session ───────────────────────────────────────────────────

  const finishSession = useCallback(async () => {
    setSessionPhase("complete");
    playDingSound();
    clearSession(unit);

    const xp = 10 * (learnedChars.length || 1);
    setXpGained(xp);

    try {
      setPostingProgress(true);
      const res = await fetchWithTimeout(
        `${API_BASE}/api/progress/lesson-complete`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            xpGained: xp,
            unit,
            characters: learnedChars.map((c) => ({
              character: c.character,
              pinyin: c.pinyin,
              definition: c.definition,
            })),
          }),
          credentials: "include",
        },
      );
      const data = await res.json();
      setXpGained(data.xp_gained || xp);
    } catch (err) {
      console.error("Failed to post progress:", err);
    } finally {
      setPostingProgress(false);
    }
  }, [unit, learnedChars]);

  // ─── Persist session to localStorage ──────────────────────────────────

  useEffect(() => {
    if (sessionPhase === "active") {
      saveSession(unit, {
        currentCharIndex,
        charStage,
        learnedChars,
        missedChars,
        sessionLength,
        reviewMode,
        reviewCharIndex,
        xpGained,
      });
    }
  }, [
    sessionPhase,
    unit,
    currentCharIndex,
    charStage,
    learnedChars,
    missedChars,
    sessionLength,
    reviewMode,
    reviewCharIndex,
    xpGained,
  ]);

  // ─── Render helpers ───────────────────────────────────────────────────

  // Which character to show (from reTeachQueue or normal sequence)
  const displayChar =
    reTeachQueue.length > 0 ? reTeachQueue[0] : currentChar;

  const effectiveCharIndex =
    reTeachQueue.length > 0 ? -1 : currentCharIndex;

  const totalItems = reTeachQueue.length > 0 ? sessionLength + reTeachQueue.length : sessionLength;
  const completedItems = learnedChars.length;

  // ─── Loading / Error / Empty ──────────────────────────────────────────

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
              onClick={fetchCharacters}
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
      <div className="min-h-screen bg-transparent flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-text-secondary text-sm">Loading lesson data...</p>
      </div>
    );
  }

  if (!characters || characters.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <div className="text-4xl mb-4">📭</div>
        <h2 className="text-2xl font-bold text-text-primary mb-4">
          No characters found for this lesson!
        </h2>
        <button
          onClick={() => navigate("/journey")}
          className="px-8 py-3.5 bg-primary text-white rounded-2xl font-bold hover:scale-105 transition-transform shadow-lg shadow-primary/30"
        >
          Back to Journey
        </button>
      </div>
    );
  }

  // ─── Session length chooser ───────────────────────────────────────────

  if (sessionPhase === "choose") {
    return (
      <SessionLengthChooser
        savedSession={hasSavedSession ? savedSessionData : null}
        onChoose={handleChooseLength}
      />
    );
  }

  // ─── Session Complete ─────────────────────────────────────────────────

  if (sessionPhase === "complete") {
    return (
      <SessionComplete
        learnedChars={learnedChars}
        xpGained={xpGained}
        onContinue={() => navigate("/journey")}
      />
    );
  }

  // ─── Active session ───────────────────────────────────────────────────

  if (!displayChar) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isReviewStage = charStage === "review";

  return (
    <div className="min-h-screen bg-transparent flex flex-col">
      {/* Header */}
      <div className="px-4 pt-4 pb-2 flex items-center gap-4 max-w-3xl mx-auto w-full">
        <Link
          to="/journey"
          className="p-2 text-text-secondary hover:bg-surface rounded-full transition-colors"
        >
          <XIcon className="w-6 h-6" />
        </Link>
        <div className="flex-1">
          {isReviewStage ? (
            <ProgressBar
              current={reviewCharIndex + 1}
              total={learnedChars.length}
              label="Review"
            />
          ) : (
            <ProgressBar
              current={completedItems}
              total={totalItems}
              label={`Unit ${unit}`}
            />
          )}
        </div>
      </div>

      {/* Stage badge */}
      <div className="px-4 pt-2 pb-1 max-w-3xl mx-auto w-full flex items-center justify-center">
        <StageBadge stage={charStage} />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center max-w-xl mx-auto w-full px-4 py-4">
        <div className="w-full bg-card/65 backdrop-blur-xl border border-border/50 rounded-[2rem] p-6 sm:p-8 shadow-xl">
          <AnimatePresence mode="wait">
            {charStage === "meet" && (
              <MeetStage
                key={`meet-${
                  reTeachQueue.length > 0
                    ? "reteach-" + reTeachQueue[0]?.character
                    : currentChar?.character
                }`}
                charData={displayChar}
                onGotIt={
                  reTeachQueue.length > 0
                    ? () => {
                        setReTeachQueue((prev) => prev.slice(1));
                        if (reTeachQueue.length <= 1) {
                          // Back to normal flow — re-show current char
                          setCharStage("dive");
                        } else {
                          setCharStage("dive");
                        }
                      }
                    : handleMeetGotIt
                }
              />
            )}

            {charStage === "dive" && (
              <DeepDiveStage
                key={`dive-${
                  reTeachQueue.length > 0
                    ? "reteach-" + reTeachQueue[0]?.character
                    : currentChar?.character
                }`}
                charData={displayChar}
                onGotIt={handleDiveGotIt}
                onSkip={handleDiveSkip}
              />
            )}

            {charStage === "check" && (
              <CheckStage
                key={`check-${
                  reTeachQueue.length > 0
                    ? "reteach-" + reTeachQueue[0]?.character
                    : currentChar?.character
                }`}
                charData={displayChar}
                onCorrect={handleCheckCorrect}
                onWrong={handleCheckWrong}
                onNext={handleCheckNext}
              />
            )}

            {charStage === "review" && (
              <ReviewStage
                key={`review-${learnedChars.length}-${Date.now()}`}
                learnedChars={learnedChars}
                onComplete={handleReviewComplete}
                onReTeach={handleReTeach}
              />
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Bottom spacer */}
      <div className="h-8" />
    </div>
  );
}
