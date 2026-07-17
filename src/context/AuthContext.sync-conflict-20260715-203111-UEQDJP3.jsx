/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useMemo } from 'react'
import API_BASE, { fetchWithTimeout } from '../api'
import Spinner from '../components/Spinner'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    let cancelled = false

    fetchWithTimeout(`${API_BASE}/api/me`, { credentials: 'include' })
      .then((res) => {
        if (cancelled) return
        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            throw new Error('not authenticated')
          }
          throw new Error('server error')
        }
        return res.json()
      })
      .then((data) => {
        if (cancelled) return
        if (data) setUser({ id: data.id, email: data.email, display_name: data.display_name, is_admin: data.is_admin === 1 })
      })
      .catch((err) => {
        if (cancelled) return
        setUser(null)
      })
      .finally(() => {
        if (!cancelled) setInitialized(true)
      })

    return () => { cancelled = true }
  }, [])

  const login = (email, id = null, display_name = null, is_admin = false) => {
    setUser({ id, email, display_name, is_admin: is_admin === 1 || is_admin === true })
  }

  const logout = async () => {
    try {
      await fetchWithTimeout(`${API_BASE}/api/logout`, { method: 'POST', credentials: 'include' })
    } catch {
      // ignore
    }
    setUser(null)
  }

  const updateUser = (fields) => setUser((u) => (u ? { ...u, ...fields } : u))

  const contextValue = useMemo(() => ({
    user, initialized, login, logout, updateUser
  }), [user, initialized])

  if (!initialized) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Spinner size={40} />
      </div>
    )
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
