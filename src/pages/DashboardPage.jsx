import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { useAuth } from '../context/AuthContext'
import API_BASE, { fetchWithTimeout } from '../api'
import { HeartIcon, FlashcardIcon, ClockIcon, DashboardIcon } from '../components/Icons'

function DashboardPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const fetchDashboard = useCallback(async () => {
    setError(false)
    setLoading(true)
    try {
      const res = await fetchWithTimeout(`${API_BASE}/api/dashboard`, {
        credentials: 'include',
      })
      if (res.ok) {
        const data = await res.json()
        setDashboard(data)
      } else {
        setError(true)
      }
    } catch (err) {
      console.error('Failed to fetch dashboard:', err)
      setError(true)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchDashboard()
  }, [fetchDashboard])

  if (!user) return null

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-text-primary mb-1">Dashboard</h1>
          <p className="text-text-secondary">Welcome back, {user.email}</p>
        </div>

        {error && (
          <div className="text-center py-12">
            <p className="text-red-400 text-lg font-medium mb-1">Something went wrong.</p>
            <p className="text-sm text-text-secondary mb-1">Could not load dashboard data.</p>
            <p className="text-xs text-text-secondary mb-4">Make sure the backend server is running (`node backend/server.js`).</p>
            <button
              onClick={fetchDashboard}
              className="px-5 py-2 bg-primary text-text-primary rounded-lg hover:bg-primary-hover transition-colors font-medium"
            >
              Retry
            </button>
          </div>
        )}

        {loading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-4">
                <div className="skeleton h-4 w-16 mb-2" />
                <div className="skeleton h-8 w-12" />
              </div>
            ))}
          </div>
        )}

        {!loading && !error && dashboard && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
              <div className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <ClockIcon className="w-4 h-4 text-primary" />
                  <p className="text-xs text-text-secondary font-medium uppercase tracking-wide">Searches Today</p>
                </div>
                <p className="text-2xl font-bold text-text-primary">{dashboard.searches_today}</p>
              </div>
              <div
                onClick={() => navigate('/flashcards')}
                onKeyDown={(e) => { if (e.key === 'Enter') navigate('/flashcards') }}
                role="button"
                tabIndex={0}
                className="bg-card border border-border rounded-xl p-4 hover:bg-surface cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2 mb-2">
                  <FlashcardIcon className="w-4 h-4 text-primary" />
                  <p className="text-xs text-text-secondary font-medium uppercase tracking-wide">Flashcards Due</p>
                </div>
                <p className="text-2xl font-bold text-text-primary">{dashboard.flashcards_due}</p>
              </div>
              <div
                onClick={() => navigate('/favorites')}
                onKeyDown={(e) => { if (e.key === 'Enter') navigate('/favorites') }}
                role="button"
                tabIndex={0}
                className="bg-card border border-border rounded-xl p-4 hover:bg-surface cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2 mb-2">
                  <HeartIcon className="w-4 h-4 text-primary" />
                  <p className="text-xs text-text-secondary font-medium uppercase tracking-wide">Favorites</p>
                </div>
                <p className="text-2xl font-bold text-text-primary">{dashboard.favorites_count}</p>
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
                <DashboardIcon className="w-4 h-4 text-primary" />
                <h2 className="text-lg font-semibold text-text-primary">Recent Searches</h2>
              </div>
              {dashboard.recent_searches && dashboard.recent_searches.length > 0 ? (
                dashboard.recent_searches.map((item, index) => (
                  <div
                    key={index}
                    onClick={() => navigate(`/search?q=${encodeURIComponent(item.query)}`)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/search?q=${encodeURIComponent(item.query)}`) } }}
                    role="button"
                    tabIndex={0}
                    className={`flex items-center justify-between px-5 py-3.5 hover:bg-surface cursor-pointer transition-colors ${
                      index !== dashboard.recent_searches.length - 1 ? 'border-b border-border' : ''
                    }`}
                  >
                    <span className="text-text-primary">{item.query}</span>
                    <span className="text-xs text-text-secondary flex-shrink-0 ml-4">
                      {new Date(item.searched_at).toLocaleDateString(navigator.language || 'en-CA')}
                    </span>
                  </div>
                ))
              ) : (
                <div className="px-5 py-8 text-center text-text-secondary">
                  <p className="text-sm">No searches yet</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default DashboardPage