import { useState, useEffect, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import API_BASE, { fetchWithTimeout } from '../api'
import { HeartIcon, FlashcardIcon, ClockIcon, ChevronRightIcon, PencilIcon } from '../components/Icons'

function ProfilePage() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [profile, setProfile] = useState(null)
  const [profileError, setProfileError] = useState(false)
  const [loading, setLoading] = useState(true)

  const [stats, setStats] = useState(null)

  const fetchProfile = useCallback(async () => {
    setProfileError(false)
    setLoading(true)
    try {
      const [resProfile, resStats] = await Promise.all([
        fetchWithTimeout(`${API_BASE}/api/profile`, { credentials: 'include' }),
        fetchWithTimeout(`${API_BASE}/api/stats`, { credentials: 'include' })
      ])
      
      if (resProfile.ok && resStats.ok) {
        setProfile(await resProfile.json())
        setStats(await resStats.json())
      } else {
        setProfileError(true)
      }
    } catch (err) {
      console.error('Failed to fetch profile/stats:', err)
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
    <div className="min-h-screen bg-transparent relative z-10">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-text-primary mb-1">{displayName}</h1>
          <p className="text-text-secondary">{user.email}</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:auto-rows-[120px] mb-6">
          {/* Edit Profile */}
          <Link
            to="/profile/edit"
            className="col-span-2 md:col-span-4 bg-card/80 backdrop-blur-xl border border-border/50 rounded-3xl p-6 flex items-center justify-between hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 no-underline group animate-fade-in [animation-delay:100ms] min-h-[100px]"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-surface flex items-center justify-center text-text-secondary group-hover:scale-110 group-hover:text-primary transition-all">
                <PencilIcon className="w-6 h-6" />
              </div>
              <div>
                <span className="text-text-primary text-lg font-bold">Edit Profile</span>
                <p className="text-xs text-text-secondary mt-1">Update your personal details</p>
              </div>
            </div>
            <ChevronRightIcon className="w-5 h-5 text-text-secondary group-hover:text-primary transition-colors group-hover:translate-x-1" />
          </Link>

          {profileError ? (
            <div className="col-span-2 md:col-span-4 bg-card/80 backdrop-blur-xl border border-border/50 rounded-3xl p-6 text-center animate-fade-in [animation-delay:150ms]">
              <p className="text-red-400 mb-3">Failed to load profile stats</p>
              <button
                onClick={fetchProfile}
                className="px-6 py-2 bg-primary text-white rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:bg-primary-hover transition-all"
              >
                Retry
              </button>
            </div>
          ) : loading ? (
            <>
              {[1, 2, 3].map((i) => (
                <div key={i} className={`bg-card/80 backdrop-blur-xl border border-border/50 rounded-3xl p-6 animate-pulse ${i === 3 ? 'col-span-2 md:col-span-2' : 'col-span-1 md:col-span-1'}`} />
              ))}
            </>
          ) : profile && (
            <>
              {/* Joined */}
              <div className="col-span-1 md:col-span-1 md:row-span-1 bg-card/80 backdrop-blur-xl border border-border/50 rounded-3xl p-6 flex flex-col justify-center animate-fade-in [animation-delay:150ms] shadow-sm hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1 transition-all group">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-xl bg-surface flex items-center justify-center text-text-secondary group-hover:scale-110 transition-transform">
                    <ClockIcon className="w-4 h-4" />
                  </div>
                  <p className="text-xs text-text-secondary font-bold uppercase tracking-wide">Joined</p>
                </div>
                <p className="text-lg font-bold text-text-primary">
                  {new Date(profile.created_at).toLocaleDateString(navigator.language || 'en-CA', { year: 'numeric', month: 'short' })}
                </p>
              </div>
              
              {/* Favorites */}
              <div
                onClick={() => navigate('/favorites')}
                onKeyDown={(e) => { if (e.key === 'Enter') navigate('/favorites') }}
                role="button"
                tabIndex={0}
                className="col-span-1 md:col-span-1 md:row-span-1 bg-card/80 backdrop-blur-xl border border-border/50 rounded-3xl p-6 flex flex-col justify-center cursor-pointer animate-fade-in [animation-delay:200ms] shadow-sm hover:shadow-lg hover:shadow-red-500/10 hover:-translate-y-1 transition-all group"
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500 group-hover:scale-110 group-hover:rotate-6 transition-transform">
                    <HeartIcon className="w-4 h-4" />
                  </div>
                  <p className="text-xs text-text-secondary font-bold uppercase tracking-wide">Favorites</p>
                </div>
                <p className="text-2xl font-black text-text-primary">{profile.favorites_count}</p>
              </div>

              {/* Flashcards */}
              <div
                onClick={() => navigate('/flashcards')}
                onKeyDown={(e) => { if (e.key === 'Enter') navigate('/flashcards') }}
                role="button"
                tabIndex={0}
                className="col-span-2 md:col-span-2 md:row-span-1 bg-card/80 backdrop-blur-xl border border-border/50 rounded-3xl p-6 flex flex-col justify-center cursor-pointer animate-fade-in [animation-delay:250ms] shadow-sm hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1 transition-all group relative overflow-hidden"
              >
                <div className="absolute right-0 top-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
                <div className="flex items-center gap-2 mb-3 relative z-10">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 group-hover:rotate-6 transition-transform">
                    <FlashcardIcon className="w-5 h-5" />
                  </div>
                  <p className="text-xs text-text-secondary font-bold uppercase tracking-wide">Cards Reviewed</p>
                </div>
                <p className="text-3xl font-black text-text-primary relative z-10">{profile.flashcards_reviewed}</p>
              </div>
            </>
          )}

          {/* Achievements */}
          {stats && stats.badges && stats.badges.length > 0 && (
            <div className="col-span-2 md:col-span-4 bg-card/80 backdrop-blur-xl border border-border/50 rounded-3xl p-6 shadow-sm animate-fade-in [animation-delay:275ms]">
              <h2 className="text-xl font-bold text-text-primary mb-4 flex items-center gap-2">
                <span className="text-amber-500">🏆</span> Achievements
              </h2>
              <div className="flex flex-wrap gap-4">
                {stats.badges.map(badge => (
                  <div key={badge.id} className="flex items-center gap-3 px-4 py-3 bg-surface/50 border border-border/50 rounded-2xl hover:-translate-y-1 hover:shadow-md transition-all cursor-default">
                    <span className="text-2xl">{badge.icon}</span>
                    <span 
                      className="font-bold" 
                      style={{
                        color: badge.color === 'emerald-500' ? '#10b981' :
                               badge.color === 'amber-500' ? '#f59e0b' :
                               badge.color === 'blue-500' ? '#3b82f6' :
                               badge.color === 'rose-500' ? '#f43f5e' :
                               'var(--text-primary)'
                      }}
                    >
                      {badge.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Links */}
          <Link
            to="/favorites"
            className="col-span-2 md:col-span-2 bg-card/80 backdrop-blur-xl border border-border/50 rounded-3xl p-6 flex items-center justify-between hover:-translate-y-1 hover:shadow-lg hover:shadow-red-500/10 transition-all duration-300 no-underline group animate-fade-in [animation-delay:300ms]"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500 group-hover:scale-110 transition-transform">
                <HeartIcon className="w-6 h-6" />
              </div>
              <span className="text-text-primary font-bold">My Favorites</span>
            </div>
            <ChevronRightIcon className="w-5 h-5 text-text-secondary group-hover:text-red-500 transition-colors group-hover:translate-x-1" />
          </Link>

          <Link
            to="/flashcards"
            className="col-span-2 md:col-span-2 bg-card/80 backdrop-blur-xl border border-border/50 rounded-3xl p-6 flex items-center justify-between hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 no-underline group animate-fade-in [animation-delay:350ms]"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                <FlashcardIcon className="w-6 h-6" />
              </div>
              <span className="text-text-primary font-bold">Flashcards</span>
            </div>
            <ChevronRightIcon className="w-5 h-5 text-text-secondary group-hover:text-primary transition-colors group-hover:translate-x-1" />
          </Link>

          <Link
            to="/profile/change-password"
            className="col-span-2 md:col-span-4 bg-card/80 backdrop-blur-xl border border-border/50 rounded-3xl p-6 flex items-center justify-between hover:-translate-y-1 hover:shadow-lg hover:shadow-text-secondary/10 transition-all duration-300 no-underline group animate-fade-in [animation-delay:400ms]"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-surface flex items-center justify-center text-text-secondary group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <span className="text-text-primary font-bold">Change Password</span>
            </div>
            <ChevronRightIcon className="w-5 h-5 text-text-secondary group-hover:text-text-primary transition-colors group-hover:translate-x-1" />
          </Link>

          {/* Logout Button */}
          <button
            onClick={logout}
            className="col-span-2 md:col-span-4 bg-red-500/10 border border-red-500/20 rounded-3xl p-6 flex items-center justify-between hover:-translate-y-1 hover:shadow-lg hover:shadow-red-500/20 transition-all duration-300 no-underline group animate-fade-in [animation-delay:450ms] mt-4"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-red-500 text-white flex items-center justify-center group-hover:scale-110 group-hover:rotate-6 transition-transform">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </div>
              <span className="text-red-500 font-bold text-lg">Log Out</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}

export default ProfilePage
