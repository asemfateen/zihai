import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { useAuth } from '../context/AuthContext'
import API_BASE, { fetchWithTimeout } from '../api'
import { ChevronLeftIcon } from '../components/Icons'

function ProfileEditPage() {
  const navigate = useNavigate()
  const { user, updateUser } = useAuth()
  const [displayName, setDisplayName] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saveSuccess, setSaveSuccess] = useState(false)

  const [profile, setProfile] = useState(null)
  const [loadingProfile, setLoadingProfile] = useState(true)

  useEffect(() => {
    if (!user) return
    fetchWithTimeout(`${API_BASE}/api/profile`, { credentials: 'include' })
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data) {
          setProfile(data)
          setDisplayName(data.display_name || '')
        }
      })
      .catch(() => {})
      .finally(() => setLoadingProfile(false))
  }, [user])

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setSaveError('')
    setSaveSuccess(false)
    setSaving(true)
    try {
      const res = await fetchWithTimeout(`${API_BASE}/api/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ display_name: displayName.trim() }),
      })
      if (res.ok) {
        const data = await res.json()
        updateUser({ display_name: data.display_name })
        setSaveSuccess(true)
      } else {
        const data = await res.json().catch(() => ({}))
        setSaveError(data.error || 'Failed to save')
      }
    } catch (err) {
      setSaveError('Server error')
    }
    setSaving(false)
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-transparent relative z-10">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-8">
        <button
          onClick={() => navigate('/profile')}
          className="mb-6 px-3 py-2 text-sm text-text-secondary border border-border/50 rounded-lg hover:text-primary hover:border-primary transition-colors flex items-center gap-1.5"
        >
          <ChevronLeftIcon className="w-4 h-4" />
          Back to Profile
        </button>

        <h1 className="text-2xl font-bold text-text-primary mb-6">Edit Profile</h1>

        {loadingProfile ? (
          <div className="space-y-4">
            <div className="skeleton h-12 w-full" />
            <div className="skeleton h-10 w-24" />
          </div>
        ) : (
          <form onSubmit={handleSaveProfile} className="mb-10">
            <div className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-xl p-5 mb-4">
              <label className="block text-sm font-medium text-text-secondary mb-2">Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your display name"
                maxLength={50}
                className="w-full px-3 py-2 bg-surface/80 backdrop-blur-xl border border-border/50 rounded-lg text-sm text-text-primary placeholder-text-secondary focus:outline-none focus:border-primary"
              />
              <p className="text-xs text-text-secondary mt-1">Maximum 50 characters</p>
            </div>

            {saveError && (
              <p className="text-red-400 text-sm mb-3">{saveError}</p>
            )}
            {saveSuccess && (
              <p className="text-green-400 text-sm mb-3">Profile saved successfully</p>
            )}

            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 bg-primary text-text-primary rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        )}

        <div className="border-t border-border/50 pt-8">
          <button
            onClick={() => navigate('/profile/change-password')}
            className="flex items-center justify-between w-full px-4 py-3 bg-card/80 backdrop-blur-xl border border-border/50 rounded-xl hover:bg-surface/80 backdrop-blur-xl transition-colors"
          >
            <span className="text-text-primary text-sm font-medium">Change Password</span>
            <svg className="w-4 h-4 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

export default ProfileEditPage
