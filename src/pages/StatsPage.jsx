import { useState, useEffect, useCallback } from 'react'
import Navbar from '../components/Navbar'
import { useAuth } from '../context/AuthContext'
import API_BASE, { fetchWithTimeout } from '../api'
import { FlashcardIcon, ClockIcon, HeartIcon } from '../components/Icons'

function StatsPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const fetchStats = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const res = await fetchWithTimeout(`${API_BASE}/api/stats`, { credentials: 'include' })
      if (res.ok) {
        setStats(await res.json())
      } else {
        setError(true)
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err)
      setError(true)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (user) fetchStats()
  }, [user, fetchStats])

  if (!user) return null

  return (
    <div className="min-h-screen bg-transparent relative z-10 text-text-primary">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Study Statistics</h1>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => <div key={i} className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-xl p-6 h-32 animate-pulse" />)}
          </div>
        ) : error ? (
          <div className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-xl p-8 text-center">
            <p className="text-red-400 mb-4">Failed to load statistics</p>
            <button onClick={fetchStats} className="px-4 py-2 bg-primary text-text-primary rounded-lg font-medium">Retry</button>
          </div>
        ) : stats && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-xl p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-500">
                    <ClockIcon className="w-6 h-6" />
                  </div>
                  <span className="text-sm font-bold text-text-secondary uppercase tracking-wider">Current Streak</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-text-primary">{stats.streak}</span>
                  <span className="text-text-secondary font-medium">days</span>
                </div>
              </div>

              <div className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-xl p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <FlashcardIcon className="w-6 h-6" />
                  </div>
                  <span className="text-sm font-bold text-text-secondary uppercase tracking-wider">Total Cards</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-text-primary">{stats.totalCards}</span>
                  <span className="text-text-secondary font-medium">learned</span>
                </div>
              </div>

              <div className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-xl p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                    <HeartIcon className="w-6 h-6" />
                  </div>
                  <span className="text-sm font-bold text-text-secondary uppercase tracking-wider">HSK Progress</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-text-primary">
                    {stats.hskProgress ? stats.hskProgress.reduce((acc, curr) => acc + curr.count, 0) : 0}
                  </span>
                  <span className="text-text-secondary font-medium">HSK words</span>
                </div>
              </div>
            </div>

            <div className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-xl p-6">
              <h3 className="text-lg font-bold mb-6">Mastery Breakdown</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-black text-primary">{stats.newCards}</div>
                  <div className="text-xs text-text-secondary uppercase font-bold tracking-tighter">Due/New</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-black text-amber-500">{stats.learningCards}</div>
                  <div className="text-xs text-text-secondary uppercase font-bold tracking-tighter">Learning</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-black text-emerald-500">{stats.masteredCards}</div>
                  <div className="text-xs text-text-secondary uppercase font-bold tracking-tighter">Mastered</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-black text-text-primary">{stats.streak}</div>
                  <div className="text-xs text-text-secondary uppercase font-bold tracking-tighter">Streak</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default StatsPage
