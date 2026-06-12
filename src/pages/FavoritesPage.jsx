import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { useAuth } from '../context/AuthContext'
import API_BASE, { fetchWithTimeout } from '../api'
import { HeartIcon, TrashIcon } from '../components/Icons'
import { cleanDefinition } from '../utils/text'

function FavoritesPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('favorites') // 'favorites' | 'lists'
  
  // Favorites State
  const [favorites, setFavorites] = useState([])
  const [loadingFavorites, setLoadingFavorites] = useState(true)
  const [removingFav, setRemovingFav] = useState(null)
  const [favError, setFavError] = useState(false)

  // Custom Lists State
  const [lists, setLists] = useState([])
  const [loadingLists, setLoadingLists] = useState(true)
  const [listsError, setListsError] = useState(false)
  const [selectedList, setSelectedList] = useState(null) // list object if viewing list details
  const [listWords, setListWords] = useState([])
  const [loadingListWords, setLoadingListWords] = useState(false)

  // Fetch Favorites
  const fetchFavorites = useCallback(async () => {
    setFavError(false)
    setLoadingFavorites(true)
    try {
      const res = await fetchWithTimeout(`${API_BASE}/api/favorites`, {
        credentials: 'include',
      })
      if (res.ok) {
        const data = await res.json()
        setFavorites(data)
      } else {
        setFavError(true)
      }
    } catch (err) {
      console.error('Failed to fetch favorites:', err)
      setFavError(true)
    } finally {
      setLoadingFavorites(false)
    }
  }, [])

  // Fetch Lists
  const fetchLists = useCallback(async () => {
    setListsError(false)
    setLoadingLists(true)
    try {
      const res = await fetchWithTimeout(`${API_BASE}/api/lists`, {
        credentials: 'include',
      })
      if (res.ok) {
        const data = await res.json()
        setLists(data)
      } else {
        setListsError(true)
      }
    } catch (err) {
      console.error('Failed to fetch lists:', err)
      setListsError(true)
    } finally {
      setLoadingLists(false)
    }
  }, [])

  // Load data depending on active tab
  useEffect(() => {
    if (activeTab === 'favorites') {
      fetchFavorites()
    } else {
      fetchLists()
      setSelectedList(null)
    }
  }, [activeTab, fetchFavorites, fetchLists])

  // Remove Favorite
  const removeFavorite = async (wordId, e) => {
    e.stopPropagation()
    setRemovingFav(wordId)
    try {
      const res = await fetchWithTimeout(`${API_BASE}/api/favorites/${wordId}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (res.ok || res.status === 404) {
        setFavorites((prev) => prev.filter((f) => f.id !== wordId))
      }
    } catch (err) {
      console.error('Failed to remove favorite:', err)
    } finally {
      setRemovingFav(null)
    }
  }

  // View List Words
  const handleViewList = async (list) => {
    setSelectedList(list)
    setLoadingListWords(true)
    try {
      const res = await fetchWithTimeout(`${API_BASE}/api/lists/${list.id}/words`, {
        credentials: 'include',
      })
      if (res.ok) {
        const data = await res.json()
        setListWords(data)
      }
    } catch (err) {
      console.error('Failed to fetch list words:', err)
    } finally {
      setLoadingListWords(false)
    }
  }

  // Delete Custom List
  const handleDeleteList = async (listId, e) => {
    e.stopPropagation()
    if (!window.confirm('Are you sure you want to delete this list?')) return
    try {
      const res = await fetchWithTimeout(`${API_BASE}/api/lists/${listId}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (res.ok) {
        setLists(prev => prev.filter(l => l.id !== listId))
        if (selectedList?.id === listId) {
          setSelectedList(null)
        }
      }
    } catch (err) {
      console.error('Failed to delete list:', err)
    }
  }

  // Remove Word from Custom List
  const handleRemoveWordFromList = async (wordId, e) => {
    e.stopPropagation()
    if (!selectedList) return
    try {
      const res = await fetchWithTimeout(`${API_BASE}/api/lists/${selectedList.id}/words/${wordId}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (res.ok) {
        setListWords(prev => prev.filter(w => w.id !== wordId))
        // Update word count in the parent list option too
        setLists(prev => prev.map(l => l.id === selectedList.id ? { ...l, word_count: l.word_count - 1 } : l))
      }
    } catch (err) {
      console.error('Failed to remove word from list:', err)
    }
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-background relative z-10">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-8">
        
        {/* Header and Tab Controls */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
          <h1 className="text-2xl font-bold text-text-primary">
            {selectedList ? `${selectedList.name}` : 'My Library'}
          </h1>

          <div className="flex bg-surface p-1 rounded-xl border border-border/50 self-start sm:self-auto">
            <button
              onClick={() => {
                setActiveTab('favorites')
                setSelectedList(null)
              }}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                activeTab === 'favorites' && !selectedList
                  ? 'bg-primary text-text-primary shadow'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Favorites
            </button>
            <button
              onClick={() => setActiveTab('lists')}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                activeTab === 'lists' || selectedList
                  ? 'bg-primary text-text-primary shadow'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Custom Lists
            </button>
          </div>
        </div>

        {/* Back Button if viewing a custom list details */}
        {selectedList && (
          <button
            onClick={() => setSelectedList(null)}
            className="mb-4 text-xs font-semibold text-text-secondary bg-surface border border-border/50 px-3 py-1.5 rounded-xl hover:text-primary transition-colors"
          >
            &larr; Back to Lists
          </button>
        )}

        {/* ---------------- TABS PANELS ---------------- */}

        {/* 1. FAVORITES PANEL */}
        {activeTab === 'favorites' && !selectedList && (
          <>
            {loadingFavorites && (
              <div className="flex flex-col gap-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-card btn-brutal p-5 skeleton h-24" />
                ))}
              </div>
            )}

            {favError && (
              <div className="text-center py-12 text-rose-500">
                <p>Could not fetch favorites. Please reload.</p>
              </div>
            )}

            {!loadingFavorites && !favError && favorites.length === 0 && (
              <div className="text-center py-12 bg-card btn-brutal border border-border/30 rounded-xl text-text-secondary p-6">
                <HeartIcon className="w-12 h-12 mx-auto mb-3 text-border" />
                <p className="text-base font-bold mb-1">No favorites yet</p>
                <p className="text-xs">Tap the heart icon on any word page to save it here.</p>
              </div>
            )}

            {!loadingFavorites && !favError && favorites.length > 0 && (
              <div className="flex flex-col gap-3">
                {favorites.map((word, index) => (
                  <div
                    key={word.id}
                    onClick={() => navigate(`/word/${word.id}`)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/word/${word.id}`) } }}
                    role="button"
                    tabIndex={0}
                    style={{ animationDelay: `${index * 40}ms`, animationFillMode: 'both' }}
                    className="flex items-center gap-4 p-4 bg-card btn-brutal hover:border-primary    transition-all duration-300 cursor-pointer active:scale-[98%] animate-fade-in"
                  >
                    <div className="flex-shrink-0 text-center">
                      <div className="flex gap-0.5 justify-center">
                        {word.character.split('').map((char, i) => (
                          <span key={i} className="text-2xl sm:text-3xl font-bold text-text-primary">{char}</span>
                        ))}
                      </div>
                      <div className="text-xs text-primary mt-1">{word.pinyin}</div>
                    </div>
                    <div
                      className="flex-1 text-text-secondary text-sm sm:text-base line-clamp-2"
                      title={word.english_definition || 'No definition available'}
                    >
                      {cleanDefinition(word.english_definition) || 'No definition available'}
                    </div>
                    <button
                      onClick={(e) => removeFavorite(word.id, e)}
                      disabled={removingFav === word.id}
                      className="flex-shrink-0 p-2 text-text-secondary hover:text-rose-500 transition-colors disabled:opacity-50"
                      title="Remove from favorites"
                    >
                      <HeartIcon filled className="w-5 h-5 text-rose-500" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* 2. CUSTOM LISTS PANEL */}
        {activeTab === 'lists' && !selectedList && (
          <>
            {loadingLists && (
              <div className="flex flex-col gap-3">
                {[1, 2].map((i) => (
                  <div key={i} className="bg-card btn-brutal p-5 skeleton h-20" />
                ))}
              </div>
            )}

            {listsError && (
              <div className="text-center py-12 text-rose-500">
                <p>Could not fetch custom lists. Please reload.</p>
              </div>
            )}

            {!loadingLists && !listsError && lists.length === 0 && (
              <div className="text-center py-12 bg-card btn-brutal border border-border/30 rounded-xl text-text-secondary p-6">
                <svg className="w-12 h-12 mx-auto mb-3 text-border" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <p className="text-base font-bold mb-1">No custom lists yet</p>
                <p className="text-xs">Create custom lists from any word page to organize your vocabulary.</p>
              </div>
            )}

            {!loadingLists && !listsError && lists.length > 0 && (
              <div className="flex flex-col gap-3">
                {lists.map((list, index) => (
                  <div
                    key={list.id}
                    onClick={() => handleViewList(list)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleViewList(list) } }}
                    style={{ animationDelay: `${index * 40}ms`, animationFillMode: 'both' }}
                    className="flex items-center justify-between p-5 bg-card btn-brutal hover:border-primary    transition-all duration-300 cursor-pointer active:scale-[98%] animate-fade-in"
                  >
                    <div className="flex-1 min-w-0 pr-4">
                      <div className="flex items-center gap-3">
                        <h3 className="text-base font-bold text-text-primary truncate">{list.name}</h3>
                        <span className="px-2 py-0.5 bg-primary/20 text-primary rounded-md text-[10px] font-bold">
                          {list.word_count} {list.word_count === 1 ? 'word' : 'words'}
                        </span>
                      </div>
                      {list.description && (
                        <p className="text-xs text-text-secondary truncate mt-1">{list.description}</p>
                      )}
                    </div>

                    <button
                      onClick={(e) => handleDeleteList(list.id, e)}
                      className="p-2 text-text-secondary hover:text-rose-500 transition-colors"
                      title="Delete List"
                    >
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* 3. LIST DETAIL WORDS PREVIEW */}
        {selectedList && (
          <>
            <div className="mb-4 bg-card btn-brutal border border-border/30 rounded-xl p-4">
              <h2 className="text-base font-bold text-text-primary">{selectedList.name}</h2>
              {selectedList.description && (
                <p className="text-xs text-text-secondary mt-1">{selectedList.description}</p>
              )}
            </div>

            {loadingListWords && (
              <div className="flex flex-col gap-3">
                {[1, 2].map((i) => (
                  <div key={i} className="bg-card btn-brutal p-5 skeleton h-20" />
                ))}
              </div>
            )}

            {!loadingListWords && listWords.length === 0 && (
              <div className="text-center py-12 text-text-secondary">
                <p className="text-sm">This list is empty.</p>
                <p className="text-xs mt-1">Add words from search or HSK pages.</p>
              </div>
            )}

            {!loadingListWords && listWords.length > 0 && (
              <div className="flex flex-col gap-3 animate-fade-in">
                {listWords.map((word, index) => (
                  <div
                    key={word.id}
                    onClick={() => navigate(`/word/${word.id}`)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/word/${word.id}`) } }}
                    role="button"
                    tabIndex={0}
                    style={{ animationDelay: `${index * 40}ms`, animationFillMode: 'both' }}
                    className="flex items-center gap-4 p-4 bg-card btn-brutal hover:border-primary    transition-all duration-300 cursor-pointer active:scale-[98%]"
                  >
                    <div className="flex-shrink-0 text-center">
                      <div className="flex gap-0.5 justify-center">
                        {word.character.split('').map((char, i) => (
                          <span key={i} className="text-2xl sm:text-3xl font-bold text-text-primary">{char}</span>
                        ))}
                      </div>
                      <div className="text-xs text-primary mt-1">{word.pinyin}</div>
                    </div>
                    <div
                      className="flex-1 text-text-secondary text-sm sm:text-base line-clamp-2"
                      title={word.english_definition || 'No definition available'}
                    >
                      {cleanDefinition(word.english_definition) || 'No definition available'}
                    </div>
                    <button
                      onClick={(e) => handleRemoveWordFromList(word.id, e)}
                      className="flex-shrink-0 p-2 text-text-secondary hover:text-rose-500 transition-colors"
                      title="Remove from list"
                    >
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

      </div>
    </div>
  )
}

export default FavoritesPage
