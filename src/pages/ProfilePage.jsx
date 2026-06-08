import { useState, useEffect, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { useAuth } from '../context/AuthContext'
import API_BASE, { fetchWithTimeout } from '../api'
import { HeartIcon, FlashcardIcon, ClockIcon, ChevronRightIcon, PencilIcon } from '../components/Icons'

function ProfilePage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [profileError, setProfileError] = useState(false)
  const [loading, setLoading] = useState(true)

  const fetchProfile = useCallback(async () => {
    setProfileError(false)
    setLoading(true)
    try {
      const res = await fetchWithTimeout(`${API_BASE}/api/profile`, {
        credentials: 'include',
      })
      if (res.ok) {
        const data = await res.json()
        setProfile(data)
      } else {
        setProfileError(true)
      }
    } catch (err) {
      console.error('Failed to fetch profile:', err)
      setProfileError(true)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  if (!user) return null

  const displayName = profile?.display_name || user.email?.split('@')[0] || 'User'

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-text-primary mb-1">{displayName}</h1>
          <p className="text-text-secondary">{user.email}</p>
        </div>

        <Link
          to="/profile/edit"
          className="flex items-center justify-between w-full px-4 py-3 bg-card border border-border rounded-xl mb-6 hover:bg-surface transition-colors no-underline"
        >
          <div className="flex items-center gap-3">
            <PencilIcon className="w-5 h-5 text-text-secondary" />
            <span className="text-text-primary text-sm font-medium">Edit Profile</span>
          </div>
          <ChevronRightIcon className="w-4 h-4 text-text-secondary" />
        </Link>

        {profileError ? (
          <div className="bg-card border border-border rounded-xl p-6 mb-6 text-center">
            <p className="text-red-400 mb-3">Failed to load profile stats</p>
            <button
              onClick={fetchProfile}
              className="px-4 py-2 bg-primary text-text-primary rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors"
            >
              Retry
            </button>
          </div>
        ) : loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-4">
                <div className="skeleton h-4 w-16 mb-2" />
                <div className="skeleton h-6 w-12" />
              </div>
            ))}
          </div>
        ) : profile && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <ClockIcon className="w-4 h-4 text-text-secondary" />
                <p className="text-xs text-text-secondary font-medium uppercase tracking-wide">Joined</p>
              </div>
              <p className="text-text-primary font-semibold">
                {new Date(profile.created_at).toLocaleDateString(navigator.language || 'en-CA')}
              </p>
            </div>
            <div
              onClick={() => navigate('/favorites')}
              onKeyDown={(e) => { if (e.key === 'Enter') navigate('/favorites') }}
              role="button"
              tabIndex={0}
              className="bg-card border border-border rounded-xl p-4 hover:bg-surface cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-2 mb-1">
                <HeartIcon className="w-4 h-4 text-primary" />
                <p className="text-xs text-text-secondary font-medium uppercase tracking-wide">Favorites</p>
              </div>
              <p className="text-text-primary font-semibold">{profile.favorites_count}</p>
            </div>
            <div
              onClick={() => navigate('/flashcards')}
              onKeyDown={(e) => { if (e.key === 'Enter') navigate('/flashcards') }}
              role="button"
              tabIndex={0}
              className="bg-card border border-border rounded-xl p-4 hover:bg-surface cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-2 mb-1">
                <FlashcardIcon className="w-4 h-4 text-primary" />
                <p className="text-xs text-text-secondary font-medium uppercase tracking-wide">Flashcards</p>
              </div>
              <p className="text-text-primary font-semibold">{profile.flashcards_reviewed}</p>
            </div>
          </div>
        )}

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <Link
            to="/favorites"
            className="flex items-center justify-between px-5 py-4 hover:bg-surface transition-colors no-underline border-b border-border"
          >
            <div className="flex items-center gap-3">
              <HeartIcon className="w-5 h-5 text-primary" />
              <span className="text-text-primary text-sm font-medium">My Favorites</span>
            </div>
            <ChevronRightIcon className="w-4 h-4 text-text-secondary" />
          </Link>
          <Link
            to="/flashcards"
            className="flex items-center justify-between px-5 py-4 hover:bg-surface transition-colors no-underline border-b border-border"
          >
            <div className="flex items-center gap-3">
              <FlashcardIcon className="w-5 h-5 text-primary" />
              <span className="text-text-primary text-sm font-medium">Flashcards</span>
            </div>
            <ChevronRightIcon className="w-4 h-4 text-text-secondary" />
          </Link>
          <Link
            to="/profile/change-password"
            className="flex items-center justify-between px-5 py-4 hover:bg-surface transition-colors no-underline"
          >
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span className="text-text-primary text-sm font-medium">Change Password</span>
            </div>
            <ChevronRightIcon className="w-4 h-4 text-text-secondary" />
          </Link>
        </div>
      </div>
    </div>
  )
}

export default ProfilePage
