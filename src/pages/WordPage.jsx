import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import StrokeOrderSection from '../components/StrokeOrderSection'
import WordListDropdown from '../components/WordListDropdown'
import { useAuth } from '../context/AuthContext'
import { useWordData } from '../hooks/useWordData'
import { useWordFavorite } from '../hooks/useWordFavorite'
import { useToast } from '../hooks/useToast'
import API_BASE, { fetchWithTimeout } from '../api'
import { ChevronLeftIcon, HeartIcon, TrashIcon, FlashcardIcon, SpeakerIcon, SpeakerWaveIcon, SpeakerMuteIcon } from '../components/Icons'

const speechSupported = typeof window !== 'undefined' && 'speechSynthesis' in window

function WordPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { toast, showToast, cleanupToast } = useToast()
  const { word, loading, notFound, mountedRef } = useWordData(id)
  const { isFavorite, favoriteLoading, toggleFavorite } = useWordFavorite(word, user, showToast)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [voicesReady, setVoicesReady] = useState(typeof window === 'undefined' ? false : window.speechSynthesis.getVoices().length > 0)
  const [inDeck, setInDeck] = useState(false)
  const [addingToDeck, setAddingToDeck] = useState(false)

  useEffect(() => {
    if (!speechSupported) return
    const voices = window.speechSynthesis.getVoices()
    if (voices.length > 0) {
      setVoicesReady(true)
    } else {
      window.speechSynthesis.onvoiceschanged = () => {
        const v = window.speechSynthesis.getVoices()
        if (v.length > 0) setVoicesReady(true)
      }
    }
    return () => {
      cleanupToast()
      window.speechSynthesis.cancel()
      window.speechSynthesis.onvoiceschanged = null
    }
  }, [cleanupToast])

  useEffect(() => {
    if (!word || !user) return
    let cancelled = false
    fetchWithTimeout(`${API_BASE}/api/flashcards/indeck/${word.id}`, {
      credentials: 'include',
    })
      .then((res) => {
        if (!res.ok) throw new Error('failed to check deck status')
        return res.json()
      })
      .then((data) => {
        if (!cancelled) setInDeck(data.inDeck)
      })
      .catch((err) => {
        console.error('Failed to check deck status:', err)
      })
    return () => { cancelled = true }
  }, [word, user])

  const speak = () => {
    if (!speechSupported || !word) return
    if (!voicesReady) {
      showToast('Speech not available on this browser')
      return
    }
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(word.character)
    utterance.lang = 'zh-CN'
    utterance.rate = 0.8
    const voices = window.speechSynthesis.getVoices()
    const zhVoice = voices.find((v) => v.lang.startsWith('zh'))
    if (zhVoice) utterance.voice = zhVoice
    utterance.onstart = () => setIsSpeaking(true)
    utterance.onend = () => setIsSpeaking(false)
    utterance.onerror = () => {
      console.error('Speech synthesis error')
      setIsSpeaking(false)
      showToast('Speech failed')
    }
    window.speechSynthesis.speak(utterance)
  }

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1)
    } else {
      navigate('/')
    }
  }

  const addToDeck = async () => {
    if (!user) {
      navigate('/login')
      return
    }
    if (inDeck) {
      showToast('Already in your deck')
      return
    }
    setAddingToDeck(true)
    try {
      const res = await fetchWithTimeout(`${API_BASE}/api/flashcards/${word.id}/init`, {
        method: 'POST',
        credentials: 'include',
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        console.error('Add to deck failed:', res.status, errData)
        showToast(errData.error || `Failed to add to deck (${res.status})`)
      } else {
        setInDeck(true)
        showToast('Added to flashcard deck')
      }
    } catch (err) {
      console.error('Failed to add to deck:', err)
      showToast('Failed to add to deck')
    }
    setAddingToDeck(false)
  }

  const removeFromDeck = async () => {
    if (!user) return
    setAddingToDeck(true)
    try {
      const res = await fetchWithTimeout(`${API_BASE}/api/flashcards/${word.id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        console.error('Remove from deck failed:', res.status, errData)
        showToast(errData.error || `Failed to remove from deck (${res.status})`)
      } else {
        setInDeck(false)
        showToast('Removed from deck')
      }
    } catch (err) {
      console.error('Failed to remove from deck:', err)
      showToast('Failed to remove from deck')
    }
    setAddingToDeck(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
          <div className="flex flex-col items-center space-y-4 mb-8">
            <div className="skeleton w-24 h-24 rounded-xl" />
            <div className="skeleton w-40 h-8" />
            <div className="skeleton w-16 h-6 rounded-full" />
          </div>
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="skeleton w-20 h-4 mb-3" />
            <div className="skeleton w-48 h-8" />
          </div>
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="skeleton w-24 h-4 mb-3" />
            <div className="skeleton w-full h-6" />
          </div>
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="skeleton w-28 h-4 mb-4" />
            <div className="flex gap-4 justify-center">
              <div className="skeleton w-28 h-28 rounded-lg" />
              <div className="skeleton w-28 h-28 rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex flex-col items-center justify-center py-20 px-4">
          <h1 className="text-8xl font-bold text-primary mb-4">404</h1>
          <p className="text-2xl text-text-primary mb-2">Word not found</p>
          <p className="text-text-secondary mb-8 text-center">The word you are looking for doesn't exist or has been moved.</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-primary text-text-primary rounded-lg hover:bg-primary-hover transition-all hover:scale-105 font-medium"
          >
            Go Home
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-8">
        <button
          onClick={handleBack}
          className="mb-4 px-3 py-2 text-sm text-text-secondary border border-border rounded-lg hover:text-primary hover:border-primary transition-colors flex items-center gap-1.5"
        >
          <ChevronLeftIcon className="w-4 h-4" />
          Back
        </button>

        {toast && (
          <div className="fixed top-28 left-1/2 -translate-x-1/2 z-[60] px-5 py-2.5 bg-card border border-border rounded-lg shadow-lg text-text-primary text-sm animate-fade-in" role="status" aria-live="polite">
            {toast}
          </div>
        )}

        <div className="text-center mb-8">
          <div className="flex gap-1 sm:gap-2 justify-center flex-wrap mb-3">
            {word.character.split('').map((char, i) => (
              <button
                key={i}
                onClick={() => navigate(`/search?q=${encodeURIComponent(char)}`)}
                aria-label={`Search for character ${char}`}
                className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-text-primary hover:text-primary transition-all hover:scale-110 cursor-pointer leading-normal"
              >
                {char}
              </button>
            ))}
          </div>

          <button
            onClick={() => toggleFavorite(navigate)}
            disabled={favoriteLoading}
            className="mb-3 inline-flex items-center justify-center w-12 h-12 rounded-full transition-all hover:scale-110 active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
            title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            {favoriteLoading ? (
              <div className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <HeartIcon filled={isFavorite} className="w-8 h-8" />
            )}
          </button>

          <WordListDropdown
            word={word}
            user={user}
            navigate={navigate}
            showToast={showToast}
          />

          <button
            onClick={inDeck ? removeFromDeck : addToDeck}
            disabled={addingToDeck}
            className={`mb-3 inline-flex items-center justify-center w-12 h-12 rounded-full border transition-all hover:scale-110 disabled:opacity-50 ${
              inDeck
                ? 'bg-primary/20 border-primary text-primary hover:bg-primary/30'
                : 'bg-surface border-border text-text-secondary hover:text-primary hover:border-primary'
            }`}
            title={inDeck ? 'Remove from deck' : 'Study this word'}
          >
            {addingToDeck ? (
              <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : inDeck ? (
              <TrashIcon className="w-6 h-6" />
            ) : (
              <FlashcardIcon className="w-6 h-6" />
            )}
          </button>

          <div className="flex items-center justify-center gap-3 mb-3">
            <p className="text-2xl text-primary">{word.pinyin}</p>
            {speechSupported && voicesReady ? (
              <button
                onClick={speak}
                className={`flex items-center justify-center w-10 h-10 rounded-full transition-all ${
                  isSpeaking
                    ? 'bg-primary text-text-primary scale-110 animate-pulse'
                    : 'bg-surface text-text-secondary hover:text-primary hover:border-primary border border-border'
                }`}
                title="Listen to pronunciation"
              >
                {isSpeaking ? <SpeakerWaveIcon className="w-5 h-5" /> : <SpeakerIcon className="w-5 h-5" />}
              </button>
            ) : (
              <div
                className="flex items-center justify-center w-10 h-10 rounded-full bg-surface border border-border text-text-secondary opacity-50 cursor-not-allowed"
                title={speechSupported ? 'Speech voice not loaded' : 'Speech not supported in this browser'}
                tabIndex={-1}
              >
                <SpeakerMuteIcon className="w-5 h-5" />
              </div>
            )}
          </div>

          {word.hsk_level && (
            <span className="inline-block px-3 py-1 bg-primary/20 text-primary rounded-full text-sm font-semibold">
              HSK {word.hsk_level}
            </span>
          )}
        </div>

        <div className="bg-card border border-border rounded-xl p-4 sm:p-5 mb-4 hover:border-primary/50 transition-colors">
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-2">Definition</h2>
          <p className="text-lg sm:text-xl text-text-primary">{word.english_definition || 'No definition available'}</p>
        </div>

        <StrokeOrderSection word={word} mountedRef={mountedRef} />
      </div>
    </div>
  )
}

export default WordPage
