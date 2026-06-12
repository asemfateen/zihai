import { useState, useCallback } from 'react'
import { CopyIcon } from './Icons'

function ExampleSentenceCard({ sentence, translation }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(sentence)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = sentence
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [sentence])

  return (
    <div className="bg-surface btn-brutal p-4 sm:p-5 hover:border-primary/40 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xl sm:text-2xl text-text-primary font-medium leading-relaxed break-words">
            {sentence}
          </p>
          <p className="mt-2 text-sm sm:text-base text-text-secondary leading-relaxed">
            {translation}
          </p>
        </div>
        <button
          onClick={handleCopy}
          className="shrink-0 flex items-center justify-center w-8 h-8 rounded-md text-text-secondary hover:text-primary hover:bg-primary/10 transition-all active:scale-90"
          aria-label={copied ? 'Copied!' : 'Copy sentence'}
          title={copied ? 'Copied!' : 'Copy sentence'}
        >
          {copied ? (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-green-500">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
            <CopyIcon className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  )
}

export default ExampleSentenceCard
