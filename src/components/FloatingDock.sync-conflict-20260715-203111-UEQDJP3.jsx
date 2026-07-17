import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { HomeIcon, TrophyIcon, CompassIcon, SearchIcon, BookOpenIcon, UserIcon, LogInIcon, Crown } from 'lucide-react'
import API_BASE, { fetchWithTimeout } from '../api'

function DockItem({ icon: Icon, label, path, isActive, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`group relative flex flex-col items-center justify-center w-14 h-14 md:w-16 md:h-16 rounded-2xl transition-all duration-300 ${
        isActive 
          ? 'bg-primary/20 text-primary scale-110 shadow-lg shadow-primary/20' 
          : 'text-text-secondary hover:bg-surface/50 hover:text-text-primary hover:scale-105'
      }`}
    >
      <Icon className={`w-6 h-6 md:w-7 md:h-7 transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
      
      {/* Tooltip on Desktop */}
      <span className="absolute -top-10 scale-0 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-200 bg-surface border border-border px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap shadow-xl">
        {label}
      </span>
    </button>
  )
}

export default function FloatingDock() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  
  const [progress, setProgress] = useState(null)

  useEffect(() => {
    if (user) {
      fetchWithTimeout(`${API_BASE}/api/progress`, { credentials: 'include' })
        .then(res => res.json())
        .then(data => setProgress(data))
        .catch(() => {})
    }
  }, [location.pathname, user])

  const xp = progress?.xp || 0
  const streak = progress?.streak_days || 0

  return (
    <>
      {/* Global HUD for Stats (Top Right) */}
      {user && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 animate-fade-in pointer-events-none">
          <div className="flex items-center gap-2 bg-surface/40 backdrop-blur-2xl border border-border/50 px-4 py-2 rounded-full shadow-lg">
            <span className="text-amber-500 font-bold text-sm tracking-widest uppercase">STREAK</span>
            <span className="text-white font-black">{streak}</span>
          </div>
          <div className="flex items-center gap-2 bg-surface/40 backdrop-blur-2xl border border-border/50 px-4 py-2 rounded-full shadow-lg">
            <span className="text-blue-500 font-bold text-sm tracking-widest uppercase">XP</span>
            <span className="text-white font-black">{xp}</span>
          </div>
        </div>
      )}

      {/* The Floating Dock (Bottom Center) */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <div className="flex items-center gap-2 p-2 bg-surface/50 backdrop-blur-3xl border border-border/50 rounded-[2rem] shadow-2xl shadow-black/50">
          
          <DockItem 
            icon={HomeIcon} 
            label="Home" 
            path="/" 
            isActive={location.pathname === '/'} 
            onClick={() => navigate('/')} 
          />
          <DockItem 
            icon={SearchIcon} 
            label="Search" 
            path="/search" 
            isActive={location.pathname === '/search'} 
            onClick={() => navigate('/search')} 
          />
          
          {user ? (
            <>
              <DockItem 
                icon={CompassIcon} 
                label="Journey" 
                path="/journey" 
                isActive={location.pathname === '/journey'} 
                onClick={() => navigate('/journey')} 
              />
              <DockItem 
                icon={BookOpenIcon} 
                label="Flashcards" 
                path="/flashcards" 
                isActive={location.pathname === '/flashcards'} 
                onClick={() => navigate('/flashcards')} 
              />
              <DockItem 
                icon={UserIcon} 
                label="Profile" 
                path="/profile" 
                isActive={location.pathname === '/profile'} 
                onClick={() => navigate('/profile')} 
              />
              {user.is_admin && (
                <DockItem 
                  icon={Crown} 
                  label="Admin" 
                  path="/admin" 
                  isActive={location.pathname === '/admin'} 
                  onClick={() => navigate('/admin')} 
                />
              )}
            </>
          ) : (
            <DockItem 
              icon={LogInIcon} 
              label="Login" 
              path="/login" 
              isActive={location.pathname === '/login'} 
              onClick={() => navigate('/login')} 
            />
          )}
        </div>
      </div>
    </>
  )
}
