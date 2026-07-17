import { useState, useEffect, useCallback } from 'react'
import PropTypes from 'prop-types'
import API_BASE, { fetchWithTimeout } from '../api'

function CustomListsModal({ wordId, isOpen, onClose }) {
  const [lists, setLists] = useState([])
  const [activeListIds, setActiveListIds] = useState([])
  const [newListName, setNewListName] = useState('')
  const [newListDesc, setNewListDesc] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchListsAndMemberships = useCallback(async () => {
    if (!wordId || !isOpen) return
    setLoading(true)
    setError(null)
    try {
      const [listsRes, membershipsRes] = await Promise.all([
        fetchWithTimeout(`${API_BASE}/api/lists`, { credentials: 'include' }),
        fetchWithTimeout(`${API_BASE}/api/words/${wordId}/lists`, { credentials: 'include' }),
      ])

      if (!listsRes.ok || !membershipsRes.ok) {
        throw new Error('Failed to retrieve list information')
      }

      const listsData = await listsRes.json()
      const membershipsData = await membershipsRes.json()

      setLists(listsData)
      setActiveListIds(membershipsData)
    } catch (err) {
      console.error(err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [wordId, isOpen])

  useEffect(() => {
    fetchListsAndMemberships()
  }, [fetchListsAndMemberships])

  const handleToggleList = async (listId) => {
    const isMember = activeListIds.includes(listId)
    const url = `/api/lists/${listId}/words${isMember ? `/${wordId}` : ''}`
    const method = isMember ? 'DELETE' : 'POST'

    try {
      const res = await fetchWithTimeout(`${API_BASE}${url}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: isMember ? undefined : JSON.stringify({ wordId }),
        credentials: 'include',
      })

      if (!res.ok) throw new Error('Failed to update list association')

      // Toggle state
      setActiveListIds(prev =>
        isMember ? prev.filter(id => id !== listId) : [...prev, listId]
      )
    } catch (err) {
      console.error(err)
      setError(err.message)
    }
  }

  const handleCreateList = async (e) => {
    e.preventDefault()
    if (!newListName.trim()) return
    setError(null)

    try {
      const res = await fetchWithTimeout(`${API_BASE}/api/lists`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newListName, description: newListDesc }),
        credentials: 'include',
      })

      if (!res.ok) throw new Error('Failed to create new list')

      const createdList = await res.json()

      // Automatically add word to this new list
      await fetchWithTimeout(`${API_BASE}/api/lists/${createdList.id}/words`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ wordId }),
        credentials: 'include',
      })

      // Refresh list options
      setNewListName('')
      setNewListDesc('')
      fetchListsAndMemberships()
    } catch (err) {
      console.error(err)
      setError(err.message)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-background/60 backdrop-blur-md transition-opacity duration-300"
      />

      {/* Modal Content */}
      <div className="relative bg-card/90 backdrop-blur-2xl border border-border/50 rounded-3xl p-6 w-full max-w-md shadow-2xl overflow-hidden animate-fade-in">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-text-primary">Add to Vocabulary List</h3>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="text-text-secondary hover:text-text-primary transition-colors text-xl font-bold"
          >
            &times;
          </button>
        </div>

        {error && (
          <div className="mb-4 text-xs font-semibold text-rose-500 bg-rose-500/10 border border-rose-500/20 rounded-xl px-3 py-2">
            {error}
          </div>
        )}

        {/* Existing Lists */}
        <div className="space-y-3 max-h-48 overflow-y-auto mb-6 pr-1 custom-scrollbar">
          {loading ? (
            <div className="text-center py-4 text-sm text-text-secondary animate-pulse">
              Loading lists...
            </div>
          ) : lists.length === 0 ? (
            <p className="text-center py-4 text-xs text-text-secondary">
              No lists created yet. Create one below!
            </p>
          ) : (
            lists.map(list => (
              <label
                key={list.id}
                className="flex items-center gap-3 p-3 bg-surface/40 hover:bg-surface/80 border border-border/30 rounded-2xl cursor-pointer transition-all duration-200"
              >
                <input
                  type="checkbox"
                  checked={activeListIds.includes(list.id)}
                  onChange={() => handleToggleList(list.id)}
                  className="rounded border-border text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-text-primary truncate">{list.name}</p>
                  {list.description && (
                    <p className="text-xs text-text-secondary truncate mt-0.5">{list.description}</p>
                  )}
                </div>
              </label>
            ))
          )}
        </div>

        {/* Inline Create Form */}
        <form onSubmit={handleCreateList} className="border-t border-border/30 pt-4">
          <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-3">
            Create a New List
          </h4>
          <div className="space-y-2">
            <input
              type="text"
              placeholder="List Name (e.g. 'Food', 'Travel')"
              value={newListName}
              onChange={e => setNewListName(e.target.value)}
              required
              className="w-full px-4 py-2 bg-surface/50 border border-border/50 rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
            <input
              type="text"
              placeholder="Description (optional)"
              value={newListDesc}
              onChange={e => setNewListDesc(e.target.value)}
              className="w-full px-4 py-2 bg-surface/50 border border-border/50 rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
            <button
              type="submit"
              disabled={!newListName.trim()}
              className="w-full py-2 bg-primary text-text-primary rounded-xl text-sm font-semibold hover:bg-primary-hover transition-all active:scale-[98%] disabled:opacity-50"
            >
              Create &amp; Add Word
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

CustomListsModal.propTypes = {
  wordId: PropTypes.number.isRequired,
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
}

export default CustomListsModal
