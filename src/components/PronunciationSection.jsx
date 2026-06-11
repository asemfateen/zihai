import { useState, useEffect } from 'react'
import { useSpeechRecognition } from '../hooks/useSpeechRecognition'
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis'
import { PlayIcon } from './Icons'
import Spinner from './Spinner'

function PronunciationSection({ word }) {
  const { supported, isListening, transcript, error, startListening, stopListening } = useSpeechRecognition()
  const { speak, isSpeaking } = useSpeechSynthesis()
  const [score, setScore] = useState(null)
  const [matchStatus, setMatchStatus] = useState('') // 'perfect' | 'good' | 'try-again' | ''

  // Clear states when target word changes
  useEffect(() => {
    setScore(null)
    setMatchStatus('')
  }, [word])

  // Calculate score when transcript changes
  useEffect(() => {
    if (!transcript) return

    const target = word.character.trim()
    const result = transcript.trim()
    
    // Strict match first
    if (target === result) {
      setScore(100)
      setMatchStatus('perfect')
      return
    }
    
    // Check if the result contains the target (e.g. they said extra words)
    if (result.includes(target)) {
      setScore(80)
      setMatchStatus('good')
      return
    }

    // Simplified comparison: count matching characters
    let matches = 0
    const targetChars = target.split('')
    targetChars.forEach(char => {
      if (result.includes(char)) {
        matches++
      }
    })

    const computedScore = Math.round((matches / Math.max(target.length, 1)) * 100)
    setScore(computedScore)

    if (computedScore === 100) {
      setMatchStatus('perfect')
    } else if (computedScore >= 50) {
      setMatchStatus('good')
    } else {
      setMatchStatus('try-again')
    }
  }, [transcript, word])

  const handleListen = () => {
    speak(word.character)
  }

  const handleRecord = () => {
    if (isListening) {
      stopListening()
    } else {
      startListening()
    }
  }

  return (
    <div className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-3xl p-6 shadow-xl relative overflow-hidden transition-all duration-300">
      <h2 className="text-lg font-bold text-text-primary mb-1">Pronunciation Practice</h2>
      <p className="text-sm text-text-secondary mb-4">
        Listen to the native voice, then record yourself reading the word aloud.
      </p>

      <div className="flex flex-col md:flex-row gap-6 items-center">
        {/* Buttons Panel */}
        <div className="flex flex-wrap gap-3 w-full md:w-auto">
          {/* Play Button */}
          <button
            onClick={handleListen}
            disabled={isSpeaking}
            className={`flex-1 md:flex-none px-5 py-3 rounded-2xl flex items-center justify-center gap-2 text-sm font-semibold transition-all duration-200 shadow-md ${
              isSpeaking
                ? 'bg-primary/20 text-primary cursor-not-allowed'
                : 'bg-primary text-text-primary hover:bg-primary-hover hover:scale-105 active:scale-95 shadow-primary/20'
            }`}
          >
            {isSpeaking ? (
              <>
                <Spinner className="w-4 h-4 text-text-primary animate-spin" />
                Speaking...
              </>
            ) : (
              <>
                <PlayIcon className="w-4 h-4" />
                Listen
              </>
            )}
          </button>

          {/* Record Button */}
          {supported ? (
            <button
              onClick={handleRecord}
              className={`flex-1 md:flex-none px-5 py-3 rounded-2xl flex items-center justify-center gap-2 text-sm font-semibold transition-all duration-200 shadow-md ${
                isListening
                  ? 'bg-rose-500 text-white animate-pulse shadow-rose-500/20'
                  : 'bg-surface/80 border border-border/50 text-text-primary hover:bg-surface hover:scale-105 active:scale-95'
              }`}
            >
              {isListening ? (
                <>
                  <span className="w-2.5 h-2.5 bg-white rounded-full animate-ping mr-1" />
                  Stop Recording
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-1 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                  Record
                </>
              )}
            </button>
          ) : (
            <div className="text-xs text-rose-500 bg-rose-500/10 border border-rose-500/20 rounded-xl px-3 py-2 w-full md:w-auto">
              Microphone input not supported by this browser.
            </div>
          )}
        </div>

        {/* Visual Feedback Area */}
        <div className="flex-1 w-full bg-surface/30 border border-border/30 rounded-2xl p-4 flex flex-col justify-center min-h-[90px]">
          {isListening && (
            <div className="flex items-center justify-center gap-3 text-sm text-rose-400 font-semibold animate-pulse py-2">
              <span className="flex gap-1 items-center">
                <span className="w-1.5 h-3 bg-rose-500 rounded animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-5 bg-rose-500 rounded animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-2.5 bg-rose-500 rounded animate-bounce [animation-delay:300ms]" />
              </span>
              Speak now...
            </div>
          )}

          {!isListening && !transcript && !error && (
            <div className="text-center text-sm text-text-secondary py-2">
              Click &quot;Record&quot; and read <span className="font-bold text-text-primary text-base">{word.character}</span> aloud.
            </div>
          )}

          {error && (
            <div className="text-center text-sm text-rose-500 font-medium py-2">
              {error}
            </div>
          )}

          {!isListening && transcript && (
            <div className="flex flex-col gap-2">
              <div className="text-sm text-text-secondary">
                You said: <span className="font-bold text-text-primary text-lg ml-1">{transcript}</span>
              </div>

              {score !== null && (
                <div className="flex items-center gap-4 mt-1">
                  <div className="flex-1 bg-surface rounded-full h-2 overflow-hidden border border-border/30">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        matchStatus === 'perfect'
                          ? 'bg-emerald-500'
                          : matchStatus === 'good'
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                      }`}
                      style={{ width: `${score}%` }}
                    />
                  </div>
                  <span
                    className={`text-sm font-bold ${
                      matchStatus === 'perfect'
                        ? 'text-emerald-500'
                        : matchStatus === 'good'
                        ? 'text-amber-500'
                        : 'text-rose-500'
                    }`}
                  >
                    {score}% Match
                  </span>
                </div>
              )}

              {matchStatus && (
                <div className="text-xs font-semibold mt-1">
                  {matchStatus === 'perfect' && (
                    <span className="text-emerald-500">Perfect! Your pronunciation is spot on. 🌟</span>
                  )}
                  {matchStatus === 'good' && (
                    <span className="text-amber-500">Great job! Keep practicing to get closer. 👍</span>
                  )}
                  {matchStatus === 'try-again' && (
                    <span className="text-rose-500">Not quite. Try reading again clearly. 💪</span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default PronunciationSection
