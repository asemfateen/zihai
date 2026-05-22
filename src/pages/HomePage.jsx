import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'

function HomePage() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex flex-col items-center justify-center px-4 pt-24 sm:pt-32 pb-20">
        <h1 className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-bold text-primary mb-4 tracking-tight">
          字海
        </h1>
        <p className="text-lg sm:text-xl md:text-2xl text-text-secondary mb-8 sm:mb-12 font-light text-center">
          The most complete Chinese dictionary
        </p>
        <form onSubmit={handleSubmit} className="w-full max-w-xl">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Search characters, pinyin, or definitions..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 px-4 sm:px-5 py-3 bg-card text-text-primary text-base sm:text-lg border border-border rounded-xl outline-none focus:border-primary transition-colors placeholder:text-text-secondary"
            />
            <button
              type="submit"
              className="px-4 sm:px-6 py-3 bg-primary text-text-primary text-base sm:text-lg font-medium rounded-xl hover:bg-primary-hover transition-all hover:scale-105 active:scale-95"
            >
              Search
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default HomePage
