import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { useAuth } from '../context/AuthContext'
import API_BASE, { fetchWithTimeout } from '../api'
import { ClockIcon } from '../components/Icons'

function HistoryPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [clearing, setClearing] = useState(false)
  const [error, setError] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [clearError, setClearError] = useState(false)

  const fetchHistory = useCallback(async () => {
    setError(false)
    setLoading(true)
    try {
      const res = await fetchWithTimeout(`${API_BASE}/api/history`, {
        credentials: 'include',
      })
      if (res.ok) {
        const data = await res.json()
        setHistory(data)
        setError(false)
      } else {
        setError(true)
      }
    } catch (err) {
      console.error('Failed to fetch history:', err)
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  const handleClear = async () => {
    setClearing(true)
    setClearError(false)
    try {
      const res = await fetchWithTimeout(`${API_BASE}/api/history`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (res.ok) {
        setHistory([])
      } else {
        setClearError(true)
      }
    } catch (err) {
      console.error('Failed to clear history:', err)
      setClearError(true)
    }
    setClearing(false)
  }

  const handleClick = (query) => {
    navigate(`/search?q=${encodeURIComponent(query)}`)
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-text-primary">Search History</h1>
          {history.length > 0 && (
            showConfirm ? (
              <div className="flex items-center gap-3">
                <p className="text-sm text-text-secondary">Clear all history?</p>
                <button
                  onClick={() => setShowConfirm(false)}
                  disabled={clearing}
                  className="px-4 py-2 text-sm text-text-secondary border border-border rounded-lg hover:border-primary transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleClear}
                  disabled={clearing}
                  className="px-4 py-2 text-sm text-red-400 border border-red-400 rounded-lg hover:bg-red-400 hover:bg-opacity-10 transition-colors disabled:opacity-50"
                >
                  {clearing ? 'Clearing...' : 'Clear'}
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowConfirm(true)}
                className="px-4 py-2 text-sm text-text-secondary border border-border rounded-lg hover:text-red-400 hover:border-red-400 transition-colors"
              >
                Clear History
              </button>
            )
          )}
        </div>

        {clearError && (
          <div className="mb-4 px-4 py-2.5 bg-red-500/10 border border-red-500 border-opacity-30 rounded-lg text-red-400 text-sm text-center">
            Failed to clear history. Please try again.
          </div>
        )}

        {loading && (
          <div className="flex flex-col gap-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-center gap-4">
                  <div className="skeleton w-8 h-8 rounded-full" />
                  <div className="skeleton h-5 w-40" />
                </div>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="text-center py-12 text-red-400">
            <p className="text-lg font-medium">Something went wrong.</p>
            <p className="text-sm mt-1 mb-4">Please try again.</p>
            <button
              onClick={() => { setLoading(true); setError(false); fetchHistory() }}
              className="px-5 py-2 bg-primary text-text-primary rounded-lg hover:bg-primary-hover transition-colors font-medium"
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && history.length === 0 && (
          <div className="text-center py-12 text-text-secondary">
            <p className="text-lg mb-2">No search history yet</p>
            <p className="text-sm">Your recent searches will appear here</p>
          </div>
        )}

        {!loading && !error && history.length > 0 && (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            {history.map((item, index) => (
              <div
                key={item.id}
                onClick={() => handleClick(item.query)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleClick(item.query) } }}
                role="button"
                tabIndex={0}
                className={`flex items-center justify-between px-5 py-4 hover:bg-surface cursor-pointer transition-colors ${
                  index !== history.length - 1 ? 'border-b border-border' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <ClockIcon className="w-4 h-4 text-text-secondary flex-shrink-0" />
                  <span className="text-text-primary">{item.query}</span>
                </div>
                <span className="text-xs text-text-secondary flex-shrink-0 ml-4">
                  {new Date(item.searched_at).toLocaleDateString(navigator.language || 'en-CA')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default HistoryPage
