import { useState, useCallback } from 'react'
import { useHanziWriter } from '../hooks/useHanziWriter'
import { PlayIcon, PauseIcon } from './Icons'

function StrokeOrderSection({ word }) {
  const [mode, setMode] = useState('learn') // 'learn' | 'practice'
  const {
    writerRefs,
    supportedChars,
    writersReady,
    isPlaying,
    isPaused,
    playFromIndex,
    togglePlay,
    quizStates,
    activeQuizIndex,
    startQuiz,
    cancelQuiz,
  } = useHanziWriter(word)

  const handleBoxClick = useCallback(
    (i) => {
      if (mode === 'practice') {
        if (activeQuizIndex === i) {
          cancelQuiz(i)
        } else {
          startQuiz(i)
        }
      } else {
        playFromIndex(i)
      }
    },
    [mode, playFromIndex, startQuiz, cancelQuiz, activeQuizIndex],
  )

  const handleBoxKeyDown = useCallback(
    (e, i) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        handleBoxClick(i)
      }
    },
    [handleBoxClick],
  )

  return (
    <div className="bg-card btn-brutal p-6 mb-6  relative overflow-hidden  duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg font-bold text-text-primary">Stroke Order & Practice</h2>
          <p className="text-sm text-text-secondary mt-0.5">
            {mode === 'learn' ? 'Click a box to see stroke sequence animation.' : 'Click a character to start writing practice.'}
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex bg-surface p-1 btn-brutal border border-border/50 self-start sm:self-auto">
          <button
            onClick={() => {
              setMode('learn')
              if (activeQuizIndex !== -1) cancelQuiz(activeQuizIndex)
            }}
            className={`px-4 py-1.5 btn-brutal text-sm font-semibold  duration-200 ${
              mode === 'learn'
                ? 'bg-primary text-text-primary shadow'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Learn Order
          </button>
          <button
            onClick={() => setMode('practice')}
            className={`px-4 py-1.5 btn-brutal text-sm font-semibold  duration-200 ${
              mode === 'practice'
                ? 'bg-primary text-text-primary shadow'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Practice Writing
          </button>
        </div>
      </div>

      {/* Grid of Character Boxes */}
      <div className="flex flex-wrap gap-4 sm:gap-6 justify-center mb-6">
        {word.character.split('').map((char, i) => {
          const quiz = quizStates[i]
          const isPracticing = activeQuizIndex === i

          return (
            <div key={i} className="flex flex-col items-center">
              <div className="relative group">
                <div
                  ref={(el) => (writerRefs.current[i] = el)}
                  onClick={() => handleBoxClick(i)}
                  onKeyDown={(e) => handleBoxKeyDown(e, i)}
                  role="button"
                  tabIndex={0}
                  className={`w-24 h-24 sm:w-32 sm:h-32 md:w-36 md:h-36 bg-surface btn-brutal border  duration-300 overflow-hidden cursor-pointer relative ${
                    isPracticing
                      ? 'border-primary ring-2 ring-primary/40  '
                      : quiz?.completed
                      ? 'border-emerald-500/50 bg-emerald-500/5'
                      : 'border-border/50 hover:border-text-secondary/50 hover:-translate-y-0.5'
                  }`}
                />

                {/* Overlay guides for quiz state */}
                {isPracticing && !quiz?.completed && (
                  <div className="absolute top-2 right-2 flex gap-1 pointer-events-none">
                    <span className="px-1.5 py-0.5 text-[10px] font-bold bg-primary/20 text-primary border border-primary/20 rounded-md ">
                      Draw
                    </span>
                  </div>
                )}

                {quiz?.completed && (
                  <div className="absolute inset-0 bg-emerald-500/10  btn-brutal flex items-center justify-center pointer-events-none animate-fade-in">
                    <svg className="w-10 h-10 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </div>

              {supportedChars[i] === false && (
                <p className="text-xs text-text-secondary mt-1">Not available</p>
              )}

              {/* Practice Stats Sub-panel */}
              {mode === 'practice' && quiz && (
                <div className="mt-2 text-center text-xs animate-fade-in">
                  {quiz.completed ? (
                    <span className="text-emerald-500 font-semibold">
                      Done! Mistakes: {quiz.mistakes}
                    </span>
                  ) : (
                    <div className="text-text-secondary flex flex-col gap-0.5">
                      <span>Stroke {quiz.activeStroke} of {quiz.totalStrokes}</span>
                      {quiz.mistakes > 0 && (
                        <span className="text-rose-500">Mistakes: {quiz.mistakes}</span>
                      )}
                    </div>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      startQuiz(i)
                    }}
                    className="mt-1 text-[10px] font-medium text-primary hover:underline block mx-auto"
                  >
                    Reset
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Mode Instructions and General Actions */}
      <div className="flex justify-center border-t border-border/30 pt-4">
        {mode === 'learn' ? (
          writersReady && (
            <button
              onClick={togglePlay}
              className="px-5 py-2 bg-primary text-text-primary btn-brutal     font-semibold flex items-center gap-2 text-sm sm:text-base  "
            >
              {isPlaying && !isPaused ? (
                <>
                  <PauseIcon className="w-4 h-4" />
                  Pause Animation
                </>
              ) : (
                <>
                  <PlayIcon className="w-4 h-4 animate-pulse" />
                  {isPaused ? 'Resume Animation' : 'Play Sequence'}
                </>
              )}
            </button>
          )
        ) : (
          <div className="text-center text-sm text-text-secondary">
            {activeQuizIndex === -1 ? (
              <span className="animate-pulse">Click any character box above to start tracing strokes!</span>
            ) : (
              <div className="flex items-center gap-3">
                <span>Practicing character {activeQuizIndex + 1}</span>
                <button
                  onClick={() => cancelQuiz(activeQuizIndex)}
                  className="px-3 py-1 bg-surface border border-border/50 text-text-primary hover:bg-surface btn-brutal text-xs font-semibold"
                >
                  Exit Practice
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default StrokeOrderSection
