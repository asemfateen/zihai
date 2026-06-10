import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import StrokeOrderSection from '../components/StrokeOrderSection'
import { useAuth } from '../context/AuthContext'
import { useWordData } from '../hooks/useWordData'
import { useWordFavorite } from '../hooks/useWordFavorite'
import { useToast } from '../hooks/useToast'
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis'
import API_BASE, { fetchWithTimeout } from '../api'
import { ChevronLeftIcon, HeartIcon, TrashIcon, FlashcardIcon, SpeakerIcon, SpeakerWaveIcon, SpeakerMuteIcon } from '../components/Icons'
import ExampleSentenceCard from '../components/ExampleSentenceCard'
import RADICAL_MAP from '../data/radicals'

function WordPage() {
  const { query } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { toast, showToast } = useToast()
  const { word, loading, notFound } = useWordData(id)
  const { isFavorite, favoriteLoading, toggleFavorite } = useWordFavorite(word, user, showToast)
  const { speak: speakTTS, isSpeaking, supported: speechSupported } = useSpeechSynthesis()
  const [inDeck, setInDeck] = useState(false)
  const [addingToDeck, setAddingToDeck] = useState(false)

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
    speakTTS(word.character)
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
      const res = await fetchWithTimeout(`${API_BASE}/api/flashcards/${word.id}/add`, {
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
      <div className="min-h-screen bg-transparent relative z-10">
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
          <div className="flex flex-col items-center space-y-4 mb-8">
            <div className="skeleton w-24 h-24 rounded-xl" />
            <div className="skeleton w-40 h-8" />
            <div className="skeleton w-16 h-6 rounded-full" />
          </div>
          <div className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-xl p-5">
            <div className="skeleton w-20 h-4 mb-3" />
            <div className="skeleton w-48 h-8" />
          </div>
          <div className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-xl p-5">
            <div className="skeleton w-24 h-4 mb-3" />
            <div className="skeleton w-full h-6" />
          </div>
          <div className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-xl p-5">
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
      <div className="min-h-screen bg-transparent relative z-10">
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
    <div className="min-h-screen bg-transparent relative z-10">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-8">
        <button
          onClick={handleBack}
          className="mb-4 px-3 py-2 text-sm text-text-secondary border border-border/50 rounded-lg hover:text-primary hover:border-primary transition-colors flex items-center gap-1.5"
        >
          <ChevronLeftIcon className="w-4 h-4" />
          Back
        </button>

        {toast && (
          <div className="fixed top-28 left-1/2 -translate-x-1/2 z-[60] px-5 py-2.5 bg-card/80 backdrop-blur-xl border border-border/50 rounded-lg shadow-lg text-text-primary text-sm animate-fade-in" role="status" aria-live="polite">
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

          <button
            onClick={inDeck ? removeFromDeck : addToDeck}
            disabled={addingToDeck}
            className={`mb-3 inline-flex items-center justify-center w-12 h-12 rounded-full border transition-all hover:scale-110 disabled:opacity-50 ${
              inDeck
                ? 'bg-primary/20 border-primary text-primary hover:bg-primary/30'
                : 'bg-surface/80 backdrop-blur-xl border-border/50 text-text-secondary hover:text-primary hover:border-primary'
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
            {speechSupported ? (
              <button
                onClick={speak}
                className={`flex items-center justify-center w-10 h-10 rounded-full transition-all ${
                  isSpeaking
                    ? 'bg-primary text-text-primary scale-110 animate-pulse'
                    : 'bg-surface/80 backdrop-blur-xl text-text-secondary hover:text-primary hover:border-primary border border-border'
                }`}
                title='Listen to pronunciation'
              >
                {isSpeaking ? <SpeakerWaveIcon className="w-5 h-5" /> : <SpeakerIcon className="w-5 h-5" />}
              </button>
            ) : (
              <div
                className="flex items-center justify-center w-10 h-10 rounded-full bg-surface/80 backdrop-blur-xl border border-border/50 text-text-secondary opacity-50 cursor-not-allowed"
                title="Speech not supported in this browser"
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
          {word.radical && RADICAL_MAP[word.radical] && (
            <button
              onClick={() => navigate(`/radicals/${word.radical}`)}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-card/80 backdrop-blur-xl border border-border/50 rounded-full text-sm text-text-secondary hover:text-primary hover:border-primary transition-colors ml-2"
            >
              <span className="font-bold">{RADICAL_MAP[word.radical]}</span>
              <span>Radical {word.radical}</span>
            </button>
          )}
        </div>

        <div className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-xl p-4 sm:p-5 mb-4 hover:border-primary/50 transition-colors">
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-2">Definition</h2>
          <p className="text-lg sm:text-xl text-text-primary">{word.english_definition || 'No definition available'}</p>
        </div>

        {word.examples && word.examples.length > 0 && (
          <div className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-xl p-4 sm:p-5 mb-4">
            <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">Example Sentences</h2>
            <div className="space-y-3">
              {word.examples.map((ex, i) => (
                <ExampleSentenceCard
                  key={i}
                  sentence={ex.sentence}
                  translation={ex.translation}
                />
              ))}
            </div>
          </div>
        )}

        <StrokeOrderSection word={word} />
      </div>
    </div>
  )
}

export default WordPage
