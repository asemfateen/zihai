import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { useAuth } from '../context/AuthContext'
import API_BASE, { fetchWithTimeout } from '../api'
import { HeartIcon, FlashcardIcon, ClockIcon } from '../components/Icons'

function HomePage() {
  const navigate = useNavigate()
  const { user } = useAuth()

  if (!user) {
    return <GuestHome />
  }

  return <AuthedHome />
}

function GuestHome() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex flex-col items-center justify-center px-4 pt-24 sm:pt-32 pb-20">
        <h1 className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-bold text-primary mb-4 tracking-tight">
          字海
        </h1>
        <p className="text-lg sm:text-xl md:text-2xl text-text-secondary mb-8 sm:mb-12 font-light text-center">
          The most complete Chinese dictionary
        </p>
        <form onSubmit={handleSubmit} className="w-full max-w-xl">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Search characters, pinyin, or definitions..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 px-4 sm:px-5 py-3 bg-card text-text-primary text-base sm:text-lg border border-border rounded-xl outline-none focus:border-primary transition-colors placeholder:text-text-secondary"
            />
            <button
              type="submit"
              className="px-4 sm:px-6 py-3 bg-primary text-text-primary text-base sm:text-lg font-medium rounded-xl hover:bg-primary-hover transition-all hover:scale-105 active:scale-95"
            >
              Search
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function AuthedHome() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [favoritesCount, setFavoritesCount] = useState(null)
  const [flashcardsDue, setFlashcardsDue] = useState(null)
  const [history, setHistory] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [favRes, flashRes, histRes] = await Promise.all([
        fetchWithTimeout(`${API_BASE}/api/favorites`, { credentials: 'include' }),
        fetchWithTimeout(`${API_BASE}/api/flashcards/due`, { credentials: 'include' }),
        fetchWithTimeout(`${API_BASE}/api/history`, { credentials: 'include' }),
      ])
      if (favRes.ok) setFavoritesCount((await favRes.json()).length)
      if (flashRes.ok) setFlashcardsDue((await flashRes.json()).length)
      if (histRes.ok) setHistory((await histRes.json()).slice(0, 5))
    } catch (err) {
      console.error('Failed to fetch home data:', err)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="grid grid-cols-2 gap-3 mb-8">
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <HeartIcon className="w-4 h-4 text-primary" />
              <p className="text-xs text-text-secondary font-medium uppercase tracking-wide">Favorites</p>
            </div>
            <p className="text-2xl font-bold text-text-primary">
              {loading ? <span className="skeleton inline-block w-8 h-8 align-middle" /> : favoritesCount ?? 0}
            </p>
          </div>
          <div
            onClick={() => navigate('/flashcards')}
            onKeyDown={(e) => { if (e.key === 'Enter') navigate('/flashcards') }}
            role="button"
            tabIndex={0}
            className="bg-card border border-border rounded-xl p-4 hover:bg-surface cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-2 mb-2">
              <FlashcardIcon className="w-4 h-4 text-primary" />
              <p className="text-xs text-text-secondary font-medium uppercase tracking-wide">Due</p>
            </div>
            <p className="text-2xl font-bold text-text-primary">
              {loading ? <span className="skeleton inline-block w-8 h-8 align-middle" /> : flashcardsDue ?? 0}
            </p>
          </div>
        </div>

        <button
          onClick={() => navigate('/flashcards')}
          className="w-full mb-8 px-5 py-3 bg-primary text-text-primary rounded-xl hover:bg-primary-hover transition-colors font-medium text-center"
        >
          Continue Studying
        </button>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
            <ClockIcon className="w-4 h-4 text-primary" />
            <h2 className="text-lg font-semibold text-text-primary">Recent Searches</h2>
          </div>
          {loading && (
            <div className="px-5 py-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton h-5 w-40" />
              ))}
            </div>
          )}
          {!loading && history && history.length > 0 && history.map((item, index) => (
            <div
              key={item.id}
              onClick={() => navigate(`/search?q=${encodeURIComponent(item.query)}`)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/search?q=${encodeURIComponent(item.query)}`) } }}
              role="button"
              tabIndex={0}
              className={`flex items-center justify-between px-5 py-3.5 hover:bg-surface cursor-pointer transition-colors ${
                index !== history.length - 1 ? 'border-b border-border' : ''
              }`}
            >
              <span className="text-text-primary">{item.query}</span>
              <span className="text-xs text-text-secondary flex-shrink-0 ml-4">
                {new Date(item.searched_at).toLocaleDateString(navigator.language || 'en-CA')}
              </span>
            </div>
          ))}
          {!loading && history && history.length === 0 && (
            <div className="px-5 py-8 text-center text-text-secondary">
              <p className="text-sm">No searches yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default HomePage
