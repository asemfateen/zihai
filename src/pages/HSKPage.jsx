import { useState, useEffect, useCallback } from 'react'
import Navbar from '../components/Navbar'
import API_BASE, { fetchWithTimeout } from '../api'
import Spinner from '../components/Spinner'
import { CheckIcon, PlusIcon, ChevronLeftIcon } from '../components/Icons'

function HSKPage() {
  const [hskStats, setHskStats] = useState(null)
  const [selectedLevel, setSelectedLevel] = useState(null)
  const [wordsData, setWordsData] = useState(null)
  const [loadingStats, setLoadingStats] = useState(true)
  const [loadingWords, setLoadingWords] = useState(false)
  const [page, setPage] = useState(1)
  const [error, setError] = useState(false)
  const [actionLoading, setActionLoading] = useState({})

  const fetchHskStats = useCallback(async () => {
    setLoadingStats(true)
    setError(false)
    try {
      const res = await fetchWithTimeout(`${API_BASE}/api/hsk/stats`, {
        credentials: 'include',
      })
      if (!res.ok) throw new Error('Failed to fetch HSK stats')
      const data = await res.json()
      setHskStats(data)
    } catch (err) {
      console.error(err)
      setError(true)
    } finally {
      setLoadingStats(false)
    }
  }, [])

  useEffect(() => {
    fetchHskStats()
  }, [fetchHskStats])

  const fetchHskWords = useCallback(async (level, pageNum) => {
    setLoadingWords(true)
    try {
      const res = await fetchWithTimeout(`${API_BASE}/api/hsk/${level}?page=${pageNum}&limit=50`, {
        credentials: 'include',
      })
      if (!res.ok) throw new Error('Failed to fetch HSK words')
      const data = await res.json()
      setWordsData(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingWords(false)
    }
  }, [])

  const handleSelectLevel = (level) => {
    setSelectedLevel(level)
    setPage(1)
    fetchHskWords(level, 1)
  }

  const handleBack = () => {
    setSelectedLevel(null)
    setWordsData(null)
    fetchHskStats()
  }

  const handleToggleDeck = async (word) => {
    const wordId = word.id
    setActionLoading((prev) => ({ ...prev, [wordId]: true }))
    try {
      const url = `${API_BASE}/api/flashcards/${wordId}/${word.inDeck ? '' : 'add'}`
      const method = word.inDeck ? 'DELETE' : 'POST'
      const res = await fetchWithTimeout(url, {
        method,
        credentials: 'include',
      })
      if (res.ok) {
        setWordsData((prev) => {
          if (!prev) return null
          return {
            ...prev,
            words: prev.words.map((w) => (w.id === wordId ? { ...w, inDeck: !w.inDeck } : w)),
          }
        })
      }
    } catch (err) {
      console.error(err)
    } finally {
      setActionLoading((prev) => ({ ...prev, [wordId]: false }))
    }
  }

  if (loadingStats) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-8 flex items-center justify-center min-h-[60vh]">
          <Spinner size={40} />
        </div>
      </div>
    )
  }

  if (error || !hskStats) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-8 text-center py-20">
          <p className="text-lg font-medium text-red-500 mb-2">Something went wrong.</p>
          <p className="text-sm text-text-secondary mb-6">Failed to load HSK levels.</p>
          <button
            onClick={fetchHskStats}
            className="px-5 py-2 bg-primary text-text-primary rounded-lg hover:bg-primary-hover transition-colors font-medium"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-text-primary">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-8">
        {!selectedLevel ? (
          <>
            <header className="mb-8">
              <h1 className="text-3xl font-bold mb-2">HSK Levels</h1>
              <p className="text-text-secondary">Study standard HSK vocabulary lists, track progress, and add words to your flashcards.</p>
            </header>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((level) => {
                const stat = hskStats[level] || { total: 0, added: 0, mastered: 0 }
                const pctAdded = stat.total > 0 ? Math.round((stat.added / stat.total) * 100) : 0
                const pctMastered = stat.total > 0 ? Math.round((stat.mastered / stat.total) * 100) : 0

                return (
                  <div
                    key={level}
                    onClick={() => handleSelectLevel(level)}
                    className="bg-card border border-border rounded-xl p-6 hover:border-primary/50 cursor-pointer transition-all duration-300 transform hover:-translate-y-1 hover:shadow-lg flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-2xl font-black text-primary">HSK {level}</span>
                        <span className="text-xs text-text-secondary font-bold uppercase tracking-wider">Level {level}</span>
                      </div>
                      <p className="text-sm text-text-secondary mb-4">
                        {stat.total} standard vocabulary words.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span>Added to Deck</span>
                          <span>{pctAdded}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-surface rounded-full overflow-hidden">
                          <div className="h-full bg-primary" style={{ width: `${pctAdded}%` }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span>Mastered (SRS)</span>
                          <span>{pctMastered}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-surface rounded-full overflow-hidden">
                          <div className="h-full bg-green-500" style={{ width: `${pctMastered}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        ) : (
          <>
            <button
              onClick={handleBack}
              className="mb-6 px-3 py-2 text-sm text-text-secondary border border-border rounded-lg hover:text-primary hover:border-primary transition-colors flex items-center gap-1.5"
            >
              <ChevronLeftIcon className="w-4 h-4" />
              Back to Levels
            </button>

            <header className="mb-6 flex justify-between items-end">
              <div>
                <h1 className="text-3xl font-extrabold text-primary mb-1">HSK Level {selectedLevel} Vocabulary</h1>
                <p className="text-text-secondary">
                  Showing {wordsData ? wordsData.words.length : 0} of {wordsData ? wordsData.total : 0} words
                </p>
              </div>
            </header>

            {loadingWords ? (
              <div className="flex justify-center py-20">
                <Spinner size={30} />
              </div>
            ) : wordsData ? (
              <div className="space-y-3">
                <div className="overflow-hidden border border-border rounded-xl bg-card">
                  <div className="divide-y divide-border">
                    {wordsData.words.map((word) => (
                      <div key={word.id} className="p-4 flex items-center justify-between hover:bg-surface transition-colors">
                        <div className="flex items-baseline gap-4">
                          <span className="text-2xl font-bold text-text-primary">{word.character}</span>
                          <span className="text-sm text-primary font-medium">{word.pinyin}</span>
                          <span className="text-sm text-text-secondary hidden sm:inline">{word.english_definition}</span>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-xs text-text-secondary sm:hidden block truncate max-w-28">
                            {word.english_definition}
                          </span>
                          <button
                            onClick={() => handleToggleDeck(word)}
                            disabled={actionLoading[word.id]}
                            className={`p-2 rounded-lg border flex items-center justify-center transition-all ${
                              word.inDeck
                                ? 'bg-primary/10 border-primary/20 text-primary hover:bg-primary/20'
                                : 'bg-surface border-border text-text-secondary hover:border-primary hover:text-primary'
                            }`}
                            title={word.inDeck ? 'Remove from Deck' : 'Add to Deck'}
                          >
                            {actionLoading[word.id] ? (
                              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            ) : word.inDeck ? (
                              <CheckIcon className="w-4 h-4" />
                            ) : (
                              <PlusIcon className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {wordsData.totalPages > 1 && (
                  <div className="flex justify-center items-center gap-4 mt-6">
                    <button
                      onClick={() => {
                        const newPage = Math.max(1, page - 1)
                        setPage(newPage)
                        fetchHskWords(selectedLevel, newPage)
                      }}
                      disabled={page === 1}
                      className="px-4 py-2 border border-border rounded-lg disabled:opacity-50 text-sm font-medium hover:border-primary transition-colors"
                    >
                      Previous
                    </button>
                    <span className="text-sm font-medium">
                      Page {page} of {wordsData.totalPages}
                    </span>
                    <button
                      onClick={() => {
                        const newPage = Math.min(wordsData.totalPages, page + 1)
                        setPage(newPage)
                        fetchHskWords(selectedLevel, newPage)
                      }}
                      disabled={page === wordsData.totalPages}
                      className="px-4 py-2 border border-border rounded-lg disabled:opacity-50 text-sm font-medium hover:border-primary transition-colors"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  )
}

export default HSKPage
