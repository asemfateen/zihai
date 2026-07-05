import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { useAuth } from '../context/AuthContext'
import API_BASE, { fetchWithTimeout } from '../api'
import { HeartIcon, FlashcardIcon, ClockIcon, GridIcon, DashboardIcon, SpeakerIcon, UserIcon } from '../components/Icons'

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
    <div className="min-h-screen bg-transparent relative z-10">
      <Navbar />
      <div className="flex flex-col items-center justify-center px-4 pt-16 sm:pt-24 pb-20 max-w-4xl mx-auto">
        <h1 className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-bold bg-gradient-to-r from-primary via-rose-500 to-orange-500 bg-clip-text text-transparent mb-4 tracking-tight drop-shadow-sm text-center">
          字海
        </h1>
        <p className="text-lg sm:text-xl md:text-2xl text-text-secondary mb-8 sm:mb-12 font-light text-center">
          The most complete Chinese dictionary
        </p>

        <form onSubmit={handleSubmit} className="w-full max-w-xl animate-fade-in">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Search characters, pinyin, or definitions..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 px-4 sm:px-5 py-3 bg-card/80 backdrop-blur-md text-text-primary text-base sm:text-lg border border-border/50 rounded-xl outline-none focus:border-primary transition-all placeholder:text-text-secondary focus:ring-2 focus:ring-primary/20 shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)] dark:shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)]"
            />
            <button
              type="submit"
              className="px-4 sm:px-6 py-3 bg-gradient-to-r from-primary to-rose-600 text-white text-base sm:text-lg font-medium rounded-xl hover:shadow-lg hover:shadow-primary/30 transition-all hover:-translate-y-0.5 active:translate-y-0 border border-primary/20 cursor-pointer"
            >
              Search
            </button>
          </div>
        </form>

        <div className="mt-8 animate-fade-in flex gap-4">
          <button
            onClick={() => navigate('/analyzer')}
            className="px-6 py-3 bg-card/60 backdrop-blur-xl border border-border/50 rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all flex items-center gap-2 text-text-primary font-medium"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"></path></svg>
            Text Analyzer
          </button>
        </div>
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
    <div className="min-h-screen bg-transparent relative z-10 pb-20">
      <Navbar />
      
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 md:auto-rows-[140px]">
          
          {/* Welcome Hero - spans all 4 cols on desktop, 2 on mobile */}
          <div className="col-span-2 md:col-span-5 bg-gradient-to-br from-primary via-rose-600 to-orange-500 rounded-3xl p-6 md:p-8 flex flex-col justify-center text-white shadow-xl shadow-primary/20 relative overflow-hidden animate-fade-in md:h-auto min-h-[140px]">
            <div className="absolute right-0 top-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
            <h2 className="text-3xl md:text-4xl font-bold mb-2 z-10">Welcome back{user?.username ? `, ${user.username}` : ''}!</h2>
            <p className="text-white/90 text-sm md:text-base z-10">Ready to master some Chinese characters today?</p>
          </div>

          {/* Flashcards Due - Main CTA - spans 2 cols, 2 rows */}
          <div
            onClick={() => navigate('/flashcards')}
            className="col-span-2 md:row-span-2 bg-card/80 backdrop-blur-xl border border-border/50 rounded-3xl p-6 md:p-8 shadow-sm hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-1 cursor-pointer transition-all relative overflow-hidden group flex flex-col justify-between animate-fade-in [animation-delay:100ms] min-h-[200px]"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative z-10 flex items-center justify-between">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                <FlashcardIcon className="w-7 h-7" />
              </div>
              <p className="text-xs font-bold uppercase tracking-widest text-text-secondary bg-surface px-3 py-1 rounded-full border border-border">Due Today</p>
            </div>
            <div className="relative z-10 mt-6 md:mt-4">
              <p className="text-6xl font-black text-text-primary mb-2">
                {loading ? <span className="skeleton inline-block w-16 h-16 align-middle rounded-xl" /> : flashcardsDue ?? 0}
              </p>
              <p className="text-text-secondary font-medium mb-4">Cards waiting for review</p>
              <button className="w-full py-3 bg-primary text-white rounded-xl font-bold group-hover:bg-primary-hover transition-colors shadow-lg shadow-primary/20">
                Start Reviewing
              </button>
            </div>
          </div>

          {/* Quick Tools - 1x1 tiles */}
          <button
            onClick={() => navigate('/radicals')}
            className="col-span-1 md:row-span-1 bg-card/80 backdrop-blur-xl border border-border/50 rounded-3xl p-4 flex flex-col items-center justify-center gap-3 hover:bg-surface hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/5 hover:border-primary/30 transition-all group animate-fade-in [animation-delay:150ms] min-h-[120px]"
          >
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 group-hover:rotate-6 transition-transform">
              <GridIcon className="w-6 h-6" />
            </div>
            <span className="text-sm font-bold text-text-primary">Radicals</span>
          </button>

          <button
            onClick={() => navigate('/hsk')}
            className="col-span-1 md:row-span-1 bg-card/80 backdrop-blur-xl border border-border/50 rounded-3xl p-4 flex flex-col items-center justify-center gap-3 hover:bg-surface hover:-translate-y-1 hover:shadow-lg hover:shadow-amber-500/5 hover:border-amber-500/30 transition-all group animate-fade-in [animation-delay:200ms] min-h-[120px]"
          >
            <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 group-hover:scale-110 group-hover:-rotate-6 transition-transform">
              <DashboardIcon className="w-6 h-6" />
            </div>
            <span className="text-sm font-bold text-text-primary">HSK Levels</span>
          </button>

          <button
            onClick={() => navigate('/pinyin')}
            className="col-span-1 md:row-span-1 bg-card/80 backdrop-blur-xl border border-border/50 rounded-3xl p-4 flex flex-col items-center justify-center gap-3 hover:bg-surface hover:-translate-y-1 hover:shadow-lg hover:shadow-blue-500/5 hover:border-blue-500/30 transition-all group animate-fade-in [animation-delay:250ms] min-h-[120px]"
          >
            <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 group-hover:scale-110 group-hover:rotate-6 transition-transform">
              <SpeakerIcon className="w-6 h-6" />
            </div>
            <span className="text-sm font-bold text-text-primary">Pinyin</span>
          </button>

          <button
            onClick={() => navigate('/analyzer')}
            className="col-span-1 md:row-span-1 bg-card/80 backdrop-blur-xl border border-border/50 rounded-3xl p-4 flex flex-col items-center justify-center gap-3 hover:bg-surface hover:-translate-y-1 hover:shadow-lg hover:shadow-indigo-500/5 hover:border-indigo-500/30 transition-all group animate-fade-in [animation-delay:300ms] min-h-[120px]"
          >
            <div className="w-12 h-12 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-500 group-hover:scale-110 group-hover:-rotate-6 transition-transform">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"></path></svg>
            </div>
            <span className="text-sm font-bold text-text-primary">Analyzer</span>
          </button>

          <button
            onClick={() => navigate('/reading')}
            className="col-span-1 md:row-span-1 bg-card/80 backdrop-blur-xl border border-border/50 rounded-3xl p-4 flex flex-col items-center justify-center gap-3 hover:bg-surface hover:-translate-y-1 hover:shadow-lg hover:shadow-violet-500/5 hover:border-violet-500/30 transition-all group animate-fade-in [animation-delay:325ms] min-h-[120px]"
          >
            <div className="w-12 h-12 rounded-full bg-violet-500/10 flex items-center justify-center text-violet-500 group-hover:scale-110 group-hover:rotate-6 transition-transform">
              <span className="text-xl">📚</span>
            </div>
            <span className="text-sm font-bold text-text-primary">Reading</span>
          </button>

          <button
            onClick={() => navigate('/quiz')}
            className="col-span-1 md:row-span-1 bg-card/80 backdrop-blur-xl border border-border/50 rounded-3xl p-4 flex flex-col items-center justify-center gap-3 hover:bg-surface hover:-translate-y-1 hover:shadow-lg hover:shadow-rose-500/5 hover:border-rose-500/30 transition-all group animate-fade-in [animation-delay:350ms] min-h-[120px]"
          >
            <div className="w-12 h-12 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500 group-hover:scale-110 group-hover:-rotate-6 transition-transform">
              <span className="text-xl">🎮</span>
            </div>
            <span className="text-sm font-bold text-text-primary">Quiz Mode</span>
          </button>

          <button
            onClick={() => navigate('/stats')}
            className="col-span-1 md:row-span-1 bg-card/80 backdrop-blur-xl border border-border/50 rounded-3xl p-4 flex flex-col items-center justify-center gap-3 hover:bg-surface hover:-translate-y-1 hover:shadow-lg hover:shadow-emerald-500/5 hover:border-emerald-500/30 transition-all group animate-fade-in [animation-delay:375ms] min-h-[120px]"
          >
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 group-hover:scale-110 group-hover:-rotate-6 transition-transform">
              <UserIcon className="w-6 h-6" />
            </div>
            <span className="text-sm font-bold text-text-primary">Stats</span>
          </button>

          {/* Secondary stats - 2 cols, 1 row */}
          <div
            onClick={() => navigate('/favorites')}
            className="col-span-2 md:col-span-2 md:row-span-1 bg-card/80 backdrop-blur-xl border border-border/50 rounded-3xl p-6 flex items-center justify-between hover:bg-surface hover:-translate-y-1 hover:shadow-lg hover:shadow-red-500/10 cursor-pointer transition-all group animate-fade-in [animation-delay:350ms] min-h-[120px]"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500 group-hover:scale-110 group-hover:rotate-3 transition-transform">
                <HeartIcon className="w-7 h-7" />
              </div>
              <div>
                <p className="text-sm font-bold text-text-primary mb-1">Favorites</p>
                <p className="text-xs text-text-secondary">Saved characters</p>
              </div>
            </div>
            <p className="text-3xl font-black text-text-primary">
              {loading ? <span className="skeleton inline-block w-8 h-8 align-middle rounded-lg" /> : favoritesCount ?? 0}
            </p>
          </div>

          <div
            onClick={() => navigate('/history')}
            className="col-span-2 md:col-span-2 md:row-span-1 bg-card/80 backdrop-blur-xl border border-border/50 rounded-3xl p-6 flex items-center justify-between hover:bg-surface hover:-translate-y-1 hover:shadow-lg hover:shadow-purple-500/10 cursor-pointer transition-all group animate-fade-in [animation-delay:400ms] min-h-[120px]"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-500 group-hover:scale-110 group-hover:-rotate-3 transition-transform">
                <ClockIcon className="w-7 h-7" />
              </div>
              <div>
                <p className="text-sm font-bold text-text-primary mb-1">History</p>
                <p className="text-xs text-text-secondary">Recently viewed</p>
              </div>
            </div>
            <div className="text-purple-500 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </div>
          </div>

          {/* Recent Searches - Full Width */}
          <div className="col-span-2 md:col-span-5 bg-card/80 backdrop-blur-xl border border-border/50 rounded-3xl shadow-sm overflow-hidden animate-fade-in [animation-delay:450ms] flex flex-col h-full min-h-[250px] mt-2">
            <div className="flex items-center gap-3 px-6 py-5 border-b border-border/50 bg-surface/50">
              <ClockIcon className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold text-text-primary">Recent Searches</h2>
            </div>
            <div className="flex-1 overflow-y-auto">
              {loading && (
                <div className="px-6 py-5 space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="skeleton h-6 w-full max-w-sm rounded-lg" />
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
                  className={`flex items-center justify-between px-6 py-4 hover:bg-surface cursor-pointer transition-colors group ${
                    index !== history.length - 1 ? 'border-b border-border/30' : ''
                  }`}
                >
                  <span className="text-text-primary font-medium group-hover:text-primary transition-colors">{item.query}</span>
                  <span className="text-xs text-text-secondary flex-shrink-0 ml-4 px-3 py-1 bg-surface rounded-full border border-border/50">
                    {new Date(item.searched_at).toLocaleDateString(navigator.language || 'en-CA', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              ))}
              {!loading && history && history.length === 0 && (
                <div className="px-6 py-12 flex flex-col items-center justify-center text-text-secondary">
                  <div className="w-12 h-12 rounded-full bg-surface flex items-center justify-center mb-3">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-50"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                  </div>
                  <p className="text-sm font-medium">No searches yet</p>
                  <p className="text-xs opacity-75 mt-1">Start searching to see history</p>
                </div>
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  )
}

export default HomePage
