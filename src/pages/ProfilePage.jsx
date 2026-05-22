import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { useAuth } from '../context/AuthContext'
import API_BASE, { fetchWithTimeout } from '../api'

function ProfilePage() {
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

  const showToast = (message) => {
    setToast(message)
    setTimeout(() => setToast(null), 2500)
  }

  const fetchLists = async () => {
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
    } catch {
      showToast('Failed to load lists')
    }
    setLoading(false)
  }

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }
    fetchLists()
  }, [user, navigate])

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
    } catch {
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
    } catch {
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
    } catch {
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
              : l
          )
        )
        showToast('Word removed from list')
      }
    } catch {
      showToast('Failed to remove word')
    }
    setRemovingWord(null)
  }

  if (!user) return null

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
          <div className="skeleton w-32 h-8" />
          <div className="skeleton w-48 h-5" />
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
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-8">
        {toast && (
          <div className="fixed top-28 left-1/2 -translate-x-1/2 z-[55] px-5 py-2.5 bg-card border border-border rounded-lg shadow-lg text-text-primary text-sm animate-fade-in">
            {toast}
          </div>
        )}

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-text-primary mb-1">Profile</h1>
          <p className="text-text-secondary">{user.email}</p>
        </div>

        {selectedList ? (
          <div>
            <div className="flex items-center gap-3 mb-6">
              <button
                onClick={goBack}
                className="px-3 py-2 text-sm text-text-secondary border border-border rounded-lg hover:text-primary hover:border-primary transition-colors flex items-center gap-1.5"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
                Back
              </button>
              <h2 className="text-xl font-bold text-text-primary">{selectedList.name}</h2>
              <span className="text-sm text-text-secondary">({selectedList.words?.length || 0} words)</span>
            </div>

            {selectedList.words && selectedList.words.length === 0 && (
              <div className="text-center py-12 text-text-secondary">
                <p className="text-lg mb-2">No words yet</p>
                <p className="text-sm">Add words from their detail page</p>
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
                        <span className="px-2 py-0.5 bg-primary bg-opacity-20 text-primary rounded text-xs font-semibold">
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
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
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
            <h2 className="text-lg font-semibold text-text-primary mb-4">Vocabulary Lists</h2>

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
                      className="flex items-center gap-3 flex-1 text-left cursor-pointer"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-text-secondary flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                        <polyline points="17 21 17 13 7 13 7 21" />
                        <polyline points="7 3 7 8 15 8" />
                      </svg>
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
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="18" y1="6" x2="6" y2="18" />
                              <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
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
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              </svg>
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
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
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

export default ProfilePage
