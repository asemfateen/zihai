import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { useAuth } from '../context/AuthContext'
import API_BASE, { fetchWithTimeout } from '../api'

function FlashcardsPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [cards, setCards] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [loading, setLoading] = useState(true)
  const [complete, setComplete] = useState(false)
  const [animating, setAnimating] = useState(false)
  const [toast, setToast] = useState(null)
  const [error, setError] = useState(false)
  const [correctCount, setCorrectCount] = useState(0)
  const [incorrectCount, setIncorrectCount] = useState(0)
  const transitionTimerRef = useRef(null)

  const fetchDueCards = async () => {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/api/flashcards/due`, {
        credentials: 'include',
      })
      if (res.ok) {
        const data = await res.json()
        setCards(data)
      } else {
        setError(true)
      }
    } catch {
      setError(true)
    }
    setLoading(false)
  }

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }
    fetchDueCards()
  }, [user, navigate])

  useEffect(() => {
    return () => {
      if (transitionTimerRef.current) {
        clearTimeout(transitionTimerRef.current)
      }
    }
  }, [])

  const currentCharacter = cards[currentIndex]?.character
  const speak = () => {
    if (!currentCharacter || typeof window === 'undefined' || !('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(currentCharacter)
    utterance.lang = 'zh-CN'
    utterance.rate = 0.8
    window.speechSynthesis.speak(utterance)
  }

  const showToast = (message) => {
    setToast(message)
    setTimeout(() => setToast(null), 2500)
  }

  const handleResult = async (correct) => {
    if (animating) return
    setAnimating(true)
    const word = cards[currentIndex]
    try {
      const res = await fetchWithTimeout(`${API_BASE}/api/flashcards/${word.id}/result`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ correct }),
      })
      if (!res.ok) {
        showToast('Failed to save result. Please try again.')
        setAnimating(false)
        return
      }
    } catch {
      showToast('Failed to save result. Please try again.')
      setAnimating(false)
      return
    }

    if (correct) {
      setCorrectCount((prev) => prev + 1)
    } else {
      setIncorrectCount((prev) => prev + 1)
    }

    if (currentIndex + 1 >= cards.length) {
      setComplete(true)
      setAnimating(false)
    } else {
      setFlipped(false)
      transitionTimerRef.current = setTimeout(() => {
        setCurrentIndex((prev) => prev + 1)
        setAnimating(false)
      }, 300)
    }
  }

  const handleSkip = async () => {
    await handleResult(false)
  }

  if (!user) return null

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
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
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex flex-col items-center justify-center py-20 px-4">
          <p className="text-lg font-medium text-red-400 mb-2">Something went wrong.</p>
          <p className="text-sm text-red-400 mb-6">Please try again.</p>
          <button
            onClick={fetchDueCards}
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
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex flex-col items-center justify-center py-20 px-4">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4 bg-primary/20">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="#c0392b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
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
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex flex-col items-center justify-center py-20 px-4">
          <div className="w-20 h-20 bg-primary bg-opacity-20 rounded-full flex items-center justify-center mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-text-primary mb-2">Session complete!</h1>
          <p className="text-text-secondary text-lg mb-2 text-center">You reviewed {cards.length} card{cards.length > 1 ? 's' : ''}.</p>
          <p className="text-text-secondary mb-6 text-center">
            <span className="text-green-400">{correctCount} correct</span> &middot; <span className="text-red-400">{incorrectCount} to review</span>
          </p>
          <div className="flex gap-4">
            <button
              onClick={() => {
                setComplete(false)
                setCurrentIndex(0)
                setFlipped(false)
                setCorrectCount(0)
                setIncorrectCount(0)
                fetchDueCards()
              }}
              className="px-6 py-3 bg-surface border border-border text-text-primary rounded-lg hover:border-primary transition-colors font-medium"
            >
              Review Again
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
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-lg mx-auto px-4 py-6">
        {toast && (
          <div className="fixed top-28 left-1/2 -translate-x-1/2 z-[55] px-5 py-2.5 bg-card border border-border rounded-lg shadow-lg text-text-primary text-sm animate-fade-in">
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
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <div className="w-full h-3 bg-surface rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Card */}
        <div className="perspective-1000 mb-8">
          <div
            onClick={() => !flipped && setFlipped(true)}
            className={`relative w-full min-h-64 sm:min-h-80 cursor-pointer transition-transform duration-500 transform-style-3d ${
              flipped ? 'rotate-y-180' : ''
            }`}
          >
            {/* Front */}
            <div className="absolute inset-0 backface-hidden bg-card border border-border rounded-2xl flex flex-col items-center justify-center p-8">
              <p className="text-7xl sm:text-8xl font-bold text-text-primary mb-4 select-none">
                {card.character}
              </p>
              <p className="text-sm text-text-secondary">Tap to reveal</p>
            </div>

            {/* Back */}
            <div className="absolute inset-0 backface-hidden rotate-y-180 bg-card border border-border rounded-2xl flex flex-col items-center justify-center p-8">
              <div className="flex items-center gap-3 mb-4">
                <p className="text-2xl text-primary">{card.pinyin}</p>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    speak()
                  }}
                  className="flex items-center justify-center w-10 h-10 rounded-full bg-surface border border-border text-text-secondary hover:text-primary hover:border-primary transition-all"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                  </svg>
                </button>
              </div>
              <p className="text-xl text-text-primary text-center">{card.english_definition || 'No definition available'}</p>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        {flipped && (
          <div className="flex gap-4 animate-fade-in">
            <button
              onClick={() => handleResult(false)}
              disabled={animating}
              className="flex-1 py-4 bg-surface border-2 border-red-500 text-red-400 rounded-xl font-semibold text-lg hover:bg-red-500 hover:bg-opacity-10 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-surface"
            >
              Try again
            </button>
            <button
              onClick={handleSkip}
              disabled={animating}
              className="flex-1 py-4 bg-surface border-2 border-border text-text-secondary rounded-xl font-semibold text-lg hover:border-primary hover:text-primary transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-surface disabled:hover:border-border disabled:hover:text-text-secondary"
            >
              Skip
            </button>
            <button
              onClick={() => handleResult(true)}
              disabled={animating}
              className="flex-1 py-4 bg-primary text-text-primary rounded-xl font-semibold text-lg hover:bg-primary-hover transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-primary"
            >
              Got it
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default FlashcardsPage
