import { useState, useEffect, useRef, useLayoutEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { useAuth } from '../context/AuthContext'
import API_BASE, { fetchWithTimeout } from '../api'
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis'
import { CheckIcon, SpeakerIcon, XIcon } from '../components/Icons'

function FlashcardsPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [cards, setCards] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [loading, setLoading] = useState(true)
  const [complete, setComplete] = useState(false)
  const [animating, setAnimating] = useState(false)
  const [cardPhase, setCardPhase] = useState('idle')
  const [toast, setToast] = useState(null)
  const [error, setError] = useState(false)
  const [correctCount, setCorrectCount] = useState(0)
  const [incorrectCount, setIncorrectCount] = useState(0)
  const [skippedIds, setSkippedIds] = useState(new Set())
  const transitionTimerRef = useRef(null)
  const toastTimerRef = useRef(null)
  const mountedRef = useRef(true)

  const fetchDueCardsRef = useRef(null)
  const sessionDeckRef = useRef([])

  useEffect(() => {
    fetchDueCardsRef.current = async () => {
      setError(false)
      setLoading(true)
      try {
        const res = await fetchWithTimeout(`${API_BASE}/api/decks/1/review`, {
          credentials: 'include',
        })
        if (!mountedRef.current) return
        if (res.ok) {
          const data = await res.json()
          if (!mountedRef.current) return
          setCards(data)
          if (data.length > 0) sessionDeckRef.current = data
          setError(false)
        } else {
          setError(true)
        }
      } catch (err) {
        console.error('Failed to fetch due cards:', err)
        if (mountedRef.current) setError(true)
      } finally {
        if (mountedRef.current) setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    if (!user) {
      navigate('/login')
      return
    }
    const controller = new AbortController()
    fetchDueCardsRef.current()
    return () => {
      controller.abort()
      mountedRef.current = false
      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current)
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel()
      }
    }
  }, [user, navigate])

  const { speak: speakTTS } = useSpeechSynthesis()

  const currentCharacter = cards[currentIndex]?.simplified
  const speak = () => {
    if (!currentCharacter) return
    speakTTS(currentCharacter)
  }

  const showToast = (message) => {
    setToast(message)
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    toastTimerRef.current = setTimeout(() => {
      if (mountedRef.current) setToast(null)
    }, 2500)
  }

  const cardsRef = useRef([])
  useLayoutEffect(() => {
    cardsRef.current = cards
  })

  const advanceToNext = (newCards) => {
    setFlipped(false)
    setCardPhase('exiting')
    transitionTimerRef.current = setTimeout(() => {
      if (!mountedRef.current) return
      if (newCards) {
        setCards(newCards)
        setCurrentIndex(0)
      } else {
        setCurrentIndex((prev) => prev + 1)
      }
      setCardPhase('entering')
      transitionTimerRef.current = setTimeout(() => {
        if (mountedRef.current) setCardPhase('idle')
        setAnimating(false)
      }, 350)
    }, 350)
  }

  const handleResult = async (quality) => {
    if (animating || cardPhase !== 'idle') return
    setAnimating(true)
    const currentCards = cardsRef.current
    const idx = currentIndex
    const word = currentCards[idx]
    if (!word) { setAnimating(false); return }

    let apiError = null
    try {
      const res = await fetchWithTimeout(`${API_BASE}/api/flashcards/${word.id}/grade`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ score: quality >= 3 ? 'correct' : 'incorrect' }),
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        apiError = errData.error || 'Failed to save result'
        showToast(apiError)
        setAnimating(false)
        return
      }
    } catch (err) {
      console.error('Failed to save flashcard result:', err)
      showToast('Failed to save result. Please try again.')
      setAnimating(false)
      return
    }

    if (quality >= 3) {
      setCorrectCount((prev) => prev + 1)
      if (idx + 1 >= currentCards.length) {
        setComplete(true)
        setAnimating(false)
      } else {
        advanceToNext(null)
      }
    } else {
      setIncorrectCount((prev) => prev + 1)
      if (currentCards.length <= 1) {
        setComplete(true)
        setAnimating(false)
      } else {
        const reshuffled = [...currentCards.slice(0, idx), ...currentCards.slice(idx + 1), word]
        advanceToNext(reshuffled)
      }
    }
  }

  const handleSkip = () => {
    if (animating || cardPhase !== 'idle') return
    setAnimating(true)
    const currentCards = cardsRef.current
    const idx = currentIndex
    const card = currentCards[idx]
    if (!card) { setAnimating(false); return }
    const newSkipped = new Set(skippedIds)
    newSkipped.add(card.id)
    setSkippedIds(newSkipped)

    if (newSkipped.size >= currentCards.length) {
      setComplete(true)
      setAnimating(false)
      return
    }

    const remaining = currentCards.filter((_, i) => i !== idx)
    const reshuffled = [...remaining, card]
    advanceToNext(reshuffled)
  }

  if (!user) return null

  if (loading) {
    return (
      <div className="min-h-screen bg-transparent relative z-10">
        <Navbar />
        <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
          <div className="skeleton w-full h-3 rounded-full" />
          <div className="skeleton w-full min-h-80 rounded-2xl" />
          <div className="flex gap-4">
            <div className="skeleton flex-1 h-14 rounded-xl" />
            <div className="skeleton flex-1 h-14 rounded-xl" />
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-transparent relative z-10">
        <Navbar />
        <div className="flex flex-col items-center justify-center py-20 px-4">
          <p className="text-lg font-medium text-red-400 mb-2">Something went wrong.</p>
          <p className="text-sm text-red-400 mb-6">Please try again.</p>
          <button
            onClick={() => fetchDueCardsRef.current()}
            className="px-6 py-3 bg-primary text-text-primary rounded-lg hover:bg-primary-hover transition-colors font-medium"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (cards.length === 0) {
    return (
      <div className="min-h-screen bg-transparent relative z-10">
        <Navbar />
        <div className="flex flex-col items-center justify-center py-20 px-4">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4 bg-primary/20">
            <CheckIcon className="w-8 h-8" style={{ stroke: '#c0392b' }} />
          </div>
          <h1 className="text-3xl font-bold text-text-primary mb-2">All caught up!</h1>
          <p className="text-text-secondary text-lg mb-6 text-center">No cards due for review right now. Check back later.</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-primary text-text-primary rounded-lg hover:bg-primary-hover transition-colors font-medium"
          >
            Go Home
          </button>
        </div>
      </div>
    )
  }

  if (complete) {
    return (
      <div className="min-h-screen bg-transparent relative z-10">
        <Navbar />
        <div className="flex flex-col items-center justify-center py-20 px-4">
          <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mb-6">
            <CheckIcon className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-text-primary mb-2">Session complete!</h1>
          <p className="text-text-secondary text-lg mb-2 text-center">You reviewed {cards.length} card{cards.length > 1 ? 's' : ''}.</p>
          <p className="text-text-secondary mb-6 text-center">
            <span className="text-green-400">{correctCount} correct</span> &middot; <span className="text-red-400">{incorrectCount} to review</span>
          </p>
          <div className="flex gap-4">
            <button
              onClick={() => {
                setCards([...sessionDeckRef.current])
                setComplete(false)
                setCurrentIndex(0)
                setFlipped(false)
                setCardPhase('idle')
                setCorrectCount(0)
                setIncorrectCount(0)
                setSkippedIds(new Set())
                setAnimating(false)
              }}
              className="px-6 py-3 bg-surface/80 backdrop-blur-xl border border-border/50 text-text-primary rounded-lg hover:border-primary transition-colors font-medium"
            >
              Review Again
            </button>
            <button
              onClick={() => {
                setComplete(false)
                setCurrentIndex(0)
                setFlipped(false)
                setCardPhase('idle')
                setCorrectCount(0)
                setIncorrectCount(0)
                setSkippedIds(new Set())
                setAnimating(false)
                fetchDueCardsRef.current()
              }}
              className="px-6 py-3 bg-surface/80 backdrop-blur-xl border border-border/50 text-text-primary rounded-lg hover:border-primary transition-colors font-medium"
            >
              Study More
            </button>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-3 bg-primary text-text-primary rounded-lg hover:bg-primary-hover transition-colors font-medium"
            >
              Go Home
            </button>
          </div>
        </div>
      </div>
    )
  }

  const progress = ((currentIndex + 1) / cards.length) * 100
  const card = cards[currentIndex]

  return (
    <div className="min-h-screen bg-transparent relative z-10">
      <Navbar />
      <div className="max-w-lg mx-auto px-4 py-6">
        {toast && (
          <div className="fixed top-28 left-1/2 -translate-x-1/2 z-[60] px-5 py-2.5 bg-card/80 backdrop-blur-xl border border-border/50 rounded-lg shadow-lg text-text-primary text-sm animate-fade-in" role="status" aria-live="polite">
            {toast}
          </div>
        )}
        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-text-secondary">{currentIndex + 1} / {cards.length}</span>
            <div className="flex items-center gap-3 text-xs">
              <span className="text-green-400">{correctCount} correct</span>
              <span className="text-red-400">{incorrectCount} missed</span>
            </div>
            <button
              onClick={() => navigate('/')}
              className="text-text-secondary hover:text-text-primary transition-colors"
            >
              <XIcon className="w-5 h-5" />
            </button>
          </div>
          <div className="w-full h-3 bg-surface/80 backdrop-blur-xl rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Card */}
        <div className={`mb-8 ${cardPhase === 'exiting' ? 'animate-card-exit' : ''} ${cardPhase === 'entering' ? 'animate-card-enter' : ''}`}>
          <div
            onClick={() => {
              if (cardPhase === 'idle' && !flipped) setFlipped(true)
            }}
            className={`flashcard-flipper w-full min-h-[300px] sm:min-h-[400px] cursor-pointer group ${
              flipped ? 'is-flipped' : 'hover:-translate-y-2'
            } transition-transform duration-300`}
          >
            {/* Front */}
            <div className="flashcard-face bg-card/80 backdrop-blur-xl border border-border/50 rounded-3xl flex flex-col items-center justify-center p-8 shadow-sm group-hover:shadow-xl group-hover:shadow-primary/20 transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl"></div>
              <p className="text-8xl sm:text-9xl font-black text-text-primary mb-6 select-none drop-shadow-sm relative z-10 group-hover:scale-105 transition-transform duration-300">
                {card.simplified}
              </p>
              <p className="text-sm font-bold uppercase tracking-widest text-text-secondary bg-surface/50 px-4 py-2 rounded-full border border-border/50 relative z-10 shadow-sm">Tap to reveal</p>
            </div>

            {/* Back */}
            <div className="flashcard-face flashcard-face--back bg-card/80 backdrop-blur-xl border border-border/50 rounded-3xl flex flex-col items-center justify-center p-8 shadow-xl shadow-primary/10">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-100 rounded-3xl"></div>
              <div className="relative z-10 flex flex-col items-center">
                <div className="flex items-center gap-4 mb-6">
                  <p className="text-3xl sm:text-4xl font-bold text-primary drop-shadow-sm">{card.pinyin}</p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      speak()
                    }}
                    className="flex items-center justify-center w-12 h-12 rounded-full bg-surface/80 backdrop-blur-xl border border-border/50 text-text-secondary hover:text-primary hover:border-primary hover:shadow-md hover:shadow-primary/20 transition-all hover:scale-105 active:scale-95"
                  >
                    <SpeakerIcon className="w-6 h-6" />
                  </button>
                </div>
                <h3 className="text-xs font-black text-text-secondary uppercase tracking-widest mb-3 bg-surface inline-block px-3 py-1 rounded-full border border-border shadow-sm">Definition</h3>
                <p className="text-xl sm:text-2xl text-text-primary text-center font-medium max-w-sm">{card.definition || 'No definition available'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        {flipped && cardPhase === 'idle' && (
          <div className="flex gap-4 animate-fade-in [animation-delay:100ms]">
            <button
              onClick={() => handleResult(0)}
              disabled={animating}
              className="flex-1 py-4 bg-surface/80 backdrop-blur-xl border-2 border-red-500/50 text-red-400 rounded-2xl font-bold text-lg hover:border-red-500 hover:bg-red-500/10 hover:-translate-y-1 hover:shadow-lg hover:shadow-red-500/20 transition-all active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
            >
              Forgot
            </button>
            <button
              onClick={handleSkip}
              disabled={animating}
              className="flex-1 py-4 bg-surface/80 backdrop-blur-xl border-2 border-border/50 text-text-secondary rounded-2xl font-bold text-lg hover:border-text-primary hover:text-text-primary hover:-translate-y-1 hover:shadow-lg transition-all active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
            >
              Skip
            </button>
            <button
              onClick={() => handleResult(4)}
              disabled={animating}
              className="flex-1 py-4 bg-primary text-text-primary rounded-2xl font-bold text-lg hover:bg-primary-hover hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/30 transition-all active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
            >
              Remembered
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default FlashcardsPage
