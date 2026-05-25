import { useState, useEffect, useCallback, useRef } from 'react'
import API_BASE, { fetchWithTimeout } from '../api'

export function useWordFavorite(word, user, showToast) {
  const [isFavorite, setIsFavorite] = useState(false)
  const [favoriteLoading, setFavoriteLoading] = useState(false)
  const mountedRef = useRef(true)
  const stateRef = useRef({ isFavorite: false })

  useEffect(() => {
    stateRef.current.isFavorite = isFavorite
  }, [isFavorite])

  useEffect(() => {
    if (!word || !user) return
    let cancelled = false
    mountedRef.current = true
    fetchWithTimeout(`${API_BASE}/api/favorites/${word.id}`, {
      credentials: 'include',
    })
      .then((res) => {
        if (!res.ok) throw new Error('failed')
        return res.json()
      })
      .then((data) => {
        if (!cancelled) {
          setIsFavorite(data.isFavorite)
          stateRef.current.isFavorite = data.isFavorite
        }
      })
      .catch(() => {
        if (!cancelled) setIsFavorite(false)
      })
    return () => { cancelled = true; mountedRef.current = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [word?.id, user])

  const toggleFavorite = useCallback(async (navigate) => {
    if (!user || favoriteLoading) {
      if (!user) navigate('/login')
      return
    }
    setFavoriteLoading(true)
    const currentlyFav = stateRef.current.isFavorite
    const method = currentlyFav ? 'DELETE' : 'POST'
    try {
      const res = await fetchWithTimeout(`${API_BASE}/api/favorites/${word.id}`, {
        method,
        credentials: 'include',
      })
      if (res.ok && mountedRef.current) {
        const newFav = !currentlyFav
        setIsFavorite(newFav)
        stateRef.current.isFavorite = newFav
        showToast(newFav ? 'Added to favorites' : 'Removed from favorites')
      }
    } catch (err) {
      console.error('Failed to update favorites:', err)
      showToast('Failed to update favorites')
    } finally {
      if (mountedRef.current) setFavoriteLoading(false)
    }
  }, [user, favoriteLoading, word?.id, showToast])

  return { isFavorite, favoriteLoading, toggleFavorite }
}
