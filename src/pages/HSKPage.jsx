import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { useAuth } from '../context/AuthContext'
import API_BASE, { fetchWithTimeout } from '../api'
import { CheckIcon, PlusIcon, ChevronLeftIcon, ChevronRightIcon, PlayIcon, SpeakerIcon, SpeakerWaveIcon } from '../components/Icons'
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis'
import { cleanDefinition } from '../utils/text'

function HSKPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { speak, isSpeaking, supported } = useSpeechSynthesis()
  const [selectedLevel, setSelectedLevel] = useState(null)
  const [words, setWords] = useState([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalWords, setTotalWords] = useState(0)
  const [actionLoading, setActionLoading] = useState({})
  const [toast, setToast] = useState(null)

  const HSK_LEVELS = [
    { level: 1, name: 'HSK 1', desc: 'Beginner / Breakthrough', color: 'from-blue-500/20 to-blue-600/20', border: 'border-blue-500/30' },
    { level: 2, name: 'HSK 2', desc: 'Elementary / Tourist', color: 'from-cyan-500/20 to-cyan-600/20', border: 'border-cyan-500/30' },
    { level: 3, name: 'HSK 3', desc: 'Intermediate / Survival', color: 'from-emerald-500/20 to-emerald-600/20', border: 'border-emerald-500/30' },
    { level: 4, name: 'HSK 4', desc: 'Upper Intermediate / Conversational', color: 'from-amber-500/20 to-amber-600/20', border: 'border-amber-500/30' },
    { level: 5, name: 'HSK 5', desc: 'Advanced / Professional', color: 'from-orange-500/20 to-orange-600/20', border: 'border-orange-500/30' },
    { level: 6, name: 'HSK 6', desc: 'Mastery / Fluent', color: 'from-red-500/20 to-red-600/20', border: 'border-red-500/30' },
  ]

  const fetchWords = useCallback(async (level, pageNum) => {
    setLoading(true)
    try {
      const res = await fetchWithTimeout(`${API_BASE}/api/hsk/${level}?page=${pageNum}&limit=50`, {
        credentials: 'include',
      })
      if (res.ok) {
        const data = await res.json()
        setWords(data.words)
        setTotalPages(data.totalPages)
        setTotalWords(data.total)
      } else {
        showToastMessage('Failed to load vocabulary')
      }
    } catch (err) {
      console.error('Fetch words failed:', err)
      showToastMessage('Network error loading vocabulary')
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }
    if (selectedLevel !== null) {
      fetchWords(selectedLevel, page)
    }
  }, [user, navigate, selectedLevel, page, fetchWords])

  const showToastMessage = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  const handleSelectLevel = (level) => {
    setSelectedLevel(level)
    setPage(1)
    setWords([])
  }

  const handleToggleDeck = async (word) => {
    const wordId = word.id
    setActionLoading(prev => ({ ...prev, [wordId]: true }))
    const inDeck = word.inDeck
    const url = inDeck
      ? `${API_BASE}/api/flashcards/${wordId}`
      : `${API_BASE}/api/flashcards/${wordId}/add`
    const method = inDeck ? 'DELETE' : 'POST'

    try {
      const res = await fetchWithTimeout(url, {
        method,
        credentials: 'include',
      })
      if (res.ok) {
        setWords(prev => prev.map(w => w.id === wordId ? { ...w, inDeck: !inDeck } : w))
        showToastMessage(inDeck ? 'Removed from flashcards' : 'Added to flashcards')
      } else {
        showToastMessage('Action failed. Try again.')
      }
    } catch (err) {
      console.error('Toggle deck item failed:', err)
      showToastMessage('Network error updating deck status')
    }
    setActionLoading(prev => ({ ...prev, [wordId]: false }))
  }

  return (
    <div className="min-h-screen bg-transparent relative z-10 text-text-primary">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-8">
        {toast && (
          <div className="fixed top-20 left-1/2 transform -translate-x-1/2 bg-card/80 backdrop-blur-xl border border-border/50 px-4 py-2 rounded-lg shadow-xl text-sm font-medium text-text-primary z-50 animate-fade-in">
            {toast}
          </div>
        )}

        {selectedLevel === null ? (
          <div>
            <h1 className="text-3xl font-bold mb-2">HSK Levels</h1>
            <p className="text-text-secondary text-sm mb-8">
              Select an HSK level to browse its full vocabulary list or start a custom review quiz.
            </p>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:auto-rows-[180px]">
              {HSK_LEVELS.map((lvl, index) => (
                <div
                  key={lvl.level}
                  className={`col-span-2 md:col-span-1 bg-gradient-to-br ${lvl.color} border border-border/50 rounded-3xl p-6 flex flex-col justify-between hover:-translate-y-1 hover:shadow-lg hover:shadow-${lvl.color.split('-')[1]}-500/10 transition-all duration-300 animate-fade-in group bg-card/80 backdrop-blur-xl`}
                  style={{ animationDelay: `${(index + 1) * 100}ms` }}
                >
                  <div>
                    <h2 className="text-2xl font-bold mb-1 group-hover:scale-105 origin-left transition-transform">{lvl.name}</h2>
                    <p className="text-xs text-text-secondary mb-4 uppercase font-bold tracking-wider">{lvl.desc}</p>
                  </div>
                  <div className="flex gap-3 mt-4">
                    <button
                      onClick={() => navigate(`/flashcards?hsk=${lvl.level}`)}
                      className="flex-1 py-2 bg-primary text-white rounded-xl font-bold hover:bg-primary-hover transition-colors flex items-center justify-center gap-2 text-sm cursor-pointer shadow-lg shadow-primary/20 hover:scale-105 active:scale-95"
                    >
                      <PlayIcon className="w-3.5 h-3.5" />
                      Quiz
                    </button>
                    <button
                      onClick={() => handleSelectLevel(lvl.level)}
                      className="flex-1 py-2 bg-surface border border-border/50 text-text-primary rounded-xl font-bold hover:bg-surface/80 transition-colors text-sm cursor-pointer hover:scale-105 active:scale-95"
                    >
                      Browse
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between gap-4 mb-6">
              <button
                onClick={() => setSelectedLevel(null)}
                className="px-3 py-1.5 bg-card/80 backdrop-blur-xl border border-border/50 text-text-primary rounded-lg text-sm flex items-center gap-1.5 hover:bg-surface/80 backdrop-blur-xl cursor-pointer"
              >
                <ChevronLeftIcon className="w-4 h-4" />
                Back to Levels
              </button>
              <h2 className="text-2xl font-bold">HSK {selectedLevel} Vocabulary</h2>
              <button
                onClick={() => navigate(`/flashcards?hsk=${selectedLevel}`)}
                className="px-4 py-2 bg-primary text-text-primary rounded-lg font-semibold hover:bg-primary-hover transition-colors flex items-center gap-2 text-sm cursor-pointer shadow-lg shadow-primary/20"
              >
                <PlayIcon className="w-4.5 h-4.5" />
                Quiz Me
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
              {loading ? (
                <div className="col-span-full py-20 flex justify-center items-center">
                  <span className="animate-spin text-primary font-bold text-2xl">...</span>
                </div>
              ) : words.length === 0 ? (
                <div className="col-span-full py-12 text-center text-text-secondary text-sm bg-card/80 backdrop-blur-xl border border-border/50 rounded-3xl">No words found.</div>
              ) : (
                words.map((word, index) => (
                  <div 
                    key={word.id} 
                    className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-3xl p-5 flex flex-col justify-between hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 animate-fade-in group min-h-[140px]"
                    style={{ animationDelay: `${(index % 10 + 1) * 50}ms` }}
                  >
                    <div className="space-y-2">
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold cursor-pointer hover:text-primary transition-colors" onClick={() => navigate(`/word/${encodeURIComponent(word.character)}`)}>
                          {word.character}
                        </span>
                        <span className="text-sm font-semibold text-primary">{word.pinyin}</span>
                      </div>
                      <p
                        className="text-sm text-text-secondary line-clamp-2"
                        title={word.english_definition || 'No definition available'}
                      >
                        {cleanDefinition(word.english_definition)}
                      </p>
                    </div>

                    <div className="flex items-center justify-end gap-2 mt-4 opacity-70 group-hover:opacity-100 transition-opacity">
                      {supported && (
                        <button
                          onClick={() => speak(word.character)}
                          className={`p-2 border rounded-xl flex items-center justify-center transition-all cursor-pointer hover:scale-110 active:scale-95 ${
                            isSpeaking ? 'bg-primary/20 border-primary text-primary animate-pulse' : 'bg-surface border-border/50 text-text-secondary hover:border-primary hover:text-primary hover:bg-primary/5'
                          }`}
                          title="Listen to pronunciation"
                        >
                          {isSpeaking ? <SpeakerWaveIcon className="w-4 h-4" /> : <SpeakerIcon className="w-4 h-4" />}
                        </button>
                      )}
                      <button
                        onClick={() => handleToggleDeck(word)}
                        disabled={actionLoading[word.id]}
                        className={`p-2 border rounded-xl flex items-center justify-center transition-all cursor-pointer hover:scale-110 active:scale-95 ${
                          word.inDeck
                            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/25'
                            : 'bg-surface border-border/50 text-text-secondary hover:border-primary hover:text-primary hover:bg-primary/5'
                        }`}
                      >
                        {actionLoading[word.id] ? (
                          <span className="w-4 h-4 flex items-center justify-center text-xs animate-spin font-bold">...</span>
                        ) : word.inDeck ? (
                          <CheckIcon className="w-4 h-4" />
                        ) : (
                          <PlusIcon className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-4">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}
                  className="p-2 bg-card/80 backdrop-blur-xl border border-border/50 rounded-lg text-text-primary disabled:opacity-50 hover:bg-surface/80 backdrop-blur-xl cursor-pointer"
                >
                  <ChevronLeftIcon className="w-5 h-5" />
                </button>
                <span className="text-sm text-text-secondary">
                  Page {page} of {totalPages} ({totalWords} words)
                </span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => p + 1)}
                  className="p-2 bg-card/80 backdrop-blur-xl border border-border/50 rounded-lg text-text-primary disabled:opacity-50 hover:bg-surface/80 backdrop-blur-xl cursor-pointer"
                >
                  <ChevronRightIcon className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default HSKPage
