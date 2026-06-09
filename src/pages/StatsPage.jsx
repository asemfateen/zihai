import { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import API_BASE, { fetchWithTimeout } from '../api'
import Spinner from '../components/Spinner'

function StatsPage() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let active = true
    const fetchStats = async () => {
      try {
        const res = await fetchWithTimeout(`${API_BASE}/api/stats`, {
          credentials: 'include',
        })
        if (!res.ok) throw new Error('Failed to fetch stats')
        const data = await res.json()
        if (active) {
          setStats(data)
          setLoading(false)
        }
      } catch (err) {
        console.error(err)
        if (active) {
          setError(true)
          setLoading(false)
        }
      }
    }
    fetchStats()
    return () => { active = false }
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-8 flex items-center justify-center min-h-[60vh]">
          <Spinner size={40} />
        </div>
      </div>
    )
  }

  if (error || !stats) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-8 text-center py-20">
          <p className="text-lg font-medium text-red-500 mb-2">Something went wrong.</p>
          <p className="text-sm text-text-secondary mb-6">Failed to load statistics dashboard.</p>
          <button
            onClick={() => window.location.reload()}
            className="px-5 py-2 bg-primary text-text-primary rounded-lg hover:bg-primary-hover transition-colors font-medium"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  const { totalCards, masteredCards, learningCards, newCards, streak, hskProgress } = stats

  const hskMap = {}
  hskProgress.forEach((item) => {
    hskMap[item.hsk_level] = item.count
  })

  const hskTotals = { 1: 150, 2: 300, 3: 600, 4: 1200, 5: 2500, 6: 5000 }

  return (
    <div className="min-h-screen bg-background text-text-primary">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-text-primary mb-2">Study Analytics</h1>
          <p className="text-text-secondary">Track your memory retention, study consistency, and HSK progress.</p>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-card border border-border rounded-xl p-6 flex flex-col justify-between">
            <span className="text-xs uppercase font-semibold text-text-secondary tracking-wider">Study Streak</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-4xl font-extrabold text-primary">{streak}</span>
              <span className="text-sm text-text-secondary">days</span>
            </div>
            <p className="text-xs text-text-secondary mt-2">Keep reviewing every day to maintain your streak!</p>
          </div>

          <div className="bg-card border border-border rounded-xl p-6 flex flex-col justify-between">
            <span className="text-xs uppercase font-semibold text-text-secondary tracking-wider">Total Deck Size</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-4xl font-extrabold text-text-primary">{totalCards}</span>
              <span className="text-sm text-text-secondary">words</span>
            </div>
            <p className="text-xs text-text-secondary mt-2">Words you have added to your SRS flashcards.</p>
          </div>

          <div className="bg-card border border-border rounded-xl p-6 flex flex-col justify-between">
            <span className="text-xs uppercase font-semibold text-text-secondary tracking-wider">Retention Rate</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-4xl font-extrabold text-green-500">
                {totalCards > 0 ? Math.round((masteredCards / totalCards) * 100) : 0}%
              </span>
            </div>
            <p className="text-xs text-text-secondary mt-2">Percentage of words you have fully mastered.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-lg font-bold text-text-primary mb-4">Spaced Repetition (SRS) Stages</h2>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-green-400">Mastered (Interval &gt; 21d)</span>
                  <span className="text-text-secondary font-medium">{masteredCards} / {totalCards}</span>
                </div>
                <div className="w-full h-3 bg-surface rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full"
                    style={{ width: `${totalCards > 0 ? (masteredCards / totalCards) * 100 : 0}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-yellow-400">Learning (Interval 1d - 21d)</span>
                  <span className="text-text-secondary font-medium">{learningCards} / {totalCards}</span>
                </div>
                <div className="w-full h-3 bg-surface rounded-full overflow-hidden">
                  <div
                    className="h-full bg-yellow-500 rounded-full"
                    style={{ width: `${totalCards > 0 ? (learningCards / totalCards) * 100 : 0}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-primary">New / Due for Review</span>
                  <span className="text-text-secondary font-medium">{newCards} / {totalCards}</span>
                </div>
                <div className="w-full h-3 bg-surface rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full"
                    style={{ width: `${totalCards > 0 ? (newCards / totalCards) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-lg font-bold text-text-primary mb-4">HSK Vocabulary Coverage</h2>
            <div className="space-y-3">
              {[1, 2, 3, 4, 5, 6].map((level) => {
                const count = hskMap[level] || 0
                const target = hskTotals[level]
                const percentage = Math.min(100, Math.round((count / target) * 100))
                return (
                  <div key={level}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-semibold">HSK Level {level}</span>
                      <span className="text-text-secondary">{count} / {target} words ({percentage}%)</span>
                    </div>
                    <div className="w-full h-2 bg-surface rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default StatsPage
