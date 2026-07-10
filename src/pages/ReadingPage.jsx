import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import API_BASE, { fetchWithTimeout } from '../api'
import { useAuth } from '../context/AuthContext'

function ReadingPage() {
  const { user } = useAuth()
  const [stories, setStories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetchWithTimeout(`${API_BASE}/api/stories`, { credentials: 'include' })
      if (res.ok) {
        setStories(await res.json())
      } else {
        throw new Error('Failed to load stories from server')
      }
    } catch (err) {
      console.error('Failed to load stories:', err)
      setError('Unable to retrieve stories. Check server connection.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  if (!user) return null

  // Group stories by HSK level
  const grouped = stories.reduce((acc, s) => {
    if (!acc[s.hsk_level]) acc[s.hsk_level] = []
    acc[s.hsk_level].push(s)
    return acc
  }, {})

  return (
    <div className="min-h-screen bg-transparent relative z-10 text-text-primary pb-20">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Graded Reading</h1>
        
        {error ? (
          <div className="text-center py-20 bg-card/80 backdrop-blur-xl border border-border/50 rounded-3xl p-8 max-w-md mx-auto shadow-sm">
            <p className="text-rose-400 mb-4">{error}</p>
            <button
              onClick={load}
              className="px-6 py-2.5 bg-primary text-white rounded-xl font-bold hover:scale-105 transition-transform cursor-pointer"
            >
              Try Again
            </button>
          </div>
        ) : loading ? (
           <div className="animate-pulse flex flex-col gap-4">
             {[1,2,3].map(i => <div key={i} className="h-24 bg-card/80 backdrop-blur-xl border border-border/50 rounded-3xl" />)}
           </div>
        ) : stories.length === 0 ? (
          <p className="text-text-secondary">No stories available.</p>
        ) : (
          <div className="space-y-12">
            {Object.keys(grouped).sort((a,b)=>a-b).map(level => (
              <div key={level} className="animate-fade-in">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center text-sm">
                    {level}
                  </span>
                  HSK {level}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {grouped[level].map((story, i) => (
                    <Link
                      key={story.id}
                      to={`/reading/${story.id}`}
                      className="group bg-card/80 backdrop-blur-xl border border-border/50 rounded-3xl p-6 transition-all hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/10 hover:border-primary/50 block"
                      style={{ animationDelay: `${i * 100}ms` }}
                    >
                      <h3 className="text-lg font-bold group-hover:text-primary transition-colors">{story.title}</h3>
                      <div className="mt-4 flex items-center justify-between text-sm text-text-secondary">
                        <span>Read now &rarr;</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default ReadingPage
