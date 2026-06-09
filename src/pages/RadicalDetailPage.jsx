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
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <Spinner size={40} />
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background">
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
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-8">
        <button
          onClick={handleBack}
          className="mb-4 px-3 py-2 text-sm text-text-secondary border border-border rounded-lg hover:text-primary hover:border-primary transition-colors flex items-center gap-1.5"
        >
          <ChevronLeftIcon className="w-4 h-4" />
          Radicals
        </button>

        <div className="flex items-center gap-4 mb-6">
          <span className="text-5xl sm:text-6xl font-bold text-text-primary">{radicalInfo.character}</span>
          <div>
            <h1 className="text-xl font-bold text-text-primary">Radical {radicalInfo.id}</h1>
            <p className="text-text-secondary text-sm">{total.toLocaleString()} characters</p>
          </div>
        </div>

        {words.length === 0 ? (
          <div className="text-center py-12 text-text-secondary">
            No characters found for this radical.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {words.map(word => (
              <SearchResultCard key={word.id} result={word} />
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="px-3 py-2 text-sm border border-border rounded-lg hover:border-primary transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-text-secondary"
            >
              Previous
            </button>
            <span className="text-sm text-text-secondary">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="px-3 py-2 text-sm border border-border rounded-lg hover:border-primary transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-text-secondary"
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
