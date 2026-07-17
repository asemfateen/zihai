import { useState, useEffect, useCallback } from "react";
import { fetchWithTimeout } from "../api";
import Spinner from "./Spinner";
import { Link } from "react-router-dom";
import { PlayIcon } from "./Icons";
import { useSpeechSynthesis } from "../hooks/useSpeechSynthesis";

export default function TextAnalyzer({
  cardStyle = true,
  initialText = "",
  readOnly = false,
}) {
  const [text, setText] = useState(initialText);
  const [tokens, setTokens] = useState([]);
  const [translation, setTranslation] = useState("");
  const [loading, setLoading] = useState(false);
  const [showEnglish, setShowEnglish] = useState(false);
  const [error, setError] = useState(null);
  const [selectedToken, setSelectedToken] = useState(null);
  const { speak, isSpeaking } = useSpeechSynthesis();

  const handleAnalyze = useCallback(async () => {
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    setTranslation("");
    try {
      const res = await fetchWithTimeout("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to analyze text");
      setTokens(data.tokens || []);
      setTranslation(data.translation || "");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [text]);

  useEffect(() => {
    if (initialText) {
      setText(initialText);
      setTimeout(handleAnalyze, 100);
    }
  }, [initialText, handleAnalyze]);

  const getHskColor = (level) => {
    if (!level) return "text-text-secondary border-border/50";
    const colors = {
      1: "text-emerald-500 border-emerald-500/30 bg-emerald-500/5",
      2: "text-blue-500 border-blue-500/30 bg-blue-500/5",
      3: "text-indigo-500 border-indigo-500/30 bg-indigo-500/5",
      4: "text-purple-500 border-purple-500/30 bg-purple-500/5",
      5: "text-pink-500 border-pink-500/30 bg-pink-500/5",
      6: "text-rose-500 border-rose-500/30 bg-rose-500/5",
    };
    return colors[level] || "text-amber-500 border-amber-500/30 bg-amber-500/5";
  };

  const containerClass = cardStyle
    ? "bg-card/80 backdrop-blur-xl border border-border/50 rounded-3xl p-6 sm:p-8 shadow-sm animate-fade-in mb-8"
    : "w-full";

  return (
    <div className="w-full">
      {!readOnly && (
        <div className={containerClass}>
          <h3 className="text-xl font-bold text-text-primary mb-3">
            Reading Mode (Text Analyzer)
          </h3>
          <p className="text-sm text-text-secondary mb-4 font-medium">
            Paste Chinese text below to break it down into words, show pinyin,
            and get English definitions.
          </p>

          <textarea
            className="w-full h-32 bg-surface/50 border border-border rounded-2xl p-4 text-text-primary focus:outline-none focus:border-primary transition-colors resize-none mb-4 font-sans text-sm sm:text-base"
            placeholder="Paste Chinese text here..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          ></textarea>

          <div className="flex justify-between items-center">
            <button
              onClick={handleAnalyze}
              disabled={loading || !text.trim()}
              className="bg-primary text-text-primary px-5 py-2.5 rounded-2xl font-bold transition-all hover:scale-102 active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer text-sm sm:text-base"
            >
              {loading && (
                <Spinner className="w-4 h-4 text-text-primary animate-spin" />
              )}
              Analyze Text
            </button>
            {error && (
              <span className="text-rose-500 font-medium text-xs sm:text-sm">
                {error}
              </span>
            )}
          </div>
        </div>
      )}

      {tokens.length > 0 && (
        <div className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-3xl p-6 sm:p-8 shadow-sm animate-fade-in [animation-delay:100ms] mb-8">
          <div className="flex justify-between items-center mb-6">
            <h4 className="text-lg font-bold text-text-primary">
              Analysis Result
            </h4>
            <div className="flex gap-2">
              <button
                onClick={() => setShowEnglish(!showEnglish)}
                className={`px-3 py-1.5 rounded-xl font-medium text-xs sm:text-sm transition-colors cursor-pointer border ${
                  showEnglish
                    ? "bg-primary border-primary text-white shadow-sm"
                    : "bg-surface border-border/50 text-text-secondary hover:bg-primary/10 hover:text-primary hover:border-primary/30"
                }`}
              >
                {showEnglish ? "Hide English" : "Show English"}
              </button>
              <button
                onClick={() => speak(text)}
                disabled={isSpeaking}
                className="p-2 rounded-xl bg-surface hover:bg-primary/20 text-primary transition-colors cursor-pointer border border-border/50 hover:border-primary/30"
                title="Play full text audio"
              >
                {isSpeaking ? (
                  <Spinner className="w-4 h-4 animate-spin" />
                ) : (
                  <PlayIcon className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
          
          {translation && (
            <div className="mb-6 p-4.5 bg-primary/5 border border-primary/20 rounded-2xl animate-fade-in text-left">
              <h5 className="text-[10px] font-black uppercase tracking-widest text-primary mb-1.5 flex items-center gap-1.5 select-none">
                <span>📝</span> Full Translation
              </h5>
              <p className="text-sm font-bold text-text-primary leading-relaxed">
                {translation}
              </p>
            </div>
          )}

          <div className="leading-[4.5rem] md:leading-[5.5rem] text-justify">
            {tokens.map((token, idx) => {
              if (!token.isChinese) {
                return (
                  <span
                    key={idx}
                    className="text-2xl text-text-secondary mx-0.5"
                  >
                    {token.text}
                  </span>
                );
              }

              return (
                <div
                  key={idx}
                  className="group relative inline-flex flex-col items-center mx-0.5 align-bottom cursor-pointer hover:scale-110 transition-transform"
                >
                  {/* Tooltip */}
                  <div className="absolute bottom-full mb-8 w-48 p-3 bg-surface border border-border rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20 pointer-events-none scale-95 group-hover:scale-100">
                    <div className="font-bold text-lg mb-1 text-text-primary">
                      {token.text}
                    </div>
                    <div className="text-primary font-medium text-sm mb-1">
                      {token.pinyin}
                    </div>
                    <div className="text-xs text-text-secondary line-clamp-3">
                      {token.definition || "No definition found"}
                    </div>
                    {token.hsk_level > 0 && (
                      <div className="mt-2 text-[10px] uppercase font-bold tracking-widest bg-surface-hover inline-block px-2 py-0.5 rounded text-text-secondary">
                        HSK {token.hsk_level}
                      </div>
                    )}
                  </div>

                  {/* Pinyin Ruby */}
                  <span className="text-[11px] md:text-xs text-text-secondary whitespace-nowrap opacity-80 group-hover:opacity-100 group-hover:text-primary transition-colors font-medium mb-1">
                    {token.pinyin || ""}
                  </span>

                  {/* Chinese Text */}
                  <button
                    onClick={() => {
                      if (token.id) setSelectedToken(token);
                    }}
                    className={`text-2xl md:text-3xl font-medium border-b-2 transition-colors px-0.5 rounded-sm cursor-pointer ${getHskColor(token.hsk_level)}`}
                  >
                    {token.text}
                  </button>

                  {/* Inline English Definition - Absolutely positioned to not disrupt Chinese tracking */}
                  {showEnglish &&
                    token.definitions &&
                    token.definitions.length > 0 && (
                      <span className="absolute top-full mt-1 text-[9px] md:text-[10px] text-text-secondary leading-tight text-center w-max max-w-[60px] truncate">
                        {token.definitions[0]}
                      </span>
                    )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Spatial UI / 3D Deep Lookup Modal */}
      {selectedToken && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-background/60 backdrop-blur-2xl"
            onClick={() => setSelectedToken(null)}
          ></div>

          <div
            className="relative w-full max-w-sm bg-card/40 backdrop-blur-3xl border border-border/50 rounded-[2rem] p-8 shadow-2xl animate-fade-in transform hover:scale-[1.02] hover:-translate-y-2 transition-all duration-300"
            style={{ transformStyle: "preserve-3d", perspective: "1000px" }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent rounded-[2rem] pointer-events-none"></div>

            <button
              onClick={() => setSelectedToken(null)}
              className="absolute top-4 right-4 text-text-secondary hover:text-text-primary p-2"
            >
              <svg
                width="24"
                height="24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path d="M18 6L6 18M6 6l12 12"></path>
              </svg>
            </button>

            <div className="text-center mt-4">
              <div className="text-primary font-bold text-xl tracking-widest mb-2">
                {selectedToken.pinyin}
              </div>
              <div
                className="text-8xl font-black text-text-primary drop-shadow-xl mb-6"
                style={{ transform: "translateZ(50px)" }}
              >
                {selectedToken.text}
              </div>

              <div className="bg-surface/50 rounded-2xl p-4 mb-6 backdrop-blur-md border border-border/30">
                <p className="text-text-secondary text-sm mb-1 uppercase font-bold tracking-widest">
                  Definition
                </p>
                <p className="text-lg text-text-primary font-medium">
                  {selectedToken.definition ||
                    selectedToken.definitions?.join(", ")}
                </p>
              </div>

              <div className="flex justify-between items-center mb-8">
                {selectedToken.hsk_level > 0 && (
                  <div className="px-4 py-2 bg-emerald-500/20 text-emerald-500 rounded-xl font-bold border border-emerald-500/30">
                    HSK Level {selectedToken.hsk_level}
                  </div>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    speak(selectedToken.text);
                  }}
                  className="w-12 h-12 bg-primary/20 text-primary rounded-xl flex items-center justify-center hover:bg-primary hover:text-white transition-colors border border-primary/30"
                >
                  <PlayIcon className="w-5 h-5" />
                </button>
              </div>

              <Link
                to={`/word/${selectedToken.id}`}
                className="block w-full py-4 bg-primary text-white rounded-2xl font-bold text-lg hover:shadow-lg hover:shadow-primary/30 transition-all hover:-translate-y-1"
              >
                Deep Dive &rarr;
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
