import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../hooks/useTheme'
import API_BASE, { fetchWithTimeout } from '../api'
import { SunIcon, MoonIcon, HeartIcon, ClockIcon, UserIcon, LogoutIcon, MenuIcon, XIcon, PlusIcon, SpeakerIcon, FlashcardIcon, GridIcon, DashboardIcon } from './Icons'

function ChevronDownIcon(props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

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
  const [exploreDropdownOpen, setExploreDropdownOpen] = useState(false)
  const [mobileExploreOpen, setMobileExploreOpen] = useState(false)
  const [searchError, setSearchError] = useState(null)
  const debounceRef = useRef(null)
  const abortControllerRef = useRef(null)
  const inputRef = useRef(null)
  const containerRef = useRef(null)
  const mobileMenuRef = useRef(null)
  const exploreDropdownRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowDropdown(false)
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target)) {
        setMobileMenuOpen(false)
      }
      if (exploreDropdownRef.current && !exploreDropdownRef.current.contains(e.target)) {
        setExploreDropdownOpen(false)
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
    <nav className="flex items-center justify-between px-3 sm:px-4 py-3 bg-surface/80 backdrop-blur-xl border-b border-border/50 sticky top-0 z-50">
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
            className="w-full px-3 sm:px-4 py-2 bg-card/80 backdrop-blur-md text-text-primary border border-border/50 rounded-lg outline-none focus:border-primary transition-all placeholder:text-text-secondary text-sm sm:text-base focus:ring-2 focus:ring-primary/20 shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)] dark:shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)]"
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
                <span className="text-xl font-bold text-text-primary">{s.simplified}</span>
                <span className="text-sm text-primary">{s.pinyin}</span>
              </div>
            ))}
          </div>
        )}

        {showDropdown && searchError && suggestions.length === 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-red-400 rounded-lg shadow-lg overflow-hidden z-50 px-4 py-3 text-sm text-red-400">
            {searchError}
          </div>
        )}
      </div>

      {/* Desktop nav */}
      <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
        <div ref={exploreDropdownRef} className="relative">
          <button
            onClick={() => setExploreDropdownOpen(prev => !prev)}
            className={`px-3 py-2 border rounded-lg transition-colors flex items-center gap-1.5 text-sm cursor-pointer ${
              exploreDropdownOpen || ['/radicals', '/flashcards', '/hsk', '/pinyin', '/history', '/favorites', '/stats'].some(path => location.pathname === path || location.pathname.startsWith(path + '/'))
                ? 'text-primary border-primary bg-primary/5'
                : 'text-text-secondary border-border hover:text-primary hover:border-primary'
            }`}
          >
            <GridIcon className="w-4 h-4" />
            Explore Tools
            <ChevronDownIcon className={`w-3 h-3 transition-transform duration-200 ${exploreDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {exploreDropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-card border border-border rounded-xl shadow-2xl py-2 z-50 animate-fade-in">
              <button
                onClick={() => { setExploreDropdownOpen(false); navigate('/radicals'); }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors text-left cursor-pointer ${location.pathname.startsWith('/radicals') ? 'text-primary bg-primary/5 font-semibold' : 'text-text-primary hover:bg-surface'}`}
              >
                <GridIcon className="w-4 h-4 text-text-secondary" />
                Radicals
              </button>
              <button
                onClick={() => { setExploreDropdownOpen(false); navigate('/flashcards'); }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors text-left cursor-pointer ${location.pathname === '/flashcards' ? 'text-primary bg-primary/5 font-semibold' : 'text-text-primary hover:bg-surface'}`}
              >
                <FlashcardIcon className="w-4 h-4 text-text-secondary" />
                Flashcards
              </button>
              <button
                onClick={() => { setExploreDropdownOpen(false); navigate('/hsk'); }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors text-left cursor-pointer ${location.pathname === '/hsk' ? 'text-primary bg-primary/5 font-semibold' : 'text-text-primary hover:bg-surface'}`}
              >
                <DashboardIcon className="w-4 h-4 text-text-secondary" />
                HSK Levels
              </button>
              <button
                onClick={() => { setExploreDropdownOpen(false); navigate('/pinyin'); }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors text-left cursor-pointer ${location.pathname === '/pinyin' ? 'text-primary bg-primary/5 font-semibold' : 'text-text-primary hover:bg-surface'}`}
              >
                <SpeakerIcon className="w-4 h-4 text-text-secondary" />
                Pinyin Chart
              </button>
              <button
                onClick={() => { setExploreDropdownOpen(false); navigate('/history'); }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors text-left cursor-pointer ${location.pathname === '/history' ? 'text-primary bg-primary/5 font-semibold' : 'text-text-primary hover:bg-surface'}`}
              >
                <ClockIcon className="w-4 h-4 text-text-secondary" />
                History
              </button>
              <button
                onClick={() => { setExploreDropdownOpen(false); navigate('/favorites'); }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors text-left cursor-pointer ${location.pathname === '/favorites' ? 'text-primary bg-primary/5 font-semibold' : 'text-text-primary hover:bg-surface'}`}
              >
                <HeartIcon className="w-4 h-4 text-text-secondary" />
                Favorites
              </button>
              <button
                onClick={() => { setExploreDropdownOpen(false); navigate('/stats'); }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors text-left cursor-pointer ${location.pathname === '/stats' ? 'text-primary bg-primary/5 font-semibold' : 'text-text-primary hover:bg-surface'}`}
              >
                <UserIcon className="w-4 h-4 text-text-secondary" />
                Stats
              </button>
            </div>
          )}
        </div>
        <button
          onClick={toggleTheme}
          className="p-2 border border-border rounded-lg transition-colors text-text-secondary hover:text-primary hover:border-primary cursor-pointer"
          title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {dark ? <SunIcon className="w-4 h-4" /> : <MoonIcon className="w-4 h-4" />}
        </button>
        {user ? (
          <>
            <button
              onClick={() => navigate('/profile')}
              className={`p-2 border rounded-lg transition-colors cursor-pointer ${
                location.pathname === '/profile'
                  ? 'text-primary border-primary bg-primary/5'
                  : 'text-text-secondary border-border hover:text-primary hover:border-primary'
              }`}
            >
              <UserIcon className="w-4 h-4" />
            </button>
            <button
              onClick={handleLogout}
              className="p-2 text-text-secondary border border-border rounded-lg hover:text-primary hover:border-primary transition-colors cursor-pointer"
            >
              <LogoutIcon className="w-4 h-4" />
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => navigate('/login')}
              className="px-4 py-2 text-text-primary border border-border rounded-lg hover:border-primary transition-colors text-sm cursor-pointer"
            >
              Login
            </button>
            <button
              onClick={() => navigate('/register')}
              className="px-4 py-2 bg-primary text-text-primary rounded-lg hover:bg-primary-hover transition-colors text-sm cursor-pointer"
            >
              Register
            </button>
          </>
        )}
      </div>

      {/* Mobile hamburger */}
      <div ref={mobileMenuRef} className="sm:hidden flex-shrink-0 relative">
        <button
          onClick={() => setMobileMenuOpen(prev => !prev)}
          className="p-2 text-text-secondary border border-border rounded-lg hover:text-primary hover:border-primary transition-colors"
        >
          {mobileMenuOpen ? <XIcon className="w-5 h-5" /> : <MenuIcon className="w-5 h-5" />}
        </button>

        {mobileMenuOpen && user && (
          <div className="absolute right-0 top-full mt-2 w-56 bg-card border border-border rounded-xl shadow-2xl overflow-hidden z-50 animate-fade-in">
            <button
              onClick={toggleTheme}
              className="w-full flex items-center gap-3 px-4 py-3 text-text-primary hover:bg-surface transition-colors text-sm cursor-pointer"
            >
              {dark ? <SunIcon className="w-4 h-4 text-text-secondary" /> : <MoonIcon className="w-4 h-4 text-text-secondary" />}
              {dark ? 'Light Mode' : 'Dark Mode'}
            </button>
            <div className="border-t border-border" />
            
            <button
              onClick={() => setMobileExploreOpen(prev => !prev)}
              className="w-full flex items-center justify-between px-4 py-3 text-text-primary hover:bg-surface transition-colors text-sm cursor-pointer"
            >
              <span className="flex items-center gap-3">
                <GridIcon className="w-4 h-4 text-text-secondary" />
                Explore Tools
              </span>
              <ChevronDownIcon className={`w-3.5 h-3.5 transition-transform duration-200 ${mobileExploreOpen ? 'rotate-180' : ''}`} />
            </button>

            {mobileExploreOpen && (
              <div className="bg-surface/50 border-t border-border/50 py-1 pl-4">
                <button
                  onClick={() => handleNav('/radicals')}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-sm cursor-pointer ${location.pathname.startsWith('/radicals') ? 'text-primary font-semibold' : 'text-text-primary hover:bg-surface'}`}
                >
                  <GridIcon className="w-4 h-4 text-text-secondary" />
                  Radicals
                </button>
                <button
                  onClick={() => handleNav('/flashcards')}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-sm cursor-pointer ${location.pathname === '/flashcards' ? 'text-primary font-semibold' : 'text-text-primary hover:bg-surface'}`}
                >
                  <FlashcardIcon className="w-4 h-4 text-text-secondary" />
                  Flashcards
                </button>
                <button
                  onClick={() => handleNav('/hsk')}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-sm cursor-pointer ${location.pathname === '/hsk' ? 'text-primary font-semibold' : 'text-text-primary hover:bg-surface'}`}
                >
                  <DashboardIcon className="w-4 h-4 text-text-secondary" />
                  HSK Levels
                </button>
                <button
                  onClick={() => handleNav('/pinyin')}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-sm cursor-pointer ${location.pathname === '/pinyin' ? 'text-primary font-semibold' : 'text-text-primary hover:bg-surface'}`}
                >
                  <SpeakerIcon className="w-4 h-4 text-text-secondary" />
                  Pinyin Chart
                </button>
                <button
                  onClick={() => handleNav('/history')}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-sm cursor-pointer ${location.pathname === '/history' ? 'text-primary font-semibold' : 'text-text-primary hover:bg-surface'}`}
                >
                  <ClockIcon className="w-4 h-4 text-text-secondary" />
                  History
                </button>
                <button
                  onClick={() => handleNav('/favorites')}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-sm cursor-pointer ${location.pathname === '/favorites' ? 'text-primary font-semibold' : 'text-text-primary hover:bg-surface'}`}
                >
                  <HeartIcon className="w-4 h-4 text-text-secondary" />
                  Favorites
                </button>
                <button
                  onClick={() => handleNav('/stats')}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-sm cursor-pointer ${location.pathname === '/stats' ? 'text-primary font-semibold' : 'text-text-primary hover:bg-surface'}`}
                >
                  <UserIcon className="w-4 h-4 text-text-secondary" />
                  Stats
                </button>
              </div>
            )}

            <div className="border-t border-border" />
            <button
              onClick={() => handleNav('/profile')}
              className={`w-full flex items-center gap-3 px-4 py-3 transition-colors text-sm cursor-pointer ${
                location.pathname === '/profile'
                  ? 'text-primary bg-surface font-semibold'
                  : 'text-text-primary hover:bg-surface'
              }`}
            >
              <UserIcon className="w-4 h-4 text-text-secondary" />
              Profile
            </button>
            <div className="border-t border-border" />
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-surface transition-colors text-sm cursor-pointer"
            >
              <LogoutIcon className="w-4 h-4" />
              Logout
            </button>
          </div>
        )}

        {mobileMenuOpen && !user && (
          <div className="absolute right-0 top-full mt-2 w-56 bg-card border border-border rounded-xl shadow-2xl overflow-hidden z-50 animate-fade-in">
            <button
              onClick={toggleTheme}
              className="w-full flex items-center gap-3 px-4 py-3 text-text-primary hover:bg-surface transition-colors text-sm cursor-pointer"
            >
              {dark ? <SunIcon className="w-4 h-4 text-text-secondary" /> : <MoonIcon className="w-4 h-4 text-text-secondary" />}
              {dark ? 'Light Mode' : 'Dark Mode'}
            </button>
            <div className="border-t border-border" />
            
            <button
              onClick={() => setMobileExploreOpen(prev => !prev)}
              className="w-full flex items-center justify-between px-4 py-3 text-text-primary hover:bg-surface transition-colors text-sm cursor-pointer"
            >
              <span className="flex items-center gap-3">
                <GridIcon className="w-4 h-4 text-text-secondary" />
                Explore Tools
              </span>
              <ChevronDownIcon className={`w-3.5 h-3.5 transition-transform duration-200 ${mobileExploreOpen ? 'rotate-180' : ''}`} />
            </button>

            {mobileExploreOpen && (
              <div className="bg-surface/50 border-t border-border/50 py-1 pl-4">
                <button
                  onClick={() => handleNav('/radicals')}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-sm cursor-pointer ${location.pathname.startsWith('/radicals') ? 'text-primary font-semibold' : 'text-text-primary hover:bg-surface'}`}
                >
                  <GridIcon className="w-4 h-4 text-text-secondary" />
                  Radicals
                </button>
                <button
                  onClick={() => handleNav('/flashcards')}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-sm cursor-pointer ${location.pathname === '/flashcards' ? 'text-primary font-semibold' : 'text-text-primary hover:bg-surface'}`}
                >
                  <FlashcardIcon className="w-4 h-4 text-text-secondary" />
                  Flashcards
                </button>
                <button
                  onClick={() => handleNav('/hsk')}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-sm cursor-pointer ${location.pathname === '/hsk' ? 'text-primary font-semibold' : 'text-text-primary hover:bg-surface'}`}
                >
                  <DashboardIcon className="w-4 h-4 text-text-secondary" />
                  HSK Levels
                </button>
                <button
                  onClick={() => handleNav('/pinyin')}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-sm cursor-pointer ${location.pathname === '/pinyin' ? 'text-primary font-semibold' : 'text-text-primary hover:bg-surface'}`}
                >
                  <SpeakerIcon className="w-4 h-4 text-text-secondary" />
                  Pinyin Chart
                </button>
                <button
                  onClick={() => handleNav('/history')}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-sm cursor-pointer ${location.pathname === '/history' ? 'text-primary font-semibold' : 'text-text-primary hover:bg-surface'}`}
                >
                  <ClockIcon className="w-4 h-4 text-text-secondary" />
                  History
                </button>
                <button
                  onClick={() => handleNav('/favorites')}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-sm cursor-pointer ${location.pathname === '/favorites' ? 'text-primary font-semibold' : 'text-text-primary hover:bg-surface'}`}
                >
                  <HeartIcon className="w-4 h-4 text-text-secondary" />
                  Favorites
                </button>
                <button
                  onClick={() => handleNav('/stats')}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-sm cursor-pointer ${location.pathname === '/stats' ? 'text-primary font-semibold' : 'text-text-primary hover:bg-surface'}`}
                >
                  <UserIcon className="w-4 h-4 text-text-secondary" />
                  Stats
                </button>
              </div>
            )}

            <div className="border-t border-border" />
            <button
              onClick={() => handleNav('/login')}
              className="w-full flex items-center gap-3 px-4 py-3 text-text-primary hover:bg-surface transition-colors text-sm text-left cursor-pointer"
            >
              <UserIcon className="w-4 h-4 text-text-secondary" />
              Login
            </button>
            <button
              onClick={() => handleNav('/register')}
              className="w-full flex items-center gap-3 px-4 py-3 text-primary hover:bg-surface transition-colors text-sm text-left font-medium cursor-pointer"
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
