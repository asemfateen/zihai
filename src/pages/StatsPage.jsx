import { useState, useEffect, useCallback } from 'react'
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
    <div className="min-h-screen bg-transparent relative z-10 text-text-primary">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Study Statistics</h1>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:auto-rows-[160px]">
            {[1, 2, 3, 4, 5].map(i => <div key={i} className={`bg-card/80 backdrop-blur-xl border border-border/50 rounded-3xl p-6 animate-pulse ${i >= 4 ? 'col-span-2 md:col-span-4' : 'col-span-2 md:col-span-1 md:row-span-1'}`} />)}
          </div>
        ) : error ? (
          <div className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-3xl p-8 text-center animate-fade-in [animation-delay:100ms]">
            <p className="text-red-400 mb-4">Failed to load statistics</p>
            <button onClick={fetchStats} className="px-6 py-2 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:bg-primary-hover transition-all">Retry</button>
          </div>
        ) : !stats ? (
          <div className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-3xl p-8 text-center animate-fade-in [animation-delay:100ms]">
            <p className="text-text-secondary mb-4">No statistics available yet. Start studying lessons or flashcards to see your metrics!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:auto-rows-[160px]">
            {/* Current Streak */}
            <div className="col-span-2 md:col-span-1 md:row-span-1 bg-card/80 backdrop-blur-xl border border-border/50 rounded-3xl p-6 shadow-sm hover:-translate-y-1 hover:shadow-lg hover:shadow-orange-500/10 transition-all duration-300 animate-fade-in [animation-delay:100ms] flex flex-col justify-between group">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-500 group-hover:scale-110 group-hover:rotate-6 transition-transform">
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
            <div className="col-span-2 md:col-span-1 md:row-span-1 bg-card/80 backdrop-blur-xl border border-border/50 rounded-3xl p-6 shadow-sm hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 animate-fade-in [animation-delay:150ms] flex flex-col justify-between group">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 group-hover:rotate-6 transition-transform">
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
            <div className="col-span-2 md:col-span-2 md:row-span-1 bg-card/80 backdrop-blur-xl border border-border/50 rounded-3xl p-6 shadow-sm hover:-translate-y-1 hover:shadow-lg hover:shadow-emerald-500/10 transition-all duration-300 animate-fade-in [animation-delay:200ms] flex flex-col justify-between group">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 group-hover:scale-110 group-hover:-rotate-6 transition-transform">
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
            <div className="col-span-2 md:col-span-4 bg-card/80 backdrop-blur-xl border border-border/50 rounded-3xl p-6 shadow-sm hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-300 animate-fade-in [animation-delay:220ms] flex flex-col justify-center min-h-[220px]">
              <h3 className="text-lg font-bold mb-4 text-text-primary">Review Activity</h3>
              <ActivityHeatmap data={stats.heatmap || []} />
            </div>

            {/* Mastery Breakdown */}
            <div className="col-span-2 md:col-span-4 bg-card/80 backdrop-blur-xl border border-border/50 rounded-3xl p-6 shadow-sm hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 animate-fade-in [animation-delay:250ms] flex flex-col justify-center min-h-[200px]">
              <h3 className="text-lg font-bold mb-6 text-text-primary">Mastery Breakdown</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="text-center group hover:-translate-y-1 transition-transform">
                  <div className="text-4xl font-black text-primary mb-1 group-hover:scale-110 transition-transform">{stats.newCards}</div>
                  <div className="text-xs text-text-secondary uppercase font-bold tracking-tighter">Due/New</div>
                </div>
                <div className="text-center group hover:-translate-y-1 transition-transform">
                  <div className="text-4xl font-black text-amber-500 mb-1 group-hover:scale-110 transition-transform">{stats.learningCards}</div>
                  <div className="text-xs text-text-secondary uppercase font-bold tracking-tighter">Learning</div>
                </div>
                <div className="text-center group hover:-translate-y-1 transition-transform">
                  <div className="text-4xl font-black text-emerald-500 mb-1 group-hover:scale-110 transition-transform">{stats.masteredCards}</div>
                  <div className="text-xs text-text-secondary uppercase font-bold tracking-tighter">Mastered</div>
                </div>
                <div className="text-center group hover:-translate-y-1 transition-transform">
                  <div className="text-4xl font-black text-text-primary mb-1 group-hover:scale-110 transition-transform">{stats.longestStreak}</div>
                  <div className="text-xs text-text-secondary uppercase font-bold tracking-tighter">Best Streak</div>
                </div>
              </div>
            </div>

            {/* HSK Level circular gauges */}
            <div className="col-span-2 md:col-span-4 bg-card/80 backdrop-blur-xl border border-border/50 rounded-3xl p-6 shadow-sm hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 animate-fade-in [animation-delay:280ms] flex flex-col min-h-[250px]">
              <h3 className="text-lg font-bold mb-6 text-text-primary">HSK Level Mastery</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
                {[1, 2, 3, 4, 5, 6].map(level => {
                  const levelData = (stats.hskProgress || []).find(p => p.level === level) || { count: 0, total: 100 }
                  const count = levelData.count
                  const total = levelData.total
                  const percentage = total > 0 ? Math.round((count / total) * 100) : 0
                  const radius = 22
                  const circumference = 2 * Math.PI * radius
                  const strokeDashoffset = circumference - (percentage / 100) * circumference

                  const levelColors = {
                    1: "stroke-emerald-500 text-emerald-500",
                    2: "stroke-blue-500 text-blue-500",
                    3: "stroke-indigo-500 text-indigo-500",
                    4: "stroke-purple-500 text-purple-500",
                    5: "stroke-pink-500 text-pink-500",
                    6: "stroke-rose-500 text-rose-500",
                  }
                  const colorClass = levelColors[level] || "stroke-primary text-primary"

                  return (
                    <div key={level} className="flex flex-col items-center p-4 bg-surface/40 border border-border/40 rounded-2xl shadow-sm hover:scale-[1.03] hover:border-primary/30 transition-all duration-300 group">
                      <div className="relative w-16 h-16 mb-2 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90">
                          <circle
                            cx="32"
                            cy="32"
                            r={radius}
                            className="stroke-border/40 fill-none"
                            strokeWidth="4"
                          />
                          <circle
                            cx="32"
                            cy="32"
                            r={radius}
                            className={`${colorClass} fill-none transition-all duration-1000 ease-out`}
                            strokeWidth="4"
                            strokeDasharray={circumference}
                            strokeDashoffset={strokeDashoffset}
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-[9px] font-bold text-text-secondary select-none">HSK</span>
                          <span className="text-sm font-black text-text-primary leading-none select-none">{level}</span>
                        </div>
                      </div>
                      <div className="text-center">
                        <p className="text-xs font-black text-text-primary">{count} / {total}</p>
                        <span className="text-[10px] font-bold text-text-secondary">{percentage}%</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default StatsPage

