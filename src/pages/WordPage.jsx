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
import { ChevronLeftIcon, HeartIcon, TrashIcon, FlashcardIcon, SpeakerIcon, SpeakerWaveIcon, SpeakerMuteIcon, PlusIcon } from '../components/Icons'
import ExampleSentenceCard from '../components/ExampleSentenceCard'
import CustomListsModal from '../components/CustomListsModal'
import RADICAL_MAP from '../data/radicals'

function WordPage() {
  const { query } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { toast, showToast } = useToast()
  const { word, loading, notFound } = useWordData(query)
  const { isFavorite, favoriteLoading, toggleFavorite } = useWordFavorite(word, user, showToast)
  const { speak: speakTTS, isSpeaking, supported: speechSupported } = useSpeechSynthesis()
  const [inDeck, setInDeck] = useState(false)
  const [addingToDeck, setAddingToDeck] = useState(false)
  const [showListsModal, setShowListsModal] = useState(false)

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
      <div className="max-w-4xl mx-auto px-4 py-8">
        <button
          onClick={handleBack}
          className="mb-6 px-4 py-2 text-sm text-text-secondary bg-surface/50 backdrop-blur-md border border-border/50 rounded-xl hover:text-primary hover:border-primary transition-colors flex items-center gap-1.5"
        >
          <ChevronLeftIcon className="w-4 h-4" />
          Back
        </button>

        {toast && (
          <div className="fixed top-28 left-1/2 -translate-x-1/2 z-[60] px-5 py-2.5 bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl shadow-lg text-text-primary text-sm animate-fade-in" role="status" aria-live="polite">
            {toast}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          
          {/* Main Hero Card - Bento Style */}
          <div className="md:col-span-12 bg-card/80 backdrop-blur-xl border border-border/50 rounded-3xl p-8 sm:p-12 shadow-sm hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1 transition-all animate-fade-in [animation-delay:100ms] flex flex-col items-center justify-center relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            
            <div className="flex gap-2 justify-center flex-wrap mb-6 relative z-10">
              {word.character.split('').map((char, i) => (
                <button
                  key={i}
                  onClick={() => navigate(`/search?q=${encodeURIComponent(char)}`)}
                  aria-label={`Search for character ${char}`}
                  className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-black text-text-primary hover:text-primary transition-transform hover:scale-110 cursor-pointer drop-shadow-sm"
                >
                  {char}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-4 mb-8 relative z-10">
              <p className="text-3xl sm:text-4xl font-bold text-primary">{word.pinyin}</p>
              {speechSupported ? (
                <button
                  onClick={speak}
                  className={`flex items-center justify-center w-12 h-12 rounded-full transition-all shadow-md ${
                    isSpeaking
                      ? 'bg-primary text-text-primary scale-110 animate-pulse shadow-primary/30'
                      : 'bg-surface/80 backdrop-blur-xl text-text-secondary hover:text-primary hover:border-primary border border-border/50 hover:shadow-lg'
                  }`}
                  title='Listen to pronunciation'
                  aria-label='Listen to pronunciation'
                >
                  {isSpeaking ? <SpeakerWaveIcon className="w-6 h-6" /> : <SpeakerIcon className="w-6 h-6" />}
                </button>
              ) : (
                <div
                  className="flex items-center justify-center w-12 h-12 rounded-full bg-surface/80 backdrop-blur-xl border border-border/50 text-text-secondary opacity-50 cursor-not-allowed"
                  title="Speech not supported in this browser"
                  tabIndex={-1}
                >
                  <SpeakerMuteIcon className="w-6 h-6" />
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4 relative z-10">
              <button
                onClick={() => toggleFavorite(navigate)}
                disabled={favoriteLoading}
                className="flex items-center justify-center w-14 h-14 bg-surface/50 border border-border/50 rounded-2xl transition-all hover:-translate-y-1 hover:shadow-lg hover:border-red-500/50 hover:shadow-red-500/20 active:translate-y-0 disabled:opacity-50"
                title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              >
                {favoriteLoading ? (
                  <div className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <HeartIcon filled={isFavorite} className="w-7 h-7 text-red-500" />
                )}
              </button>

              <button
                onClick={inDeck ? removeFromDeck : addToDeck}
                disabled={addingToDeck}
                className={`flex items-center justify-center w-14 h-14 rounded-2xl transition-all hover:-translate-y-1 hover:shadow-lg active:translate-y-0 disabled:opacity-50 ${
                  inDeck
                    ? 'bg-primary/20 border border-primary/50 text-primary shadow-primary/20'
                    : 'bg-surface/50 border border-border/50 text-text-secondary hover:text-primary hover:border-primary/50 hover:shadow-primary/20'
                }`}
                title={inDeck ? 'Remove from deck' : 'Study this word'}
                aria-label={inDeck ? 'Remove from deck' : 'Study this word'}
              >
                {addingToDeck ? (
                  <div className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : inDeck ? (
                  <TrashIcon className="w-7 h-7" />
                ) : (
                  <FlashcardIcon className="w-7 h-7" />
                )}
              </button>

              <button
                onClick={() => setShowListsModal(true)}
                className="flex items-center justify-center w-14 h-14 bg-surface/50 border border-border/50 rounded-2xl transition-all hover:-translate-y-1 hover:shadow-lg hover:text-primary hover:border-primary/50 hover:shadow-primary/20 active:translate-y-0 text-text-secondary"
                title="Add to Custom List"
                aria-label="Add to Custom List"
              >
                <PlusIcon className="w-7 h-7" />
              </button>

              {word.hsk_level && (
                <span className="px-5 py-3 bg-amber-500/10 border border-amber-500/30 text-amber-500 rounded-2xl text-sm font-bold shadow-sm">
                  HSK {word.hsk_level}
                </span>
              )}
              
              {word.radical && RADICAL_MAP[word.radical] && (
                <button
                  onClick={() => navigate(`/radicals/${word.radical}`)}
                  className="px-5 py-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 rounded-2xl text-sm font-bold shadow-sm hover:-translate-y-1 hover:shadow-md hover:shadow-emerald-500/20 transition-all flex items-center gap-2"
                >
                  <span className="text-lg">{RADICAL_MAP[word.radical]}</span>
                  <span>Radical {word.radical}</span>
                </button>
              )}
            </div>
          </div>

          {/* Definition Tile */}
          <div className="md:col-span-12 bg-card/80 backdrop-blur-xl border border-border/50 rounded-3xl p-8 shadow-sm hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1 transition-all animate-fade-in [animation-delay:200ms] group relative overflow-hidden flex flex-col justify-center min-h-[140px]">
             <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
             <div className="relative z-10">
               <h2 className="text-xs font-black text-text-secondary uppercase tracking-widest mb-4 bg-surface inline-block px-4 py-1.5 rounded-full border border-border shadow-sm">Definition</h2>
               <p className="text-xl sm:text-2xl text-text-primary font-medium">{word.english_definition || 'No definition available'}</p>
             </div>
          </div>

          {/* Examples Tile */}
          {word.examples && word.examples.length > 0 && (
            <div className="md:col-span-12 bg-card/80 backdrop-blur-xl border border-border/50 rounded-3xl p-8 shadow-sm hover:shadow-lg hover:shadow-purple-500/10 hover:-translate-y-1 transition-all animate-fade-in [animation-delay:300ms] group relative overflow-hidden">
               <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
               <div className="relative z-10">
                 <h2 className="text-xs font-black text-text-secondary uppercase tracking-widest mb-5 bg-surface inline-block px-4 py-1.5 rounded-full border border-border shadow-sm">Example Sentences</h2>
                 <div className="space-y-4">
                   {word.examples.map((ex, i) => (
                     <ExampleSentenceCard
                       key={i}
                       sentence={ex.sentence}
                       translation={ex.translation}
                     />
                   ))}
                 </div>
               </div>
            </div>
          )}

          {/* Stroke Order Section wrapper */}
          <div className="md:col-span-12 animate-fade-in [animation-delay:400ms]">
             <StrokeOrderSection word={word} />
          </div>

        </div>
      </div>

      <CustomListsModal
        wordId={word.id}
        isOpen={showListsModal}
        onClose={() => setShowListsModal(false)}
      />
    </div>
  )
}

export default WordPage
