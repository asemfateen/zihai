import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Spinner from '../components/Spinner'
import API_BASE, { fetchWithTimeout } from '../api'

function RadicalsPage() {
  const [radicals, setRadicals] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    let cancelled = false
    fetchWithTimeout(`${API_BASE}/api/radicals`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch')
        return res.json()
      })
      .then(data => {
        if (!cancelled) setRadicals(data)
      })
      .catch(err => {
        if (err.name === 'AbortError') return
        console.error('Failed to load radicals:', err)
        setError(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-background relative z-10">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <Spinner size={40} />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background relative z-10">
        <Navbar />
        <div className="text-center py-20 text-red-400">
          <p className="text-lg font-medium">Failed to load radicals.</p>
          <p className="text-sm mt-1">Please try again later.</p>
        </div>
      </div>
    )
  }

  const maxCount = radicals.length > 0 ? radicals[0].count : 1

  return (
    <div className="min-h-screen bg-background relative z-10">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-text-primary">Radical Browser</h1>
          <p className="text-text-secondary text-sm mt-1">Browse Chinese characters by Kangxi radical ({radicals.length} radicals)</p>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 md:auto-rows-[100px]">
          {radicals.map((r, index) => {
            const intensity = Math.min(100, Math.round((r.count / maxCount) * 100))
            return (
              <button
                key={r.id}
                onClick={() => navigate(`/radicals/${r.id}`)}
                className="flex flex-col items-center justify-center gap-1 p-3 bg-card btn-brutal hover:border-primary/50    transition-all duration-300 cursor-pointer active:scale-95 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary animate-fade-in group"
                style={{ animationDelay: `${(index % 20 + 1) * 30}ms` }}
              >
                <span className="text-3xl sm:text-4xl font-bold text-text-primary group-hover:text-primary transition-colors">{r.character}</span>
                <span className="text-[10px] sm:text-xs text-text-secondary font-medium tracking-wider">{r.count.toLocaleString()}</span>
                <div className="w-full h-1 bg-surface rounded-full overflow-hidden mt-1 opacity-50 group-hover:opacity-100 transition-opacity">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${intensity}%` }}
                  />
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default RadicalsPage
