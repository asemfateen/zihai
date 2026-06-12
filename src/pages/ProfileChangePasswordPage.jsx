import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { useAuth } from '../context/AuthContext'
import API_BASE, { fetchWithTimeout } from '../api'
import { ChevronLeftIcon } from '../components/Icons'

function ProfileChangePasswordPage() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changing, setChanging] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess(false)

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters')
      return
    }

    setChanging(true)
    try {
      const res = await fetchWithTimeout(`${API_BASE}/api/profile/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      })
      if (res.ok) {
        setSuccess(true)
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Failed to change password')
      }
    } catch {
      setError('Server error')
    }
    setChanging(false)
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-background relative z-10">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-8">
        <button
          onClick={() => navigate('/profile/edit')}
          className="mb-6 px-3 py-2 text-sm text-text-secondary btn-brutal hover:text-primary hover:border-primary transition-colors flex items-center gap-1.5"
        >
          <ChevronLeftIcon className="w-4 h-4" />
          Back to Edit Profile
        </button>

        <h1 className="text-2xl font-bold text-text-primary mb-6">Change Password</h1>

        <form onSubmit={handleSubmit} className="bg-card btn-brutal p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Current Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
              className="w-full px-3 py-2 bg-surface btn-brutal text-sm text-text-primary placeholder-text-secondary focus:outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 6 characters"
              className="w-full px-3 py-2 bg-surface btn-brutal text-sm text-text-primary placeholder-text-secondary focus:outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repeat new password"
              className="w-full px-3 py-2 bg-surface btn-brutal text-sm text-text-primary placeholder-text-secondary focus:outline-none focus:border-primary"
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}
          {success && (
            <p className="text-green-400 text-sm">Password changed successfully</p>
          )}

          <button
            type="submit"
            disabled={changing || !currentPassword || !newPassword || !confirmPassword}
            className="px-5 py-2.5 bg-primary text-text-primary rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors disabled:opacity-50"
          >
            {changing ? 'Changing...' : 'Change Password'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default ProfileChangePasswordPage
