import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { HomeIcon, TrophyIcon, CompassIcon, SearchIcon, BookOpenIcon, UserIcon, LogInIcon, Crown } from 'lucide-react'
import API_BASE, { fetchWithTimeout } from '../api'

function DockItem({ icon: Icon, label, isActive, onClick }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={`group relative flex flex-col items-center justify-center w-14 h-14 rounded-2xl transition-all duration-300 ${
        isActive 
          ? 'bg-primary/20 text-primary scale-110 shadow-lg shadow-primary/20' 
          : 'text-text-secondary hover:bg-surface/50 hover:text-text-primary hover:scale-105'
      }`}
    >
      <Icon className={`w-6 h-6 transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
      
      {/* Tooltip on Desktop */}
      <span className="absolute -top-10 scale-0 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-200 bg-surface border border-border px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap shadow-xl">
        {label}
      </span>
    </button>
  )
}

function SidebarItem({ icon: Icon, label, isActive, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 cursor-pointer border ${
        isActive 
          ? 'bg-primary/10 text-primary border-primary/20 shadow-md shadow-primary/5 font-bold scale-[1.02]' 
          : 'text-text-secondary border-transparent hover:bg-surface/50 hover:text-text-primary hover:scale-[1.01]'
      }`}
    >
      <Icon className={`w-5.5 h-5.5 transition-transform duration-300 ${isActive ? 'scale-110 text-primary' : 'group-hover:scale-110'}`} />
      <span className="text-sm font-bold tracking-wide">{label}</span>
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

      {/* 1. Mobile Bottom Dock (shown on small screens only) */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 md:hidden animate-fade-in">
        <div className="flex items-center gap-2 p-2 bg-surface/50 backdrop-blur-3xl border border-border/50 rounded-[2rem] shadow-2xl shadow-black/50">
          <DockItem 
            icon={HomeIcon} 
            label="Home" 
            isActive={location.pathname === '/'} 
            onClick={() => navigate('/')} 
          />
          <DockItem 
            icon={SearchIcon} 
            label="Search" 
            isActive={location.pathname === '/search'} 
            onClick={() => navigate('/search')} 
          />
          
          {user ? (
            <>
              <DockItem 
                icon={CompassIcon} 
                label="Journey" 
                isActive={location.pathname === '/journey'} 
                onClick={() => navigate('/journey')} 
              />
              <DockItem 
                icon={BookOpenIcon} 
                label="Flashcards" 
                isActive={location.pathname === '/flashcards'} 
                onClick={() => navigate('/flashcards')} 
              />
              <DockItem 
                icon={UserIcon} 
                label="Profile" 
                isActive={location.pathname === '/profile'} 
                onClick={() => navigate('/profile')} 
              />
              {user.is_admin && (
                <DockItem 
                  icon={Crown} 
                  label="Admin" 
                  isActive={location.pathname === '/admin'} 
                  onClick={() => navigate('/admin')} 
                />
              )}
            </>
          ) : (
            <DockItem 
              icon={LogInIcon} 
              label="Login" 
              isActive={location.pathname === '/login'} 
              onClick={() => navigate('/login')} 
            />
          )}
        </div>
      </div>

      {/* 2. Desktop Left Sidebar (shown on medium/large screens only) */}
      <aside className="hidden md:flex fixed top-0 left-0 bottom-0 w-64 bg-card/45 backdrop-blur-2xl border-r border-border/50 p-6 flex-col z-50 animate-fade-in">
        {/* Brand Header */}
        <div className="mb-10 px-4">
          <button
            onClick={() => navigate("/")}
            className="text-3xl font-black tracking-tighter bg-gradient-to-r from-primary via-rose-500 to-orange-500 bg-clip-text text-transparent drop-shadow-sm select-none cursor-pointer bg-transparent border-none p-0 hover:opacity-85 transition-opacity"
          >
            字海
          </button>
        </div>

        {/* Navigation Items Link Column */}
        <div className="flex flex-col gap-2 flex-1">
          <SidebarItem 
            icon={HomeIcon} 
            label="Home" 
            isActive={location.pathname === '/'} 
            onClick={() => navigate('/')} 
          />
          <SidebarItem 
            icon={SearchIcon} 
            label="Search" 
            isActive={location.pathname === '/search'} 
            onClick={() => navigate('/search')} 
          />
          
          {user ? (
            <>
              <SidebarItem 
                icon={CompassIcon} 
                label="Journey" 
                isActive={location.pathname === '/journey'} 
                onClick={() => navigate('/journey')} 
              />
              <SidebarItem 
                icon={BookOpenIcon} 
                label="Flashcards" 
                isActive={location.pathname === '/flashcards'} 
                onClick={() => navigate('/flashcards')} 
              />
              <SidebarItem 
                icon={UserIcon} 
                label="Profile" 
                isActive={location.pathname === '/profile'} 
                onClick={() => navigate('/profile')} 
              />
              {user.is_admin && (
                <SidebarItem 
                  icon={Crown} 
                  label="Admin" 
                  isActive={location.pathname === '/admin'} 
                  onClick={() => navigate('/admin')} 
                />
              )}
            </>
          ) : (
            <SidebarItem 
              icon={LogInIcon} 
              label="Login" 
              isActive={location.pathname === '/login'} 
              onClick={() => navigate('/login')} 
            />
          )}
        </div>


        {/* Compact User Profile Box at Sidebar Bottom */}
        {user && (
          <div 
            onClick={() => navigate('/profile')}
            className="mt-auto p-4 bg-surface/30 border border-border/30 rounded-2xl flex items-center gap-3 cursor-pointer hover:bg-surface/50 transition-colors duration-200"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center font-black text-primary border border-primary/20 select-none">
              {user.email?.[0].toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-text-primary truncate leading-none">
                {user.email?.split('@')[0]}
              </p>
              <p className="text-[10px] text-text-secondary truncate mt-1 leading-none font-medium">
                {user.email}
              </p>
            </div>
          </div>
        )}
      </aside>
    </>
  )
}
