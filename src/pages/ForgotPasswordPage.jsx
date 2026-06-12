import { useState } from 'react'
import { Link } from 'react-router-dom'
import API_BASE, { fetchWithTimeout } from '../api'

function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)
    try {
      const res = await fetchWithTimeout(`${API_BASE}/api/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email }),
      })
      let data
      try {
        data = await res.json()
      } catch {
        data = {}
      }
      if (!res.ok) {
        setError(data.error || 'Failed to send reset link')
        return
      }
      setSuccess(data.message)
    } catch (err) {
      console.error('Forgot password request failed:', err)
      setError('Server error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background relative z-10 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold mb-3 text-text-primary">Reset Password</h1>
          <p className="text-text-secondary">Enter your email to receive a reset link</p>
        </div>

        <div className="bg-card btn-brutal p-8  shadow-primary/20">
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="email" className="block text-sm font-medium text-text-secondary mb-1.5">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full px-4 py-2.5 bg-surface btn-brutal text-text-primary outline-none focus:border-primary transition-colors placeholder:text-text-secondary"
                placeholder="you@example.com"
              />
            </div>

            {error && (
              <div role="alert" className="mb-4 px-4 py-2.5 bg-red-500/10 border border-red-500 border-opacity-30 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            {success && (
              <div role="status" className="mb-4 px-4 py-2.5 bg-green-500/10 border border-green-500 border-opacity-30 rounded-lg text-green-400 text-sm">
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-primary text-text-primary font-medium rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>
        </div>

        <p className="text-center text-text-secondary mt-6">
          Remember your password?{' '}
          <Link to="/login" className="text-primary hover:text-primary-hover font-medium">
            Log in
          </Link>
        </p>
      </div>
    </div>
  )
}

export default ForgotPasswordPage
