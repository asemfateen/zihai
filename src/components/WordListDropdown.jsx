import { useState, useEffect, useRef } from 'react'
import API_BASE, { fetchWithTimeout } from '../api'

function WordListDropdown({ word, user, navigate, showToast }) {
  const [lists, setLists] = useState([])
  const [listsLoading, setListsLoading] = useState(false)
  const [newListName, setNewListName] = useState('')
  const [addingToList, setAddingToList] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    if (!isOpen) return
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false)
        setNewListName('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const fetchLists = async () => {
    setListsLoading(true)
    try {
      const res = await fetchWithTimeout(`${API_BASE}/api/lists`, {
        credentials: 'include',
      })
      if (res.ok) {
        const data = await res.json()
        setLists(data)
      } else {
        showToast('Failed to load lists')
      }
    } catch (err) {
      console.error('Failed to load lists:', err)
      showToast('Failed to load lists')
    }
    setListsLoading(false)
  }

  const handleOpen = () => {
    if (!user) {
      navigate('/login')
      return
    }
    setIsOpen(true)
    setLists([])
    fetchLists()
  }

  const createList = async () => {
    if (!newListName.trim()) return
    try {
      const res = await fetchWithTimeout(`${API_BASE}/api/lists`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: newListName.trim() }),
      })
      if (res.ok) {
        const newList = await res.json()
        setLists((prev) => [...prev, newList])
        setNewListName('')
        showToast(`List "${newList.name}" created`)
      }
    } catch (err) {
      console.error('Failed to create list:', err)
      showToast('Failed to create list')
    }
  }

  const addToList = async (listId, listName) => {
    if (!word) return
    setAddingToList(true)
    try {
      const res = await fetchWithTimeout(`${API_BASE}/api/lists/${listId}/words/${word.id}`, {
        method: 'POST',
        credentials: 'include',
      })
      if (res.ok) {
        showToast(`Added to "${listName}"`)
        setIsOpen(false)
        setNewListName('')
      } else {
        const errData = await res.json().catch(() => ({}))
        showToast(errData.error || 'Failed to add word')
      }
    } catch (err) {
      console.error('Failed to add word to list:', err)
      showToast('Failed to add word to list')
    }
    setAddingToList(false)
  }

  return (
    <div className="relative mb-3 inline-block" ref={dropdownRef}>
      <button
        onClick={isOpen ? () => setIsOpen(false) : handleOpen}
        className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-surface border border-border text-text-secondary hover:text-primary hover:border-primary transition-all hover:scale-110"
        title="Add to list"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
          <polyline points="17 21 17 13 7 13 7 21" />
          <polyline points="7 3 7 8 15 8" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute left-0 right-auto top-full mt-2 min-w-[16rem] bg-card border border-border rounded-xl shadow-2xl z-[70] overflow-hidden">
          <div className="p-3 border-b border-border">
            <p className="text-sm font-semibold text-text-primary mb-2">Add to list</p>
            {listsLoading ? (
              <div className="flex justify-center py-3">
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : lists.length === 0 ? (
              <p className="text-xs text-text-secondary italic py-1">No lists yet</p>
            ) : (
              <div className="max-h-40 overflow-y-auto space-y-1">
                {lists.map((list) => (
                  <button
                    key={list.id}
                    onClick={() => addToList(list.id, list.name)}
                    disabled={addingToList}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm text-text-primary hover:bg-surface transition-colors disabled:opacity-50 flex items-center justify-between"
                  >
                    <span className="truncate">{list.name}</span>
                    <span className="text-xs text-text-secondary ml-2">{list.word_count || 0}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="p-3 bg-surface">
            <div className="flex gap-2">
              <input
                type="text"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && createList()}
                placeholder="New list name"
                className="flex-1 px-3 py-2 bg-card border border-border rounded-lg text-sm text-text-primary placeholder-text-secondary focus:outline-none focus:border-primary"
              />
              <button
                onClick={createList}
                disabled={!newListName.trim() || addingToList}
                className="px-3 py-2 bg-primary text-text-primary rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default WordListDropdown
