import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { useAuth } from '../context/AuthContext'
import API_BASE, { fetchWithTimeout } from '../api'

function FavoritesPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [favorites, setFavorites] = useState([])
  const [loading, setLoading] = useState(true)
  const [removing, setRemoving] = useState(null)
  const [error, setError] = useState(false)
  const [removeError, setRemoveError] = useState(false)

  const fetchFavorites = async () => {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/api/favorites`, {
        credentials: 'include',
      })
      if (res.ok) {
        const data = await res.json()
        setFavorites(data)
      } else {
        setError(true)
      }
    } catch {
      setError(true)
    }
    setLoading(false)
  }

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }
    fetchFavorites()
  }, [user, navigate])

  const removeFavorite = async (wordId, e) => {
    e.stopPropagation()
    setRemoving(wordId)
    setRemoveError(false)
    try {
      const res = await fetchWithTimeout(`${API_BASE}/api/favorites/${wordId}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (res.ok || res.status === 404) {
        setFavorites((prev) => prev.filter((f) => f.id !== wordId))
      } else {
        setRemoveError(true)
        setTimeout(() => setRemoveError(false), 4000)
      }
    } catch {
      setRemoveError(true)
      setTimeout(() => setRemoveError(false), 4000)
    }
    setRemoving(null)
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-text-primary mb-6">Favorites</h1>

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

        {!loading && !error && favorites.length === 0 && (
          <div className="text-center py-12 text-text-secondary">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-16 h-16 mx-auto mb-4 text-border" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            <p className="text-lg mb-2">No favorites yet</p>
            <p className="text-sm">Tap the heart icon on any word to save it here</p>
          </div>
        )}

        {!loading && !error && favorites.length > 0 && (
          <div className="flex flex-col gap-3">
            {removeError && (
              <div className="text-center py-4 text-red-400">
                <p className="text-sm font-medium">Failed to remove favorite. Please try again.</p>
              </div>
            )}
            {favorites.map((word) => (
              <div
                key={word.id}
                onClick={() => navigate(`/word/${word.id}`)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/word/${word.id}`) } }}
                role="button"
                tabIndex={0}
                className="flex items-center gap-4 p-4 bg-card border border-border rounded-xl hover:border-primary hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer active:scale-98"
              >
                <div className="flex-shrink-0 text-center">
                  <div className="flex gap-0.5 justify-center">
                    {word.character.split('').map((char, i) => (
                      <span key={i} className="text-3xl sm:text-4xl font-bold text-text-primary">{char}</span>
                    ))}
                  </div>
                  <div className="text-sm text-primary mt-1">{word.pinyin}</div>
                </div>
                <div className="flex-1 text-text-secondary text-base sm:text-lg">{word.english_definition || 'No definition available'}</div>
                <button
                  onClick={(e) => removeFavorite(word.id, e)}
                  disabled={removing === word.id}
                  className="flex-shrink-0 p-2 text-text-secondary hover:text-red-400 transition-colors disabled:opacity-50"
                  title="Remove from favorites"
                >
                  {removing === word.id ? (
                    <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="#c0392b" stroke="#c0392b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default FavoritesPage
