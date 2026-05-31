import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { useAuth } from '../context/AuthContext'
import API_BASE, { fetchWithTimeout } from '../api'
import { ChevronLeftIcon, FileIcon, TrashIcon, XIcon } from '../components/Icons'

function ListsPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [lists, setLists] = useState([])
  const [selectedList, setSelectedList] = useState(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(null)
  const [removingWord, setRemovingWord] = useState(null)
  const [toast, setToast] = useState(null)
  const [newListName, setNewListName] = useState('')
  const [creatingList, setCreatingList] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [wordSearchQuery, setWordSearchQuery] = useState('')
  const [wordSearchResults, setWordSearchResults] = useState([])
  const [wordSearching, setWordSearching] = useState(false)
  const [addingWord, setAddingWord] = useState(null)
  const toastTimerRef = useRef(null)

  const showToast = (message) => {
    setToast(message)
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    toastTimerRef.current = setTimeout(() => setToast(null), 2500)
  }

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    }
  }, [])

  const fetchLists = useCallback(async () => {
    setLoading(true)
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
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchLists()
  }, [fetchLists])

  const openList = async (list) => {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/api/lists/${list.id}`, {
        credentials: 'include',
      })
      if (res.ok) {
        const data = await res.json()
        setSelectedList(data)
      } else {
        showToast('Failed to load list')
      }
    } catch (err) {
      console.error('Failed to load list:', err)
      showToast('Failed to load list')
    }
  }

  const requestDeleteList = (listId, e) => {
    e.stopPropagation()
    setDeleteConfirm(listId)
  }

  const deleteList = async (listId, e) => {
    e.stopPropagation()
    setDeleting(listId)
    setDeleteConfirm(null)
    try {
      const res = await fetchWithTimeout(`${API_BASE}/api/lists/${listId}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (res.ok) {
        if (selectedList && selectedList.id === listId) {
          setSelectedList(null)
        }
        setLists((prev) => prev.filter((l) => l.id !== listId))
        showToast('List deleted')
      }
    } catch (err) {
      console.error('Failed to delete list:', err)
      showToast('Failed to delete list')
    }
    setDeleting(null)
  }

  const goBack = () => {
    setSelectedList(null)
  }

  const createList = async () => {
    if (!newListName.trim()) return
    setCreatingList(true)
    try {
      const res = await fetchWithTimeout(`${API_BASE}/api/lists`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: newListName.trim() }),
      })
      if (res.ok) {
        const newList = await res.json()
        setLists((prev) => [newList, ...prev])
        setNewListName('')
        showToast(`List "${newList.name}" created`)
      }
    } catch (err) {
      console.error('Failed to create list:', err)
      showToast('Failed to create list')
    }
    setCreatingList(false)
  }

  const removeWordFromList = async (wordId, e) => {
    e.stopPropagation()
    if (!selectedList) return
    const listId = selectedList.id
    setRemovingWord(wordId)
    try {
      const res = await fetchWithTimeout(`${API_BASE}/api/lists/${listId}/words/${wordId}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (res.ok) {
        setSelectedList((prev) => ({
          ...prev,
          words: prev.words.filter((w) => w.id !== wordId),
        }))
        setLists((prev) =>
          prev.map((l) =>
            l.id === listId
              ? { ...l, word_count: Math.max(0, (l.word_count || 0) - 1) }
              : l,
          ),
        )
        showToast('Word removed from list')
      } else {
        showToast('Failed to remove word')
      }
    } catch (err) {
      console.error('Failed to remove word:', err)
      showToast('Failed to remove word')
    }
    setRemovingWord(null)
  }

  const searchForWords = async (query) => {
    if (!query.trim()) {
      setWordSearchResults([])
      return
    }
    setWordSearching(true)
    try {
      const res = await fetchWithTimeout(`${API_BASE}/api/search?q=${encodeURIComponent(query.trim())}`, {
        credentials: 'include',
      })
      if (res.ok) {
        const data = await res.json()
        const filtered = data.filter(
          (w) => !selectedList?.words?.some((sw) => sw.id === w.id),
        )
        setWordSearchResults(filtered)
      }
    } catch (err) {
      console.error('Failed to search words:', err)
    }
    setWordSearching(false)
  }

  const addWordToList = async (word) => {
    if (!selectedList) return
    setAddingWord(word.id)
    try {
      const res = await fetchWithTimeout(`${API_BASE}/api/lists/${selectedList.id}/words/${word.id}`, {
        method: 'POST',
        credentials: 'include',
      })
      if (res.ok) {
        setSelectedList((prev) => ({
          ...prev,
          words: [...prev.words, word],
        }))
        setLists((prev) =>
          prev.map((l) =>
            l.id === selectedList.id
              ? { ...l, word_count: (l.word_count || 0) + 1 }
              : l,
          ),
        )
        setWordSearchResults((prev) => prev.filter((w) => w.id !== word.id))
        setWordSearchQuery('')
        showToast(`"${word.character}" added to list`)
      } else {
        const errData = await res.json().catch(() => ({}))
        showToast(errData.error || 'Failed to add word')
      }
    } catch (err) {
      console.error('Failed to add word:', err)
      showToast('Failed to add word')
    }
    setAddingWord(null)
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-8">
        {toast && (
          <div className="fixed top-28 left-1/2 -translate-x-1/2 z-[60] px-5 py-2.5 bg-card border border-border rounded-lg shadow-lg text-text-primary text-sm animate-fade-in" role="status" aria-live="polite">
            {toast}
          </div>
        )}

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-text-primary mb-1">My Lists</h1>
          <p className="text-text-secondary">Manage your vocabulary lists</p>
        </div>

        {selectedList ? (
          <div>
            <div className="flex items-center gap-3 mb-6">
              <button
                onClick={goBack}
                className="px-3 py-2 text-sm text-text-secondary border border-border rounded-lg hover:text-primary hover:border-primary transition-colors flex items-center gap-1.5"
              >
                <ChevronLeftIcon className="w-4 h-4" />
                Back
              </button>
              <h2 className="text-xl font-bold text-text-primary">{selectedList.name}</h2>
              <span className="text-sm text-text-secondary">({selectedList.words?.length || 0} words)</span>
            </div>

            <div className="mb-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={wordSearchQuery}
                  onChange={(e) => {
                    setWordSearchQuery(e.target.value)
                    if (e.target.value.trim()) {
                      searchForWords(e.target.value)
                    } else {
                      setWordSearchResults([])
                    }
                  }}
                  placeholder="Search words to add..."
                  className="flex-1 px-3 py-2 bg-card border border-border rounded-lg text-sm text-text-primary placeholder-text-secondary focus:outline-none focus:border-primary"
                />
              </div>

              {wordSearchResults.length > 0 && (
                <div className="mt-2 bg-card border border-border rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                  {wordSearchResults.map((word) => (
                    <div
                      key={word.id}
                      className="flex items-center justify-between px-4 py-2.5 hover:bg-surface transition-colors border-b border-border last:border-b-0"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-lg font-bold text-text-primary flex-shrink-0">{word.character}</span>
                        <div className="min-w-0">
                          <p className="text-xs text-primary truncate">{word.pinyin}</p>
                          <p className="text-xs text-text-secondary truncate">{word.english_definition || ''}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => addWordToList(word)}
                        disabled={addingWord === word.id}
                        className="px-3 py-1.5 bg-primary text-text-primary rounded-lg text-xs font-medium hover:bg-primary-hover transition-colors disabled:opacity-50 flex-shrink-0 ml-2"
                      >
                        {addingWord === word.id ? (
                          <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        ) : (
                          'Add'
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {wordSearching && (
                <div className="flex justify-center py-2 mt-1">
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>

            {selectedList.words && selectedList.words.length === 0 && !wordSearchQuery.trim() && (
              <div className="text-center py-12 text-text-secondary">
                <p className="text-lg mb-2">No words yet</p>
                <p className="text-sm">Search above to add words</p>
              </div>
            )}

            {selectedList.words && selectedList.words.length > 0 && (
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                {selectedList.words.map((word, index) => (
                  <div
                    key={word.id}
                    className={`flex items-center justify-between px-5 py-4 hover:bg-surface transition-colors ${
                      index !== selectedList.words.length - 1 ? 'border-b border-border' : ''
                    }`}
                  >
                    <div
                      onClick={() => navigate(`/word/${word.id}`)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/word/${word.id}`) } }}
                      role="button"
                      tabIndex={0}
                      className="flex items-center gap-4 flex-1 cursor-pointer"
                    >
                      <span className="text-2xl font-bold text-text-primary">{word.character}</span>
                      <div>
                        <p className="text-sm text-primary">{word.pinyin}</p>
                        <p className="text-sm text-text-secondary">{word.english_definition || 'No definition available'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {word.hsk_level && (
                        <span className="px-2 py-0.5 bg-primary/20 text-primary rounded text-xs font-semibold">
                          HSK {word.hsk_level}
                        </span>
                      )}
                      <button
                        onClick={(e) => removeWordFromList(word.id, e)}
                        disabled={removingWord === word.id}
                        className="p-2 text-text-secondary hover:text-red-400 transition-colors disabled:opacity-50"
                        title="Remove word from list"
                      >
                        {removingWord === word.id ? (
                          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        ) : (
                        <XIcon className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div>
            <div className="flex gap-2 mb-4">
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
                disabled={!newListName.trim() || creatingList}
                className="px-4 py-2 bg-primary text-text-primary rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create
              </button>
            </div>

            {loading && (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-card border border-border rounded-xl p-5">
                    <div className="flex items-center gap-4">
                      <div className="skeleton w-10 h-10 rounded-lg" />
                      <div className="flex-1 space-y-2">
                        <div className="skeleton h-5 w-32" />
                        <div className="skeleton h-4 w-20" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!loading && lists.length === 0 && (
              <div className="text-center py-12 text-text-secondary">
                <p className="text-lg mb-2">No lists yet</p>
                <p className="text-sm">Create lists from a word's detail page</p>
              </div>
            )}

            {!loading && lists.length > 0 && (
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                {lists.map((list, index) => (
                  <div
                    key={list.id}
                    className={`flex items-center justify-between px-5 py-4 hover:bg-surface transition-colors ${
                      index !== lists.length - 1 ? 'border-b border-border' : ''
                    }`}
                  >
                    <button
                      onClick={() => openList(list)}
                      className="flex items-center gap-3 flex-1 text-left"
                    >
                      <FileIcon className="w-5 h-5 text-text-secondary flex-shrink-0" />
                      <div>
                        <p className="text-text-primary font-medium">{list.name}</p>
                        <p className="text-xs text-text-secondary">{list.word_count || 0} words</p>
                      </div>
                    </button>
                    <div className="ml-3 flex items-center gap-2">
                      {deleteConfirm === list.id ? (
                        <>
                          <button
                            onClick={(e) => { e.stopPropagation(); setDeleteConfirm(null) }}
                            disabled={deleting === list.id}
                            className="p-2 text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50"
                            title="Cancel"
                          >
                            <XIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => deleteList(list.id, e)}
                            disabled={deleting === list.id}
                            className="p-2 text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
                            title="Confirm delete"
                          >
                            {deleting === list.id ? (
                              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <TrashIcon className="w-4 h-4" />
                            )}
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={(e) => requestDeleteList(list.id, e)}
                          disabled={deleting === list.id}
                          className="p-2 text-text-secondary hover:text-red-400 transition-colors disabled:opacity-50"
                          title="Delete list"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default ListsPage
