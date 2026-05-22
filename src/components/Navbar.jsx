import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../hooks/useTheme'
import API_BASE, { fetchWithTimeout } from '../api'

function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()
  const { dark, toggle: toggleTheme } = useTheme()
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [searchError, setSearchError] = useState(false)
  const debounceRef = useRef(null)
  const abortControllerRef = useRef(null)
  const inputRef = useRef(null)
  const containerRef = useRef(null)
  const mobileMenuRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowDropdown(false)
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target)) {
        setMobileMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      clearTimeout(debounceRef.current)
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  const handleSearch = (e) => {
    const value = e.target.value
    setQuery(value)
    setFocusedIndex(-1)

    clearTimeout(debounceRef.current)
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    if (value.length >= 1) {
      debounceRef.current = setTimeout(() => {
        abortControllerRef.current = new AbortController()
        fetchWithTimeout(`${API_BASE}/api/search?q=${encodeURIComponent(value)}`, {
          signal: abortControllerRef.current.signal,
        })
          .then((res) => {
            if (!res.ok) throw new Error('search failed')
            return res.json()
          })
          .then((data) => {
            setSuggestions(data.slice(0, 6))
            setShowDropdown(true)
            setSearchError(false)
          })
          .catch((err) => {
            if (err.name === 'AbortError') return
            setSuggestions([])
            setShowDropdown(false)
            setSearchError(true)
          })
      }, 200)
    } else {
      setSuggestions([])
      setShowDropdown(false)
      setSearchError(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setShowDropdown(false)
      setFocusedIndex(-1)
      setMobileMenuOpen(false)
    }
    if (showDropdown && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setFocusedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setFocusedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1))
      } else if (e.key === 'Enter' && focusedIndex >= 0) {
        e.preventDefault()
        handleSelect(suggestions[focusedIndex])
        return
      }
    }
    if (e.key === 'Enter' && query.trim()) {
      e.preventDefault()
      setShowDropdown(false)
      setFocusedIndex(-1)
      navigate(`/search?q=${encodeURIComponent(query.trim())}`)
    }
  }

  const handleSelect = (suggestion) => {
    setShowDropdown(false)
    setFocusedIndex(-1)
    setQuery('')
    if (user) {
      fetchWithTimeout(`${API_BASE}/api/history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ query: suggestion.character }),
      }).catch((err) => { console.error('Failed to save search history:', err) })
    }
    navigate(`/word/${suggestion.id}`)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (query.trim()) {
      setShowDropdown(false)
      navigate(`/search?q=${encodeURIComponent(query.trim())}`)
    }
  }

  const handleLogout = () => {
    logout()
    setMobileMenuOpen(false)
    navigate('/')
  }

  const handleNav = (path) => {
    setMobileMenuOpen(false)
    navigate(path)
  }

  return (
    <nav className="flex items-center justify-between px-3 sm:px-4 py-3 bg-surface border-b border-border sticky top-0 z-50">
      <div className="flex-shrink-0">
        <Link to="/" className="text-lg sm:text-xl font-bold text-primary no-underline">
          字海 Zihai
        </Link>
      </div>

      <div ref={containerRef} className="flex-1 max-w-md mx-2 sm:mx-4 relative">
        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="text"
            placeholder="Search characters, pinyin, or definitions..."
            value={query}
            onChange={handleSearch}
            onKeyDown={handleKeyDown}
            aria-label="Search characters, pinyin, or definitions"
            className="w-full px-3 sm:px-4 py-2 bg-card text-text-primary border border-border rounded-lg outline-none focus:border-primary transition-colors placeholder:text-text-secondary text-sm sm:text-base"
          />
        </form>

        {showDropdown && suggestions.length > 0 && (
          <div
            className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg overflow-y-auto overflow-x-hidden z-50 max-h-72"
            role="listbox"
          >
            {suggestions.map((s, i) => (
              <div
                key={s.id}
                onClick={() => handleSelect(s)}
                onMouseEnter={() => setFocusedIndex(i)}
                role="option"
                aria-selected={i === focusedIndex ? 'true' : 'false'}
                className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${
                  i === focusedIndex ? 'bg-surface' : 'hover:bg-surface'
                }`}
              >
                <span className="text-xl font-bold text-text-primary">{s.character}</span>
                <span className="text-sm text-primary">{s.pinyin}</span>
              </div>
            ))}
          </div>
        )}

        {showDropdown && searchError && suggestions.length === 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-red-400 rounded-lg shadow-lg overflow-hidden z-50 px-4 py-3 text-sm text-red-400">
            Search unavailable. Please try again.
          </div>
        )}
      </div>

      {/* Desktop nav */}
      <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
        <button
          onClick={toggleTheme}
          className="p-2 border border-border rounded-lg transition-colors text-text-secondary hover:text-primary hover:border-primary"
          title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {dark ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          )}
        </button>
        {user ? (
          <>
            <button
              onClick={() => navigate('/flashcards')}
              className={`px-3 py-2 border rounded-lg transition-colors flex items-center gap-1.5 text-sm ${
                location.pathname === '/flashcards'
                  ? 'text-primary border-primary'
                  : 'text-text-secondary border-border hover:text-primary hover:border-primary'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="M12 8v8" />
                <path d="M8 12h8" />
              </svg>
              Flashcards
            </button>
            <button
              onClick={() => navigate('/history')}
              className={`px-3 py-2 border rounded-lg transition-colors flex items-center gap-1.5 text-sm ${
                location.pathname === '/history'
                  ? 'text-primary border-primary'
                  : 'text-text-secondary border-border hover:text-primary hover:border-primary'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              History
            </button>
            <button
              onClick={() => navigate('/favorites')}
              className={`px-3 py-2 border rounded-lg transition-colors flex items-center gap-1.5 text-sm ${
                location.pathname === '/favorites'
                  ? 'text-primary border-primary'
                  : 'text-text-secondary border-border hover:text-primary hover:border-primary'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
              Favorites
            </button>
            <button
              onClick={() => navigate('/profile')}
              className={`p-2 border rounded-lg transition-colors ${
                location.pathname === '/profile'
                  ? 'text-primary border-primary'
                  : 'text-text-secondary border-border hover:text-primary hover:border-primary'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </button>
            <button
              onClick={handleLogout}
              className="p-2 text-text-secondary border border-border rounded-lg hover:text-primary hover:border-primary transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => navigate('/login')}
              className="px-4 py-2 text-text-primary border border-border rounded-lg hover:border-primary transition-colors text-sm"
            >
              Login
            </button>
            <button
              onClick={() => navigate('/register')}
              className="px-4 py-2 bg-primary text-text-primary rounded-lg hover:bg-primary-hover transition-colors text-sm"
            >
              Register
            </button>
          </>
        )}
      </div>

      {/* Mobile hamburger */}
      <div className="sm:hidden flex-shrink-0 relative">
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 text-text-secondary border border-border rounded-lg hover:text-primary hover:border-primary transition-colors"
        >
          {mobileMenuOpen ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          )}
        </button>

        {mobileMenuOpen && user && (
          <div ref={mobileMenuRef} className="absolute right-0 top-full mt-2 w-56 bg-card border border-border rounded-xl shadow-2xl overflow-hidden z-50 animate-fade-in">
            <button
              onClick={toggleTheme}
              className="w-full flex items-center gap-3 px-4 py-3 text-text-primary hover:bg-surface transition-colors text-sm"
            >
              {dark ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-text-secondary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" />
                  <line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-text-secondary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
              {dark ? 'Light Mode' : 'Dark Mode'}
            </button>
            <div className="border-t border-border" />
            <button
              onClick={() => handleNav('/flashcards')}
              className={`w-full flex items-center gap-3 px-4 py-3 transition-colors text-sm ${
                location.pathname === '/flashcards'
                  ? 'text-primary bg-surface'
                  : 'text-text-primary hover:bg-surface'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-text-secondary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="M12 8v8" />
                <path d="M8 12h8" />
              </svg>
              Flashcards
            </button>
            <button
              onClick={() => handleNav('/history')}
              className={`w-full flex items-center gap-3 px-4 py-3 transition-colors text-sm ${
                location.pathname === '/history'
                  ? 'text-primary bg-surface'
                  : 'text-text-primary hover:bg-surface'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-text-secondary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              History
            </button>
            <button
              onClick={() => handleNav('/favorites')}
              className={`w-full flex items-center gap-3 px-4 py-3 transition-colors text-sm ${
                location.pathname === '/favorites'
                  ? 'text-primary bg-surface'
                  : 'text-text-primary hover:bg-surface'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-text-secondary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
              Favorites
            </button>
            <button
              onClick={() => handleNav('/profile')}
              className={`w-full flex items-center gap-3 px-4 py-3 transition-colors text-sm ${
                location.pathname === '/profile'
                  ? 'text-primary bg-surface'
                  : 'text-text-primary hover:bg-surface'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-text-secondary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              Profile
            </button>
            <div className="border-t border-border" />
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-surface transition-colors text-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Logout
            </button>
          </div>
        )}

        {mobileMenuOpen && !user && (
          <div ref={mobileMenuRef} className="absolute right-0 top-full mt-2 w-56 bg-card border border-border rounded-xl shadow-2xl overflow-hidden z-50 animate-fade-in">
            <button
              onClick={toggleTheme}
              className="w-full flex items-center gap-3 px-4 py-3 text-text-primary hover:bg-surface transition-colors text-sm"
            >
              {dark ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-text-secondary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" />
                  <line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-text-secondary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
              {dark ? 'Light Mode' : 'Dark Mode'}
            </button>
            <div className="border-t border-border" />
            <button
              onClick={() => handleNav('/login')}
              className="w-full flex items-center gap-3 px-4 py-3 text-text-primary hover:bg-surface transition-colors text-sm text-left"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-text-secondary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                <polyline points="10 17 15 12 10 7" />
                <line x1="15" y1="12" x2="3" y2="12" />
              </svg>
              Login
            </button>
            <button
              onClick={() => handleNav('/register')}
              className="w-full flex items-center gap-3 px-4 py-3 text-primary hover:bg-surface transition-colors text-sm text-left font-medium"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="8.5" cy="7" r="4" />
                <line x1="20" y1="8" x2="20" y2="14" />
                <line x1="23" y1="11" x2="17" y2="11" />
              </svg>
              Register
            </button>
          </div>
        )}
      </div>
    </nav>
  )
}

export default Navbar
