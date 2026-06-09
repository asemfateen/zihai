import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../hooks/useTheme'
import API_BASE, { fetchWithTimeout } from '../api'
import { SunIcon, MoonIcon, HeartIcon, ClockIcon, UserIcon, LogoutIcon, MenuIcon, XIcon, PlusIcon, SpeakerIcon, FlashcardIcon, GridIcon, ChevronRightIcon } from './Icons'

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
  const [searchError, setSearchError] = useState(null)
  const [showToolsDropdown, setShowToolsDropdown] = useState(false)
  const debounceRef = useRef(null)
  const abortControllerRef = useRef(null)
  const inputRef = useRef(null)
  const containerRef = useRef(null)
  const mobileMenuRef = useRef(null)
  const toolsDropdownRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowDropdown(false)
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target)) {
        setMobileMenuOpen(false)
      }
      if (toolsDropdownRef.current && !toolsDropdownRef.current.contains(e.target)) {
        setShowToolsDropdown(false)
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
        fetchWithTimeout(`${API_BASE}/api/search?q=${encodeURIComponent(value)}&limit=6`, {
          signal: abortControllerRef.current.signal,
        })
          .then((res) => {
            if (!res.ok) {
              setSearchError('Search unavailable. Server returned an error.')
              setSuggestions([])
              setShowDropdown(false)
              return
            }
            return res.json()
          })
          .then((data) => {
            if (!data) return
            setSuggestions(data.slice(0, 6))
            setShowDropdown(true)
            setSearchError(null)
          })
          .catch((err) => {
            if (err.name === 'AbortError') return
            console.error('Search suggestion failed:', err)
            if (err.name === 'TimeoutError' || err.message.includes('timed out')) {
              setSearchError('Search timed out. Please try again.')
            } else if (err.message === 'Failed to fetch' || err.name === 'TypeError') {
              setSearchError('Network error. Check your connection.')
            } else {
              setSearchError('Search unavailable. Please try again.')
            }
            setSuggestions([])
            setShowDropdown(false)
          })
      }, 200)
    } else {
      setSuggestions([])
      setShowDropdown(false)
      setSearchError(null)
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
      } else if (e.key === 'Enter' && focusedIndex >= 0 && focusedIndex < suggestions.length) {
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
    <nav className="bg-surface border-b border-border sticky top-0 z-50 px-4 py-3 sm:py-3.5">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        
        {/* Top Header Row for mobile / Logo Row for desktop */}
        <div className="flex items-center justify-between w-full sm:w-auto flex-shrink-0">
          <Link to="/" className="text-xl font-bold text-primary no-underline tracking-wide hover:scale-102 transition-transform">
            字海 Zihai
          </Link>

          {/* Theme & Menu toggle ONLY on mobile top row */}
          <div className="flex sm:hidden items-center gap-1.5">
            <button
              onClick={toggleTheme}
              className="p-2.5 border border-border rounded-xl text-text-secondary hover:text-primary hover:border-primary transition-all active:scale-95"
              title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {dark ? <SunIcon className="w-4.5 h-4.5" /> : <MoonIcon className="w-4.5 h-4.5" />}
            </button>
            <button
              onClick={() => setMobileMenuOpen(prev => !prev)}
              className="p-2.5 text-text-secondary border border-border rounded-xl hover:text-primary hover:border-primary transition-all active:scale-95"
            >
              {mobileMenuOpen ? <XIcon className="w-5 h-5" /> : <MenuIcon className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Centered Google-like Search Bar */}
        <div ref={containerRef} className="w-full sm:flex-1 sm:max-w-md relative mx-auto">
          <form onSubmit={handleSubmit} className="w-full">
            <input
              ref={inputRef}
              type="text"
              placeholder="Search characters, pinyin, or definitions..."
              value={query}
              onChange={handleSearch}
              onKeyDown={handleKeyDown}
              aria-label="Search characters, pinyin, or definitions"
              className="w-full px-5 py-3 sm:py-2 bg-card text-text-primary border border-border rounded-full sm:rounded-lg outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-text-secondary text-base sm:text-sm shadow-sm hover:border-border-hover"
            />
          </form>

          {showDropdown && suggestions.length > 0 && (
            <div
              className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-2xl shadow-xl overflow-y-auto overflow-x-hidden z-50 max-h-72"
              role="listbox"
            >
              {suggestions.map((s, i) => (
                <div
                  key={s.id}
                  onClick={() => handleSelect(s)}
                  onMouseEnter={() => setFocusedIndex(i)}
                  role="option"
                  aria-selected={i === focusedIndex ? 'true' : 'false'}
                  className={`flex items-center gap-3 px-5 py-3 cursor-pointer transition-colors ${
                    i === focusedIndex ? 'bg-surface' : 'hover:bg-surface'
                  }`}
                >
                  <span className="text-xl font-bold text-text-primary">{s.simplified}</span>
                  <span className="text-sm text-primary font-medium">{s.pinyin}</span>
                </div>
              ))}
            </div>
          )}

          {showDropdown && searchError && suggestions.length === 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-red-500/50 rounded-2xl shadow-xl overflow-hidden z-50 px-4 py-3 text-sm text-red-400">
              {searchError}
            </div>
          )}
        </div>

        {/* Desktop Nav Items */}
        <div className="hidden sm:flex items-center gap-3 flex-shrink-0">
          
          {/* Explore Dropdown */}
          <div ref={toolsDropdownRef} className="relative">
            <button
              onClick={() => setShowToolsDropdown(prev => !prev)}
              className={`px-3 py-2 border rounded-lg transition-all flex items-center gap-1.5 text-sm font-medium ${
                showToolsDropdown || ['/radicals', '/pinyin', '/hsk', '/stats', '/history', '/favorites'].some(p => location.pathname.startsWith(p))
                  ? 'text-primary border-primary bg-primary/5'
                  : 'text-text-secondary border-border hover:text-primary hover:border-primary'
              }`}
            >
              <GridIcon className="w-4 h-4" />
              Explore Tools
              <ChevronRightIcon className={`w-3.5 h-3.5 transition-transform ${showToolsDropdown ? 'rotate-90' : 'rotate-0'}`} />
            </button>

            {showToolsDropdown && (
              <div className="absolute right-0 top-full mt-2 w-52 bg-card border border-border rounded-xl shadow-xl overflow-hidden z-50 py-1.5 animate-fade-in">
                <button
                  onClick={() => { setShowToolsDropdown(false); navigate('/radicals') }}
                  className="w-full text-left px-4 py-2.5 hover:bg-surface text-sm text-text-primary transition-colors flex items-center gap-2"
                >
                  <GridIcon className="w-4 h-4 text-text-secondary" />
                  Radicals
                </button>
                <button
                  onClick={() => { setShowToolsDropdown(false); navigate('/pinyin') }}
                  className="w-full text-left px-4 py-2.5 hover:bg-surface text-sm text-text-primary transition-colors flex items-center gap-2"
                >
                  <SpeakerIcon className="w-4 h-4 text-text-secondary" />
                  Pinyin Chart
                </button>
                {user && (
                  <>
                    <button
                      onClick={() => { setShowToolsDropdown(false); navigate('/hsk') }}
                      className="w-full text-left px-4 py-2.5 hover:bg-surface text-sm text-text-primary transition-colors flex items-center gap-2"
                    >
                      HSK Levels
                    </button>
                    <button
                      onClick={() => { setShowToolsDropdown(false); navigate('/stats') }}
                      className="w-full text-left px-4 py-2.5 hover:bg-surface text-sm text-text-primary transition-colors flex items-center gap-2"
                    >
                      Stats
                    </button>
                    <button
                      onClick={() => { setShowToolsDropdown(false); navigate('/history') }}
                      className="w-full text-left px-4 py-2.5 hover:bg-surface text-sm text-text-primary transition-colors flex items-center gap-2"
                    >
                      <ClockIcon className="w-4 h-4 text-text-secondary" />
                      History
                    </button>
                    <button
                      onClick={() => { setShowToolsDropdown(false); navigate('/favorites') }}
                      className="w-full text-left px-4 py-2.5 hover:bg-surface text-sm text-text-primary transition-colors flex items-center gap-2"
                    >
                      <HeartIcon className="w-4 h-4 text-text-secondary" />
                      Favorites
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {user && (
            <button
              onClick={() => navigate('/flashcards')}
              className={`px-3 py-2 border rounded-lg transition-all flex items-center gap-1.5 text-sm font-medium ${
                location.pathname === '/flashcards'
                  ? 'text-primary border-primary bg-primary/5'
                  : 'text-text-secondary border-border hover:text-primary hover:border-primary'
              }`}
            >
              <FlashcardIcon className="w-4 h-4" />
              Flashcards
            </button>
          )}

          {/* Desktop Theme Switcher */}
          <button
            onClick={toggleTheme}
            className="p-2 border border-border rounded-lg transition-all text-text-secondary hover:text-primary hover:border-primary hover:scale-105 active:scale-95"
            title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {dark ? <SunIcon className="w-4 h-4" /> : <MoonIcon className="w-4 h-4" />}
          </button>

          {user ? (
            <>
              <button
                onClick={() => navigate('/profile')}
                className={`p-2 border rounded-lg transition-all hover:scale-105 active:scale-95 ${
                  location.pathname === '/profile'
                    ? 'text-primary border-primary'
                    : 'text-text-secondary border-border hover:text-primary hover:border-primary'
                }`}
              >
                <UserIcon className="w-4 h-4" />
              </button>
              <button
                onClick={handleLogout}
                className="p-2 text-text-secondary border border-border rounded-lg hover:text-primary hover:border-primary transition-all hover:scale-105 active:scale-95"
              >
                <LogoutIcon className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => navigate('/login')}
                className="px-4 py-2 text-text-primary border border-border rounded-lg hover:border-primary transition-all text-sm font-semibold hover:scale-105 active:scale-95"
              >
                Login
              </button>
              <button
                onClick={() => navigate('/register')}
                className="px-4 py-2 bg-primary text-text-primary rounded-lg hover:bg-primary-hover transition-all text-sm font-semibold hover:scale-105 active:scale-95"
              >
                Register
              </button>
            </>
          )}
        </div>
      </div>

      {/* Mobile hamburger menu content */}
      <div ref={mobileMenuRef} className="sm:hidden flex-shrink-0 relative">
        {mobileMenuOpen && user && (
          <div className="absolute right-0 top-full mt-2 w-56 bg-card border border-border rounded-xl shadow-2xl overflow-hidden z-50 animate-fade-in">
            <button
              onClick={() => handleNav('/hsk')}
              className={`w-full flex items-center gap-3 px-4 py-3 transition-colors text-sm ${
                location.pathname === '/hsk' ? 'text-primary bg-surface' : 'text-text-primary hover:bg-surface'
              }`}
            >
              HSK Levels
            </button>
            <button
              onClick={() => handleNav('/stats')}
              className={`w-full flex items-center gap-3 px-4 py-3 transition-colors text-sm ${
                location.pathname === '/stats' ? 'text-primary bg-surface' : 'text-text-primary hover:bg-surface'
              }`}
            >
              Stats
            </button>
            <button
              onClick={() => handleNav('/pinyin')}
              className={`w-full flex items-center gap-3 px-4 py-3 transition-colors text-sm ${
                location.pathname === '/pinyin' ? 'text-primary bg-surface' : 'text-text-primary hover:bg-surface'
              }`}
            >
              Pinyin Chart
            </button>
            <button
              onClick={() => handleNav('/flashcards')}
              className={`w-full flex items-center gap-3 px-4 py-3 transition-colors text-sm ${
                location.pathname === '/flashcards' ? 'text-primary bg-surface' : 'text-text-primary hover:bg-surface'
              }`}
            >
              <FlashcardIcon className="w-4 h-4 text-text-secondary" />
              Flashcards
            </button>
            <button
              onClick={() => handleNav('/radicals')}
              className={`w-full flex items-center gap-3 px-4 py-3 transition-colors text-sm ${
                location.pathname === '/radicals' || location.pathname.startsWith('/radicals/') ? 'text-primary bg-surface' : 'text-text-primary hover:bg-surface'
              }`}
            >
              <GridIcon className="w-4 h-4 text-text-secondary" />
              Radicals
            </button>
            <button
              onClick={() => handleNav('/history')}
              className={`w-full flex items-center gap-3 px-4 py-3 transition-colors text-sm ${
                location.pathname === '/history' ? 'text-primary bg-surface' : 'text-text-primary hover:bg-surface'
              }`}
            >
              <ClockIcon className="w-4 h-4 text-text-secondary" />
              History
            </button>
            <button
              onClick={() => handleNav('/favorites')}
              className={`w-full flex items-center gap-3 px-4 py-3 transition-colors text-sm ${
                location.pathname === '/favorites' ? 'text-primary bg-surface' : 'text-text-primary hover:bg-surface'
              }`}
            >
              <HeartIcon className="w-4 h-4 text-text-secondary" />
              Favorites
            </button>
            <button
              onClick={() => handleNav('/profile')}
              className={`w-full flex items-center gap-3 px-4 py-3 transition-colors text-sm ${
                location.pathname === '/profile' ? 'text-primary bg-surface' : 'text-text-primary hover:bg-surface'
              }`}
            >
              <UserIcon className="w-4 h-4 text-text-secondary" />
              Profile
            </button>
            <div className="border-t border-border" />
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-surface transition-colors text-sm"
            >
              <LogoutIcon className="w-4 h-4" />
              Logout
            </button>
          </div>
        )}

        {mobileMenuOpen && !user && (
          <div className="absolute right-0 top-full mt-2 w-56 bg-card border border-border rounded-xl shadow-2xl overflow-hidden z-50 animate-fade-in">
            <button
              onClick={() => handleNav('/radicals')}
              className="w-full flex items-center gap-3 px-4 py-3 text-text-primary hover:bg-surface transition-colors text-sm text-left"
            >
              <GridIcon className="w-4 h-4 text-text-secondary" />
              Radicals
            </button>
            <button
              onClick={() => handleNav('/pinyin')}
              className="w-full flex items-center gap-3 px-4 py-3 text-text-primary hover:bg-surface transition-colors text-sm text-left"
            >
              Pinyin Chart
            </button>
            <div className="border-t border-border" />
            <button
              onClick={() => handleNav('/login')}
              className="w-full flex items-center gap-3 px-4 py-3 text-text-primary hover:bg-surface transition-colors text-sm text-left"
            >
              <UserIcon className="w-4 h-4 text-text-secondary" />
              Login
            </button>
            <button
              onClick={() => handleNav('/register')}
              className="w-full flex items-center gap-3 px-4 py-3 text-primary hover:bg-surface transition-colors text-sm text-left font-medium"
            >
              <PlusIcon className="w-4 h-4" />
              Register
            </button>
          </div>
        )}
      </div>
    </nav>
  )
}

export default Navbar
