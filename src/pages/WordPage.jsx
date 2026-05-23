import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import HanziWriter from 'hanzi-writer'
import Navbar from '../components/Navbar'
import { useAuth } from '../context/AuthContext'
import API_BASE, { fetchWithTimeout } from '../api'

const speechSupported = typeof window !== 'undefined' && 'speechSynthesis' in window

const HANZI_CACHE_MAX = 200
const hanziDataCache = new Map()

function WordPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [word, setWord] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isFavorite, setIsFavorite] = useState(false)
  const [favoriteLoading, setFavoriteLoading] = useState(false)
  const [toast, setToast] = useState(null)
  const [supportedChars, setSupportedChars] = useState({})
  const [listDropdownOpen, setListDropdownOpen] = useState(false)
  const [lists, setLists] = useState([])
  const [listsLoading, setListsLoading] = useState(false)
  const [newListName, setNewListName] = useState('')
  const [addingToList, setAddingToList] = useState(false)
  const [inDeck, setInDeck] = useState(false)
  const [addingToDeck, setAddingToDeck] = useState(false)
  const writerRefs = useRef({})
  const writersRef = useRef({})
  const strokeCountsRef = useRef({})
  const dropdownRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    const abortController = new AbortController()
    setLoading(true)
    setNotFound(false)
    setSupportedChars({})
    setIsFavorite(false)
    fetchWithTimeout(`${API_BASE}/api/word/${id}`, { signal: abortController.signal })
      .then((res) => {
        if (!res.ok) throw new Error('not found')
        return res.json()
      })
      .then((data) => {
        if (!cancelled) {
          setWord(data)
          setLoading(false)
        }
      })
      .catch((err) => {
        if (err.name === 'AbortError') return
        if (!cancelled) {
          setNotFound(true)
          setLoading(false)
        }
      })
    return () => { cancelled = true; abortController.abort() }
  }, [id])

  useEffect(() => {
    if (!listDropdownOpen) return
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setListDropdownOpen(false)
        setNewListName('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [listDropdownOpen])

  useEffect(() => {
    if (!word || !user) return
    let cancelled = false
    fetchWithTimeout(`${API_BASE}/api/favorites/${word.id}`, {
      credentials: 'include',
    })
      .then((res) => {
        if (!cancelled) {
          if (res.ok) {
            setIsFavorite(true)
          } else if (res.status === 404) {
            setIsFavorite(false)
          }
        }
      })
      .catch(() => {
        if (!cancelled) setIsFavorite(false)
      })
    fetchWithTimeout(`${API_BASE}/api/flashcards/indeck/${word.id}`, {
      credentials: 'include',
    })
      .then((res) => {
        if (!res.ok) throw new Error('failed to check deck status')
        return res.json()
      })
      .then((data) => {
        if (!cancelled) setInDeck(data.inDeck)
      })
      .catch(() => {
        if (!cancelled) console.error('Failed to check deck status')
      })
    return () => { cancelled = true }
  }, [word, user])

  useEffect(() => {
    if (!word) return

    const chars = word.character.split('')
    const newSupported = {}
    const newWriters = {}

    chars.forEach((char, i) => {
      const container = writerRefs.current[i]
      if (!container) return

      container.innerHTML = ''

      const initWriter = () => {
        const rect = container.getBoundingClientRect()
        const size = Math.round(Math.min(rect.width, rect.height)) || 120

        try {
          const writer = HanziWriter.create(container, char, {
            width: size,
            height: size,
            padding: 5,
            showOutline: true,
            strokeAnimationSpeed: 1,
            delayBetweenStrokes: 300,
            strokeColor: '#c0392b',
            outlineColor: '#2a2a2a',
            drawingColor: '#c0392b',
            radicalColor: '#e74c3c',
            showCharacter: false,
          })

          newWriters[i] = writer
          newSupported[i] = true
        } catch (e) {
          newSupported[i] = false
        }
      }

      requestAnimationFrame(initWriter)
    })

    writersRef.current = newWriters
    setSupportedChars(newSupported)

    const cancelledLoads = new Set()

    chars.forEach((char, i) => {
      if (hanziDataCache.has(char)) {
        strokeCountsRef.current[i] = hanziDataCache.get(char).strokes.length
        return
      }
      HanziWriter.loadCharacterData(char).then((data) => {
        if (cancelledLoads.has(i)) return
        if (hanziDataCache.size >= HANZI_CACHE_MAX) {
          const firstKey = hanziDataCache.keys().next().value
          hanziDataCache.delete(firstKey)
        }
        hanziDataCache.set(char, data)
        strokeCountsRef.current[i] = data.strokes.length
      }).catch((err) => {
        if (cancelledLoads.has(i)) return
        console.error(`Failed to load character data for ${char}:`, err)
        strokeCountsRef.current[i] = 5
        setSupportedChars((prev) => ({ ...prev, [i]: false }))
      })
    })

    return () => {
      cancelledLoads.clear()
      chars.forEach((_, i) => cancelledLoads.add(i))
      Object.values(writersRef.current).forEach((writer) => {
        if (writer) writer.cancelAnimation()
      })
      writersRef.current = {}
      strokeCountsRef.current = {}
    }
  }, [word])

  const showToast = (message) => {
    setToast(message)
    setTimeout(() => setToast(null), 2500)
  }

  const toggleFavorite = async () => {
    if (!user || favoriteLoading) {
      if (!user) navigate('/login')
      return
    }
    setFavoriteLoading(true)
    const method = isFavorite ? 'DELETE' : 'POST'
    try {
      const res = await fetchWithTimeout(`${API_BASE}/api/favorites/${word.id}`, {
        method,
        credentials: 'include',
      })
      if (res.ok) {
        setIsFavorite(!isFavorite)
        showToast(isFavorite ? 'Removed from favorites' : 'Added to favorites')
      } else if (res.status === 409) {
        setIsFavorite(true)
        showToast('Already in favorites')
      } else if (res.status === 404 && !isFavorite) {
        setIsFavorite(false)
        showToast('Not in favorites')
      }
    } catch (e) {
      showToast('Failed to update favorites')
    } finally {
      setFavoriteLoading(false)
    }
  }

  const speak = () => {
    if (!speechSupported || !word) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(word.character)
    utterance.lang = 'zh-CN'
    utterance.rate = 0.8
    utterance.onstart = () => setIsSpeaking(true)
    utterance.onend = () => setIsSpeaking(false)
    utterance.onerror = () => setIsSpeaking(false)
    window.speechSynthesis.speak(utterance)
  }

  const animateCharacterWithPromise = (writer, char) => {
    return new Promise((resolve) => {
      const strokeCount = strokeCountsRef.current[char] || 5
      const duration = strokeCount * 300 + 200
      writer.animateCharacter()
      setTimeout(resolve, duration)
    })
  }

  const playAll = async () => {
    const chars = word.character.split('')
    for (let i = 0; i < chars.length; i++) {
      if (writersRef.current[i] && supportedChars[i]) {
        await animateCharacterWithPromise(writersRef.current[i], i)
        if (i < chars.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 400))
        }
      }
    }
  }

  const pauseAll = () => {
    Object.values(writersRef.current).forEach((writer) => {
      if (writer) writer.pauseAnimation()
    })
  }

  const replayAll = () => {
    const chars = word.character.split('')
    chars.forEach((_, i) => {
      if (writersRef.current[i] && supportedChars[i]) {
        writersRef.current[i].animateCharacter()
      }
    })
  }

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
    } catch (e) {
      showToast('Failed to load lists')
    }
    setListsLoading(false)
  }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
     } catch (e) {
       showToast('Failed to load lists')
     }
     setListsLoading(false)
   }
    } catch (e) {
      showToast('Failed to load lists')
    }
    setListsLoading(false)
  }

  const openListDropdown = () => {
    if (!user) {
      navigate('/login')
      return
    }
    setListDropdownOpen(true)
    setLists([])
    fetchLists()
  }

  const createList = async () => {
    if (!newListName.trim()) return
    try {
      const res = await fetchWithTimeout(`${API_BASE}/api/lists`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ name: newListName.trim() }),
      })
      if (res.ok) {
        const newList = await res.json()
        setLists((prev) => [...prev, newList])
        setNewListName('')
        showToast(`List "${newList.name}" created`)
      }
    } catch (e) {
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
        setListDropdownOpen(false)
        setNewListName('')
      } else {
        const errData = await res.json().catch(() => ({}))
        showToast(errData.error || 'Failed to add word')
      }
    } catch (e) {
      showToast('Failed to add word to list')
    }
    setAddingToList(false)
  }

  const addToDeck = async () => {
    if (!user) {
      navigate('/login')
      return
    }
    if (inDeck) {
      showToast('Already in your deck')
      return
    }
    setAddingToDeck(true)
    try {
      const res = await fetchWithTimeout(`${API_BASE}/api/flashcards/${word.id}/init`, {
        method: 'POST',
        credentials: 'include',
      })
      if (res.ok) {
        const data = await res.json()
        if (data.alreadyInDeck) {
          setInDeck(true)
          showToast('Already in your deck')
        } else {
          setInDeck(true)
          showToast('Added to flashcard deck')
        }
      }
    } catch (e) {
      showToast('Failed to add to deck')
    }
    setAddingToDeck(false)
  }

  const removeFromDeck = async () => {
    if (!user) return
    setAddingToDeck(true)
    try {
      const res = await fetchWithTimeout(`${API_BASE}/api/flashcards/${word.id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (res.ok) {
        setInDeck(false)
        showToast('Removed from deck')
      }
    } catch (e) {
      showToast('Failed to remove from deck')
    }
    setAddingToDeck(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
          <div className="flex flex-col items-center space-y-4 mb-8">
            <div className="skeleton w-24 h-24 rounded-xl" />
            <div className="skeleton w-40 h-8" />
            <div className="skeleton w-16 h-6 rounded-full" />
          </div>
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="skeleton w-20 h-4 mb-3" />
            <div className="skeleton w-48 h-8" />
          </div>
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="skeleton w-24 h-4 mb-3" />
            <div className="skeleton w-full h-6" />
          </div>
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="skeleton w-28 h-4 mb-4" />
            <div className="flex gap-4 justify-center">
              <div className="skeleton w-28 h-28 rounded-lg" />
              <div className="skeleton w-28 h-28 rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex flex-col items-center justify-center py-20 px-4">
          <h1 className="text-8xl font-bold text-primary mb-4">404</h1>
          <p className="text-2xl text-text-primary mb-2">Word not found</p>
          <p className="text-text-secondary mb-8 text-center">The word you are looking for doesn't exist or has been moved.</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-primary text-text-primary rounded-lg hover:bg-primary-hover transition-all hover:scale-105 font-medium"
          >
            Go Home
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-8">
        <button
          onClick={() => navigate(-1)}
          className="mb-4 px-3 py-2 text-sm text-text-secondary border border-border rounded-lg hover:text-primary hover:border-primary transition-colors flex items-center gap-1.5"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back
        </button>
        {/* Toast notification */}
        {toast && (
          <div className="fixed top-28 left-1/2 -translate-x-1/2 z-[55] px-5 py-2.5 bg-card border border-border rounded-lg shadow-lg text-text-primary text-sm animate-fade-in">
            {toast}
          </div>
        )}

        {/* Character display */}
        <div className="text-center mb-8">
          <div className="flex gap-1 sm:gap-2 justify-center flex-wrap mb-3">
            {word.character.split('').map((char, i) => (
              <button
                key={i}
                onClick={() => navigate(`/search?q=${encodeURIComponent(char)}`)}
                aria-label={`Search for character ${char}`}
                className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-text-primary hover:text-primary transition-all hover:scale-110 cursor-pointer leading-normal"
              >
                {char}
              </button>
            ))}
          </div>

          {/* Favorite button */}
          <button
            onClick={toggleFavorite}
            disabled={favoriteLoading}
            className="mb-3 inline-flex items-center justify-center w-12 h-12 rounded-full transition-all hover:scale-110 active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
            title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            {favoriteLoading ? (
              <div className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-8 h-8"
                viewBox="0 0 24 24"
                fill={isFavorite ? '#c0392b' : 'none'}
                stroke={isFavorite ? '#c0392b' : 'currentColor'}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            )}
          </button>

          {/* Add to list button */}
          <div className="relative mb-3 inline-block" ref={dropdownRef}>
            <button
              onClick={openListDropdown}
              className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-surface border border-border text-text-secondary hover:text-primary hover:border-primary transition-all hover:scale-110"
              title="Add to list"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                <polyline points="17 21 17 13 7 13 7 21" />
                <polyline points="7 3 7 8 15 8" />
              </svg>
            </button>

            {listDropdownOpen && (
              <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-full max-w-72 bg-card border border-border rounded-xl shadow-2xl z-50 overflow-hidden">
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

          {/* Study this word button */}
          <button
            onClick={inDeck ? removeFromDeck : addToDeck}
            disabled={addingToDeck}
            className={`mb-3 inline-flex items-center justify-center w-12 h-12 rounded-full border transition-all hover:scale-110 disabled:opacity-50 ${
              inDeck
                ? 'bg-primary/20 border-primary text-primary hover:bg-primary/30'
                : 'bg-surface border-border text-text-secondary hover:text-primary hover:border-primary'
            }`}
            title={inDeck ? 'Remove from deck' : 'Study this word'}
          >
            {addingToDeck ? (
              <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : inDeck ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="M12 8v8" />
                <path d="M8 12h8" />
              </svg>
            )}
          </button>

          {/* Pinyin with speaker button */}
          <div className="flex items-center justify-center gap-3 mb-3">
            <p className="text-2xl text-primary">{word.pinyin}</p>
            {speechSupported ? (
              <button
                onClick={speak}
                className={`flex items-center justify-center w-10 h-10 rounded-full transition-all ${
                  isSpeaking
                    ? 'bg-primary text-text-primary scale-110 animate-pulse'
                    : 'bg-surface text-text-secondary hover:text-primary hover:border-primary border border-border'
                }`}
                title="Listen to pronunciation"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  {isSpeaking ? (
                    <>
                      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                    </>
                  ) : (
                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                  )}
                </svg>
              </button>
            ) : (
              <div
                className="flex items-center justify-center w-10 h-10 rounded-full bg-surface border border-border text-text-secondary opacity-50 cursor-not-allowed"
                title="Speech not supported in this browser"
                tabIndex={-1}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <line x1="23" y1="9" x2="17" y2="15" />
                  <line x1="17" y1="9" x2="23" y2="15" />
                </svg>
              </div>
            )}
          </div>

          {word.hsk_level && (
            <span className="inline-block px-3 py-1 bg-primary bg-opacity-20 text-primary rounded-full text-sm font-semibold">
              HSK {word.hsk_level}
            </span>
          )}
        </div>

        {/* Definition */}
        <div className="bg-card border border-border rounded-xl p-4 sm:p-5 mb-4 hover:border-primary/50 transition-colors">
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-2">Definition</h2>
          <p className="text-lg sm:text-xl text-text-primary">{word.english_definition || 'No definition available'}</p>
        </div>

        {/* Stroke order animation */}
        <div className="bg-card border border-border rounded-xl p-4 sm:p-5 mb-4">
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">Stroke Order</h2>

          <div className="flex flex-wrap gap-2 sm:gap-4 justify-center mb-4">
            {word.character.split('').map((char, i) => (
              <div key={i} className="flex flex-col items-center">
                <div
                  ref={(el) => (writerRefs.current[i] = el)}
                  className="w-20 h-20 sm:w-28 sm:h-28 md:w-36 md:h-36 bg-surface rounded-lg border border-border overflow-hidden"
                />
                {!supportedChars[i] && supportedChars[i] !== undefined && (
                  <p className="text-xs text-text-secondary mt-1">Not available</p>
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-center gap-2 sm:gap-3">
            <button
              onClick={playAll}
              className="px-4 sm:px-5 py-2 bg-primary text-text-primary rounded-lg hover:bg-primary-hover transition-all hover:scale-105 active:scale-95 font-medium flex items-center gap-2 text-sm sm:text-base"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              Play
            </button>
            <button
              onClick={pauseAll}
              className="px-4 sm:px-5 py-2 bg-surface text-text-primary border border-border rounded-lg hover:border-primary transition-all hover:scale-105 active:scale-95 font-medium flex items-center gap-2 text-sm sm:text-base"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16" />
                <rect x="14" y="4" width="4" height="16" />
              </svg>
              Pause
            </button>
            <button
              onClick={replayAll}
              className="px-4 sm:px-5 py-2 bg-surface text-text-primary border border-border rounded-lg hover:border-primary transition-all hover:scale-105 active:scale-95 font-medium flex items-center gap-2 text-sm sm:text-base"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="1 4 1 10 7 10" />
                <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
              </svg>
              Replay
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default WordPage
