import { useHanziWriter } from '../hooks/useHanziWriter'
import { PlayIcon, PauseIcon, ReplayIcon } from './Icons'

function StrokeOrderSection({ word, mountedRef }) {
  const { writerRefs, supportedChars, playAll, pauseAll, replayAll } = useHanziWriter(word, mountedRef)

  return (
    <div className="bg-card border border-border rounded-xl p-4 sm:p-5 mb-4">
      <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">Stroke Order</h2>

      <div className="flex flex-wrap gap-2 sm:gap-4 justify-center mb-4">
        {word.character.split('').map((char, i) => (
          <div key={i} className="flex flex-col items-center">
            <div
              ref={(el) => (writerRefs.current[i] = el)}
              className="w-20 h-20 sm:w-28 sm:h-28 md:w-36 md:h-36 bg-surface rounded-lg border border-border overflow-hidden"
            />
            {!supportedChars[i] && supportedChars[i] !== undefined && (
              <p className="text-xs text-text-secondary mt-1">Not available</p>
            )}
          </div>
        ))}
      </div>

      <div className="flex justify-center gap-2 sm:gap-3">
        <button
          onClick={playAll}
          className="px-4 sm:px-5 py-2 bg-primary text-text-primary rounded-lg hover:bg-primary-hover transition-all hover:scale-105 active:scale-95 font-medium flex items-center gap-2 text-sm sm:text-base"
        >
          <PlayIcon className="w-4 h-4" />
          Play
        </button>
        <button
          onClick={pauseAll}
          className="px-4 sm:px-5 py-2 bg-surface text-text-primary border border-border rounded-lg hover:border-primary transition-all hover:scale-105 active:scale-95 font-medium flex items-center gap-2 text-sm sm:text-base"
        >
          <PauseIcon className="w-4 h-4" />
          Pause
        </button>
        <button
          onClick={replayAll}
          className="px-4 sm:px-5 py-2 bg-surface text-text-primary border border-border rounded-lg hover:border-primary transition-all hover:scale-105 active:scale-95 font-medium flex items-center gap-2 text-sm sm:text-base"
        >
          <ReplayIcon className="w-4 h-4" />
          Replay
        </button>
      </div>
    </div>
  )
}

export default StrokeOrderSection
