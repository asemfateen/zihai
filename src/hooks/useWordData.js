import { useState, useEffect, useRef } from 'react'
import API_BASE, { fetchWithTimeout } from '../api'

export function useWordData(id) {
  const [word, setWord] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    let cancelled = false
    const abortController = new AbortController()
    setLoading(true)
    setNotFound(false)
    setWord(null)

    fetchWithTimeout(`${API_BASE}/api/word/${id}`, { signal: abortController.signal })
      .then((res) => {
        if (cancelled) return
        if (!res.ok) throw new Error('not found')
        return res.json()
      })
      .then((data) => {
        if (!cancelled && data) {
          setWord(data)
          setLoading(false)
        }
      })
      .catch((err) => {
        if (cancelled || err.name === 'AbortError') return
        setNotFound(true)
        setLoading(false)
      })

    return () => {
      cancelled = true
      mountedRef.current = false
      abortController.abort()
    }
  }, [id])

  return { word, loading, notFound, mountedRef }
}
