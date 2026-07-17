import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { SearchIcon } from './Icons'
import { useTheme } from '../hooks/useTheme'
import { playSound } from '../utils/audio'
import API_BASE from '../api'

export default function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const dialogRef = useRef(null)
  const navigate = useNavigate()
  const { dark, toggle: toggleTheme } = useTheme()

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Toggle with Ctrl+K or Cmd+K
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        playSound('pop')
        setOpen((o) => !o)
      }
      
      if (e.key === 'Escape' && open) {
        setOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open])

  useEffect(() => {
    if (open) {
      dialogRef.current?.showModal()
    } else {
      dialogRef.current?.close()
    }
  }, [open])

  // Search autocomplete inside palette
  useEffect(() => {
    if (!query.trim() || query.length < 1) {
      setSearchResults([])
      return
    }
    const timer = setTimeout(() => {
      fetch(`${API_BASE}/api/search?q=${encodeURIComponent(query.trim())}&limit=5`)
        .then(res => res.json())
        .then(data => {
          if (data) setSearchResults(data)
        })
        .catch(console.error)
    }, 150)
    return () => clearTimeout(timer)
  }, [query])

  const handleClose = (e) => {
    if (e.target === dialogRef.current) {
      setOpen(false)
    }
  }

  const pages = [
    { name: 'Home', path: '/', emoji: '🏠' },
    { name: 'Flashcards', path: '/flashcards', emoji: '📇' },
    { name: 'Graded Reading', path: '/reading', emoji: '📚' },
    { name: 'Quiz Mode', path: '/quiz', emoji: '🎮' },
    { name: 'Stats', path: '/stats', emoji: '📈' },
    { name: 'Profile', path: '/profile', emoji: '👤' },
    { name: 'Settings', path: '/settings', emoji: '⚙️' },
  ]

  const commands = [
    { name: `Toggle Theme (${dark ? 'Light Mode' : 'Dark Mode'})`, action: () => { toggleTheme(); playSound('pop'); setOpen(false); }, emoji: '🌗' },
    { name: 'Expedition Sector 1', path: '/journey/lesson/1', emoji: '🗺️' },
    { name: 'Expedition Sector 2', path: '/journey/lesson/2', emoji: '🗺️' },
    { name: 'Expedition Sector 3', path: '/journey/lesson/3', emoji: '🗺️' },
    { name: 'HSK 1 Words List', path: '/hsk/1', emoji: '🏆' },
    { name: 'HSK 2 Words List', path: '/hsk/2', emoji: '🏆' },
    { name: 'HSK 3 Words List', path: '/hsk/3', emoji: '🏆' },
    { name: 'HSK 4 Words List', path: '/hsk/4', emoji: '🏆' },
  ]

  const filteredPages = pages.filter(p => p.name.toLowerCase().includes(query.toLowerCase()))
  const filteredCommands = commands.filter(c => c.name.toLowerCase().includes(query.toLowerCase()))

  const handleSelect = (path, action) => {
    playSound('pop')
    setOpen(false)
    setQuery('')
    if (action) {
      action()
    } else {
      navigate(path)
    }
  }

  return (
    <dialog 
      ref={dialogRef}
      onClick={handleClose}
      className="backdrop:bg-background/80 backdrop:backdrop-blur-sm bg-transparent w-full max-w-2xl mt-[10vh] mx-auto p-4 rounded-3xl outline-none"
    >
      <div className="bg-card/90 backdrop-blur-xl border border-border rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        <div className="flex items-center px-4 border-b border-border/50">
          <SearchIcon className="w-5 h-5 text-text-secondary" />
          <input 
            type="text"
            className="w-full bg-transparent px-4 py-4 text-text-primary text-lg focus:outline-none placeholder:text-text-secondary"
            placeholder="Search pages, commands, or vocabulary..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoFocus
          />
          <kbd className="hidden sm:inline-block px-2 py-1 bg-surface border border-border rounded-lg text-xs font-mono text-text-secondary">ESC</kbd>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          {/* Dictionary search results (if typing) */}
          {searchResults.length > 0 && (
            <div className="space-y-1 mb-4">
              <div className="px-3 py-2 text-xs font-bold text-primary uppercase tracking-wider">Vocabulary Matches</div>
              {searchResults.map((word) => (
                <button
                  key={word.id}
                  onClick={() => handleSelect(`/word/${word.id}`)}
                  className="w-full flex items-center justify-between px-3 py-3 rounded-xl hover:bg-primary/10 hover:text-primary transition-colors text-left text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">🇨🇳</span>
                    <span className="font-medium">{word.character} ({word.pinyin})</span>
                  </div>
                  <span className="text-xs text-text-secondary line-clamp-1 truncate max-w-xs">{word.definition}</span>
                </button>
              ))}
            </div>
          )}

          {filteredPages.length > 0 && (
            <div className="space-y-1 mb-4">
              <div className="px-3 py-2 text-xs font-bold text-text-secondary uppercase tracking-wider">Navigation</div>
              {filteredPages.map((page) => (
                <button
                  key={page.path}
                  onClick={() => handleSelect(page.path)}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-primary/10 hover:text-primary transition-colors text-left text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <span className="text-xl">{page.emoji}</span>
                  <span className="font-medium">{page.name}</span>
                </button>
              ))}
            </div>
          )}

          {filteredCommands.length > 0 && (
            <div className="space-y-1">
              <div className="px-3 py-2 text-xs font-bold text-text-secondary uppercase tracking-wider">Quick Actions & Levels</div>
              {filteredCommands.map((c) => (
                <button
                  key={c.name}
                  onClick={() => handleSelect(c.path, c.action)}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-primary/10 hover:text-primary transition-colors text-left text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <span className="text-xl">{c.emoji}</span>
                  <span className="font-medium">{c.name}</span>
                </button>
              ))}
            </div>
          )}

          {filteredPages.length === 0 && filteredCommands.length === 0 && searchResults.length === 0 && (
            <div className="p-8 text-center text-text-secondary animate-pulse">
              No results found for "{query}"
            </div>
          )}
        </div>
      </div>
    </dialog>
  )
}
