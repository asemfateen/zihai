/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect } from 'react'
import API_BASE, { fetchWithTimeout } from '../api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    fetchWithTimeout(`${API_BASE}/api/me`, { credentials: 'include' })
      .then((res) => {
        if (!res.ok) throw new Error('not authenticated')
        return res.json()
      })
      .then((data) => {
        setUser({ id: data.id, email: data.email })
      })
      .catch(() => {
        setUser(null)
      })
      .finally(() => {
        setInitialized(true)
      })
  }, [])

  const login = (email, id = null) => {
    setUser({ id, email })
  }

  const logout = async () => {
    try {
      await fetch(`${API_BASE}/api/logout`, { method: 'POST', credentials: 'include' })
    } catch {
      // ignore
    }
    setUser(null)
  }

  if (!initialized) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 40, height: 40, border: '3px solid #2a2a2a', borderTopColor: '#c0392b', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      </div>
    )
  }

  return (
    <AuthContext.Provider value={{ user, initialized, login, logout }}>
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
