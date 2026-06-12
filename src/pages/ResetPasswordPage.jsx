import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import API_BASE, { fetchWithTimeout } from '../api'
import { EyeIcon, EyeOffIcon } from '../components/Icons'

function ResetPasswordPage() {
  const { token } = useParams()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    try {
      const res = await fetchWithTimeout(`${API_BASE}/api/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ token, password }),
      })
      let data
      try {
        data = await res.json()
      } catch {
        data = {}
      }
      if (!res.ok) {
        setError(data.error || 'Failed to reset password')
        return
      }
      setSuccess('Password has been reset successfully!')
      setTimeout(() => navigate('/login'), 2500)
    } catch (err) {
      console.error('Password reset request failed:', err)
      setError('Server error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background relative z-10 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold mb-3 text-text-primary">Set New Password</h1>
          <p className="text-text-secondary">Choose a new password for your account</p>
        </div>

        <div className="bg-card btn-brutal p-8  shadow-primary/20">
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="password" className="block text-sm font-medium text-text-secondary mb-1.5">
                New Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
                className="w-full px-4 py-2.5 pr-12 bg-surface btn-brutal text-text-primary outline-none focus:border-primary transition-colors placeholder:text-text-secondary"
                placeholder="At least 6 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-primary transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="mb-6">
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-text-secondary mb-1.5">
                Confirm New Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
                className="w-full px-4 py-2.5 bg-surface btn-brutal text-text-primary outline-none focus:border-primary transition-colors placeholder:text-text-secondary"
                placeholder="Re-enter your password"
              />
            </div>

            {error && (
              <div role="alert" className="mb-4 px-4 py-2.5 bg-red-500/10 border border-red-500 border-opacity-30 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            {success && (
              <div role="status" className="mb-4 px-4 py-2.5 bg-green-500/10 border border-green-500 border-opacity-30 rounded-lg text-green-400 text-sm">
                {success} Redirecting to login...
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !!success}
              className="w-full py-2.5 bg-primary text-text-primary font-medium rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Resetting...' : 'Reset Password'}
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

export default ResetPasswordPage
