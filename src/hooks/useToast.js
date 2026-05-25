import { useState, useRef, useCallback, useEffect } from 'react'

export function useToast() {
  const [toast, setToast] = useState(null)
  const toastTimerRef = useRef(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    }
  }, [])

  const showToast = useCallback((message) => {
    setToast(message)
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    toastTimerRef.current = setTimeout(() => {
      if (mountedRef.current) setToast(null)
    }, 2500)
  }, [])

  const cleanupToast = useCallback(() => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
  }, [])

  return { toast, showToast, cleanupToast }
}
