import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { SearchIcon } from './Icons'

export default function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const dialogRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Toggle with Ctrl+K or Cmd+K
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
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

  const filteredPages = pages.filter(p => p.name.toLowerCase().includes(query.toLowerCase()))

  const handleSelect = (path) => {
    setOpen(false)
    setQuery('')
    navigate(path)
  }

  return (
    <dialog 
      ref={dialogRef}
      onClick={handleClose}
      className="backdrop:bg-background/90 bg-transparent w-full max-w-2xl mt-[10vh] mx-auto p-4 rounded-xl outline-none"
    >
      <div className="bg-card btn-brutal border border-border rounded-xl overflow-hidden flex flex-col">
        <div className="flex items-center px-4 border-b border-border/50">
          <SearchIcon className="w-5 h-5 text-text-secondary" />
          <input 
            type="text"
            className="w-full bg-transparent px-4 py-4 text-text-primary text-lg focus:outline-none placeholder:text-text-secondary"
            placeholder="Search pages or navigate..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoFocus
          />
          <kbd className="hidden sm:inline-block px-2 py-1 bg-surface border border-border rounded-lg text-xs font-mono text-text-secondary">ESC</kbd>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          {filteredPages.length > 0 ? (
            <div className="space-y-1">
              <div className="px-3 py-2 text-xs font-bold text-text-secondary uppercase tracking-wider">Navigation</div>
              {filteredPages.map((page, i) => (
                <button
                  key={page.path}
                  onClick={() => handleSelect(page.path)}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-primary/10 hover:text-primary transition-colors text-left text-text-primary"
                >
                  <span className="text-xl">{page.emoji}</span>
                  <span className="font-medium">{page.name}</span>
                </button>
              ))}
            </div>
          ) : (
             <div className="p-8 text-center text-text-secondary">
               No results found for "{query}"
             </div>
          )}
        </div>
      </div>
    </dialog>
  )
}
