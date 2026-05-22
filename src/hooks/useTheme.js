import { useState, useEffect } from 'react'

export function useTheme() {
  const [dark, setDark] = useState(() => {
    try {
      const stored = localStorage.getItem('theme')
      if (stored) return stored === 'dark'
    } catch {
      // localStorage unavailable (e.g., Safari private browsing)
    }
    return true
  })

  useEffect(() => {
    document.documentElement.classList.toggle('light', !dark)
    document.documentElement.classList.toggle('dark', dark)
    try {
      localStorage.setItem('theme', dark ? 'dark' : 'light')
    } catch {
      // localStorage unavailable
    }
  }, [dark])

  const toggle = () => setDark((prev) => !prev)

  return { dark, toggle }
}
