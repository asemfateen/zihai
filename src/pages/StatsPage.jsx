import { useState, useEffect, useCallback } from 'react'
import Navbar from '../components/Navbar'
import { useAuth } from '../context/AuthContext'
import API_BASE, { fetchWithTimeout } from '../api'
import { FlashcardIcon, ClockIcon, HeartIcon } from '../components/Icons'
import ActivityHeatmap from '../components/ActivityHeatmap'

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
    <div className="min-h-screen bg-background relative z-10 text-text-primary">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Study Statistics</h1>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:auto-rows-[160px]">
            {[1, 2, 3, 4, 5].map(i => <div key={i} className={`bg-card btn-brutal p-6 animate-pulse ${i >= 4 ? 'col-span-2 md:col-span-4' : 'col-span-2 md:col-span-1 md:row-span-1'}`} />)}
          </div>
        ) : error ? (
          <div className="bg-card btn-brutal p-8 text-center animate-fade-in [animation-delay:100ms]">
            <p className="text-red-400 mb-4">Failed to load statistics</p>
            <button onClick={fetchStats} className="px-6 py-2 bg-primary text-white rounded-xl font-bold  shadow-primary/20 hover:bg-primary-hover transition-all">Retry</button>
          </div>
        ) : stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:auto-rows-[160px]">
            {/* Current Streak */}
            <div className="col-span-2 md:col-span-1 md:row-span-1 bg-card btn-brutal p-6    hover:shadow-orange-500/10 transition-all duration-300 animate-fade-in [animation-delay:100ms] flex flex-col justify-between group">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500 group-hover:scale-110 group-hover:rotate-6 transition-transform">
                  <ClockIcon className="w-6 h-6" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">Current Streak</span>
                  {stats.longestStreak > stats.streak && (
                    <span className="text-[10px] text-text-tertiary">Best: {stats.longestStreak}</span>
                  )}
                </div>
              </div>
              <div className="flex items-baseline gap-2 mt-4">
                <span className="text-5xl font-black text-text-primary">{stats.streak}</span>
                <span className="text-text-secondary font-medium">days</span>
              </div>
            </div>

            {/* Total Cards */}
            <div className="col-span-2 md:col-span-1 md:row-span-1 bg-card btn-brutal p-6     transition-all duration-300 animate-fade-in [animation-delay:150ms] flex flex-col justify-between group">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 group-hover:rotate-6 transition-transform">
                  <FlashcardIcon className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">Total</span>
              </div>
              <div className="flex items-baseline gap-2 mt-4">
                <span className="text-5xl font-black text-text-primary">{stats.totalCards}</span>
                <span className="text-text-secondary font-medium">cards</span>
              </div>
            </div>

            {/* HSK Progress */}
            <div className="col-span-2 md:col-span-2 md:row-span-1 bg-card btn-brutal p-6    hover:shadow-emerald-500/10 transition-all duration-300 animate-fade-in [animation-delay:200ms] flex flex-col justify-between group">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 group-hover:scale-110 group-hover:-rotate-6 transition-transform">
                  <HeartIcon className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">HSK Progress</span>
              </div>
              <div className="flex items-baseline gap-2 mt-4">
                <span className="text-5xl font-black text-text-primary">
                  {stats.hskProgress ? stats.hskProgress.reduce((acc, curr) => acc + curr.count, 0) : 0}
                </span>
                <span className="text-text-secondary font-medium">words learned</span>
              </div>
            </div>

            {/* Heatmap Activity */}
            <div className="col-span-2 md:col-span-4 bg-card btn-brutal p-6   hover:shadow-emerald-500/5 transition-all duration-300 animate-fade-in [animation-delay:220ms] flex flex-col justify-center min-h-[220px]">
              <h3 className="text-lg font-bold mb-4 text-text-primary">Review Activity</h3>
              <ActivityHeatmap data={stats.heatmap || []} />
            </div>

            {/* Mastery Breakdown */}
            <div className="col-span-2 md:col-span-4 bg-card btn-brutal p-6   hover:shadow-primary/5 transition-all duration-300 animate-fade-in [animation-delay:250ms] flex flex-col justify-center min-h-[200px]">
              <h3 className="text-lg font-bold mb-6 text-text-primary">Mastery Breakdown</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="text-center group  transition-transform">
                  <div className="text-4xl font-black text-primary mb-1 group-hover:scale-110 transition-transform">{stats.newCards}</div>
                  <div className="text-xs text-text-secondary uppercase font-bold tracking-tighter">Due/New</div>
                </div>
                <div className="text-center group  transition-transform">
                  <div className="text-4xl font-black text-amber-500 mb-1 group-hover:scale-110 transition-transform">{stats.learningCards}</div>
                  <div className="text-xs text-text-secondary uppercase font-bold tracking-tighter">Learning</div>
                </div>
                <div className="text-center group  transition-transform">
                  <div className="text-4xl font-black text-emerald-500 mb-1 group-hover:scale-110 transition-transform">{stats.masteredCards}</div>
                  <div className="text-xs text-text-secondary uppercase font-bold tracking-tighter">Mastered</div>
                </div>
                <div className="text-center group  transition-transform">
                  <div className="text-4xl font-black text-text-primary mb-1 group-hover:scale-110 transition-transform">{stats.longestStreak}</div>
                  <div className="text-xs text-text-secondary uppercase font-bold tracking-tighter">Best Streak</div>
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

