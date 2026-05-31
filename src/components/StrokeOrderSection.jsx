import { useCallback } from 'react'
import { useHanziWriter } from '../hooks/useHanziWriter'
import { PlayIcon, PauseIcon } from './Icons'

function StrokeOrderSection({ word }) {
  const {
    writerRefs,
    supportedChars,
    writersReady,
    isPlaying,
    isPaused,
    playFromIndex,
    togglePlay,
  } = useHanziWriter(word)

  const handleBoxClick = useCallback(
    (i) => {
      playFromIndex(i)
    },
    [playFromIndex],
  )

  const handleBoxKeyDown = useCallback(
    (e, i) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        playFromIndex(i)
      }
    },
    [playFromIndex],
  )

  return (
    <div className="bg-card border border-border rounded-xl p-4 sm:p-5 mb-4">
      <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">Stroke Order</h2>

      <div className="flex flex-wrap gap-2 sm:gap-4 justify-center mb-4">
        {word.character.split('').map((char, i) => (
          <div key={i} className="flex flex-col items-center">
            <div
              ref={(el) => (writerRefs.current[i] = el)}
              onClick={() => handleBoxClick(i)}
              onKeyDown={(e) => handleBoxKeyDown(e, i)}
              role="button"
              tabIndex={0}
              className="w-20 h-20 sm:w-28 sm:h-28 md:w-36 md:h-36 bg-surface rounded-lg border border-border overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary/50 transition-shadow"
            />
            {supportedChars[i] === false && (
              <p className="text-xs text-text-secondary mt-1">Not available</p>
            )}
          </div>
        ))}
      </div>

      {writersReady && (
        <div className="flex justify-center">
          <button
            onClick={togglePlay}
            className="px-5 py-2 bg-primary text-text-primary rounded-lg hover:bg-primary-hover transition-all hover:scale-105 active:scale-95 font-medium flex items-center gap-2 text-sm sm:text-base"
          >
            {isPlaying && !isPaused ? (
              <>
                <PauseIcon className="w-4 h-4" />
                Pause
              </>
            ) : (
              <>
                <PlayIcon className="w-4 h-4" />
                {isPaused ? 'Resume' : 'Play'}
              </>
            )}
          </button>
        </div>
      )}
    </div>
  )
}

export default StrokeOrderSection
