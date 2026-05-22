import { useEffect, useState, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import Navbar from '../components/Navbar'
import SearchResultCard from '../components/SearchResultCard'
import API_BASE, { fetchWithTimeout } from '../api'
import { useAuth } from '../context/AuthContext'

function SearchPage() {
  const [searchParams] = useSearchParams()
  const q = searchParams.get('q') || ''
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const { user } = useAuth()
  const lastSavedQueryRef = useRef('')

  const displayResults = q.trim() ? results : []

  useEffect(() => {
    if (!q.trim()) {
      setResults([])
      return
    }

    setLoading(true)
    setError(false)
    fetchWithTimeout(`${API_BASE}/api/search?q=${encodeURIComponent(q)}`)
      .then(async (res) => {
        if (!res.ok) {
          setError(true)
          setLoading(false)
          return
        }
        try {
          const data = await res.json()
          setResults(data)
        } catch {
          setError(true)
        }
        setLoading(false)
      })
      .catch(() => {
        setError(true)
        setLoading(false)
      })
  }, [q])

  useEffect(() => {
    if (!q.trim() || !user) return
    if (q.trim() === lastSavedQueryRef.current) return
    lastSavedQueryRef.current = q.trim()
    fetchWithTimeout(`${API_BASE}/api/history`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ query: q.trim() }),
    }).catch((err) => { console.error('Failed to save search history:', err) })
  }, [q, user])

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h2 className="text-xl text-text-secondary mb-6 break-words">
          {q.trim() ? `Results for "${q}"` : 'Search for a word'}
        </h2>

        {loading && (
          <div className="flex flex-col gap-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-center gap-4">
                  <div className="skeleton w-14 h-14 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <div className="skeleton h-5 w-32" />
                    <div className="skeleton h-4 w-48" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="text-center py-12 text-red-400">
            <p className="text-lg font-medium">Something went wrong.</p>
            <p className="text-sm mt-1">Please try again.</p>
          </div>
        )}

        {!loading && !error && displayResults.length === 0 && q.trim() && (
          <div className="text-center py-12 text-text-secondary">
            No results found for "{q}"
          </div>
        )}

        {!loading && displayResults.length > 0 && (
          <div className="flex flex-col gap-3">
            {displayResults.map((result) => (
              <SearchResultCard key={result.id} result={result} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default SearchPage
