import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import API_BASE, { fetchWithTimeout } from '../api'
import { useAuth } from '../context/AuthContext'
import TextAnalyzer from '../components/TextAnalyzer'

function StoryPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const [story, setStory] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetchWithTimeout(`${API_BASE}/api/stories/${id}`, { credentials: 'include' })
      if (res.ok) {
        setStory(await res.json())
      } else {
        throw new Error('Failed to retrieve story data')
      }
    } catch (err) {
      console.error('Failed to load story:', err)
      setError('Unable to load this story. Check server connection.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [id])

  if (!user) return null

  return (
    <div className="min-h-screen bg-transparent relative z-10 text-text-primary pb-20">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Link to="/reading" className="text-primary hover:underline">&larr; Back to Reading</Link>
        </div>

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
             <div className="h-12 w-1/2 bg-card/80 backdrop-blur-xl border border-border/50 rounded-3xl mb-4" />
             <div className="h-64 bg-card/80 backdrop-blur-xl border border-border/50 rounded-3xl" />
          </div>
        ) : story ? (
          <div className="animate-fade-in">
            <h1 className="text-3xl font-bold mb-2">{story.title}</h1>
            <div className="inline-block px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-full text-sm font-bold mb-8">
              HSK {story.hsk_level}
            </div>

            <div className="mt-4">
              <TextAnalyzer initialText={story.content} readOnly={true} cardStyle={false} />
            </div>
          </div>
        ) : (
          <p className="text-text-secondary">Story not found.</p>
        )}
      </div>
    </div>
  )
}

export default StoryPage
