import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import API_BASE, { fetchWithTimeout } from '../api'
import { useAuth } from '../context/AuthContext'
import TextAnalyzer from '../components/TextAnalyzer'

function StoryPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const [story, setStory] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetchWithTimeout(`${API_BASE}/api/stories/${id}`, { credentials: 'include' })
        if (res.ok) setStory(await res.json())
      } catch (err) {
        console.error('Failed to load story:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  if (!user) return null

  return (
    <div className="min-h-screen bg-background relative z-10 text-text-primary pb-20">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Link to="/reading" className="text-primary hover:underline">&larr; Back to Reading</Link>
        </div>

        {loading ? (
          <div className="animate-pulse flex flex-col gap-4">
             <div className="h-12 w-1/2 bg-card btn-brutal mb-4" />
             <div className="h-64 bg-card btn-brutal" />
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
