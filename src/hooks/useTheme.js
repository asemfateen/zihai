import { useState, useEffect } from 'react'

function getInitialDark() {
  try {
    const stored = localStorage.getItem('theme')
    if (stored) return stored === 'dark'
  } catch {
    // localStorage unavailable (e.g., Safari private browsing)
  }
  return document.documentElement.classList.contains('dark')
}

export function useTheme() {
  const [dark, setDark] = useState(getInitialDark)

  useEffect(() => {
    document.documentElement.classList.toggle('light', !dark)
    document.documentElement.classList.toggle('dark', dark)
    try {
      localStorage.setItem('theme', dark ? 'dark' : 'light')
    } catch {
      // localStorage unavailable
    }
  }, [dark])

  useEffect(() => {
    let mediaQuery
    try {
      mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    } catch {
      return
    }
    const handler = () => {
      try {
        if (!localStorage.getItem('theme')) {
          setDark(mediaQuery.matches)
        }
      } catch {
        setDark(mediaQuery.matches)
      }
    }
    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  const toggle = () => setDark((prev) => !prev)

  return { dark, toggle }
}
