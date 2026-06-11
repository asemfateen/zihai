import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import SearchResultCard from '../components/SearchResultCard'
import Spinner from '../components/Spinner'
import { ChevronLeftIcon } from '../components/Icons'
import API_BASE, { fetchWithTimeout } from '../api'

function RadicalDetailPage() {
  const { radical } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [page, setPage] = useState(1)
  const limit = 50

  useEffect(() => {
    let cancelled = false
    fetchWithTimeout(`${API_BASE}/api/radicals/${radical}?page=${page}&limit=${limit}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch')
        return res.json()
      })
      .then(data => {
        if (!cancelled) { setData(data); setError(false) }
      })
      .catch(err => {
        if (err.name === 'AbortError') return
        console.error('Failed to load radical detail:', err)
        if (!cancelled) setError(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true; setLoading(true) }
  }, [radical, page])

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1)
    } else {
      navigate('/radicals')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-transparent relative z-10">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <Spinner size={40} />
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-transparent relative z-10">
        <Navbar />
        <div className="text-center py-20 text-red-400">
          <p className="text-lg font-medium">Failed to load radical details.</p>
          <p className="text-sm mt-1">Please try again later.</p>
          <button
            onClick={() => setPage(1)}
            className="mt-4 px-5 py-2 bg-primary text-text-primary rounded-lg hover:bg-primary-hover transition-colors font-medium"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  const { radical: radicalInfo, words, total, page: currentPage, totalPages } = data

  return (
    <div className="min-h-screen bg-transparent relative z-10">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <button
          onClick={handleBack}
          className="mb-6 px-4 py-2 text-sm text-text-secondary bg-surface/50 backdrop-blur-md border border-border/50 rounded-xl hover:text-primary hover:border-primary transition-colors flex items-center gap-1.5"
        >
          <ChevronLeftIcon className="w-4 h-4" />
          Radicals
        </button>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-8">
          <div className="md:col-span-12 bg-card/80 backdrop-blur-xl border border-border/50 rounded-3xl p-8 sm:p-10 shadow-sm hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1 transition-all animate-fade-in [animation-delay:100ms] relative overflow-hidden group flex items-center gap-6">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            
            <div className="w-24 h-24 sm:w-32 sm:h-32 bg-primary/10 rounded-3xl flex items-center justify-center group-hover:scale-105 group-hover:rotate-3 transition-transform duration-300 relative z-10 border border-primary/20">
              <span className="text-6xl sm:text-7xl font-black text-primary drop-shadow-sm">{radicalInfo.character}</span>
            </div>
            
            <div className="relative z-10">
              <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-2">Radical {radicalInfo.id}</h1>
              <span className="inline-block px-3 py-1 bg-surface border border-border rounded-full text-sm font-bold text-text-secondary uppercase tracking-widest">{total.toLocaleString()} characters</span>
            </div>
          </div>
        </div>

        {words.length === 0 ? (
          <div className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-3xl p-12 text-center text-text-secondary animate-fade-in [animation-delay:200ms]">
            No characters found for this radical.
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {words.map((word, i) => (
              <div key={word.id} className="animate-fade-in" style={{ animationDelay: `${200 + Math.min(i * 50, 500)}ms` }}>
                <SearchResultCard result={word} />
              </div>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-8 animate-fade-in [animation-delay:300ms]">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="px-4 py-2 text-sm font-bold border border-border/50 bg-card/80 backdrop-blur-xl rounded-xl hover:border-primary hover:text-primary transition-all hover:-translate-y-0.5 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:translate-y-0 text-text-secondary"
            >
              Previous
            </button>
            <span className="text-sm font-bold text-text-secondary px-4 py-2 bg-surface/50 rounded-xl border border-border/50">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="px-4 py-2 text-sm font-bold border border-border/50 bg-card/80 backdrop-blur-xl rounded-xl hover:border-primary hover:text-primary transition-all hover:-translate-y-0.5 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:translate-y-0 text-text-secondary"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default RadicalDetailPage
