import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import API_BASE, { fetchWithTimeout } from '../api'

function GoogleCallbackPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [error, setError] = useState('')
  const processedRef = useRef(false)

  useEffect(() => {
    if (processedRef.current) return
    processedRef.current = true

    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const errorParam = params.get('error')

    if (errorParam) {
      setError('Google login was cancelled')
      setTimeout(() => navigate('/login'), 3000)
      return
    }

    if (!code) {
      setError('No authorization code received')
      setTimeout(() => navigate('/login'), 3000)
      return
    }

    fetchWithTimeout(`${API_BASE}/api/auth/google/callback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ code }),
    })
      .then((res) => {
        if (!res.ok) throw new Error('Callback failed')
        return res.json()
      })
      .then((data) => {
        login(data.email, data.id)
        navigate('/')
      })
      .catch(() => {
        setError('Failed to complete Google login')
        setTimeout(() => navigate('/login'), 3000)
      })
  }, [navigate, login])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="text-center">
        {error ? (
          <>
            <p className="text-red-400 text-lg mb-2">{error}</p>
            <p className="text-text-secondary text-sm">Redirecting to login...</p>
          </>
        ) : (
          <>
            <div className="w-10 h-10 border-3 border-border border-t-primary rounded-full animate-spin mx-auto mb-4" />
            <p className="text-text-secondary">Completing Google login...</p>
          </>
        )}
      </div>
    </div>
  )
}

export default GoogleCallbackPage
