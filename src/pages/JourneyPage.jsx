import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import API_BASE, { fetchWithTimeout } from '../api'
import { Check as CheckIcon, Lock as LockIcon, Star as StarIcon, Flame as FlameIcon, Compass as CompassIcon } from 'lucide-react'

const TOTAL_SECTORS = 15

// Bento grid varying spans for an organic, modern look
const bentoSpans = [
  'col-span-2 row-span-2', // 1: Big hero
  'col-span-1 row-span-1', // 2
  'col-span-1 row-span-1', // 3
  'col-span-1 md:col-span-2 row-span-1', // 4
  'col-span-1 row-span-2', // 5
  'col-span-1 row-span-1', // 6
  'col-span-2 md:col-span-1 row-span-1', // 7
  'col-span-1 md:col-span-2 row-span-2', // 8
  'col-span-1 row-span-1', // 9
  'col-span-1 row-span-1', // 10
  'col-span-2 row-span-1', // 11
  'col-span-1 row-span-1', // 12
  'col-span-1 md:col-span-2 row-span-1', // 13
  'col-span-1 row-span-1', // 14
  'col-span-2 md:col-span-3 row-span-2', // 15: Boss sector
]

function SectorCard({ id, state, spanClass, onClick }) {
  const isCompleted = state === 'COMPLETED'
  const isActive = state === 'ACTIVE'
  const isLocked = state === 'LOCKED'
  
  let bgClass = 'bg-surface/30 border-border/40 text-text-secondary backdrop-blur-sm'
  if (isCompleted) {
    bgClass = 'bg-gradient-to-br from-primary/90 to-primary/60 border-primary/50 text-white shadow-lg shadow-primary/20'
  } else if (isActive) {
    bgClass = 'bg-surface/80 border-primary/70 text-text-primary shadow-xl shadow-primary/10 backdrop-blur-xl'
  }

  return (
    <button 
      onClick={() => !isLocked && onClick()}
      disabled={isLocked}
      className={`relative overflow-hidden rounded-3xl border p-6 flex flex-col justify-between text-left transition-all duration-300 ${spanClass} ${bgClass} ${isLocked ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:-translate-y-1 hover:shadow-2xl active:scale-[0.98]'}`}
    >
      <div className="flex justify-between items-start z-10">
        <div className="space-y-1">
          <div className="text-xs font-bold uppercase tracking-wider opacity-70">Expedition</div>
          <h3 className="text-2xl font-black font-heading">Sector {id}</h3>
        </div>
        <div className="p-3 rounded-2xl bg-black/10 backdrop-blur-md">
          {isCompleted && <CheckIcon className="w-6 h-6 text-white" />}
          {isActive && <CompassIcon className="w-6 h-6 text-primary animate-pulse" />}
          {isLocked && <LockIcon className="w-6 h-6 opacity-50" />}
        </div>
      </div>
      
      <div className="mt-8 z-10">
        {isActive && (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary animate-ping" />
            <span className="text-sm font-medium text-primary">Active Mission</span>
          </div>
        )}
        {isCompleted && <div className="text-sm font-medium opacity-90">Mission Cleared</div>}
        {isLocked && <div className="text-sm font-medium opacity-50">Classified Area</div>}
      </div>
      
      {/* Abstract Background Decoration */}
      <div className="absolute -bottom-8 -right-8 opacity-[0.07] pointer-events-none transition-transform duration-700 group-hover:scale-110">
        <svg className="w-48 h-48" viewBox="0 0 100 100" fill="currentColor">
          <path d="M50 0 L100 25 L100 75 L50 100 L0 75 L0 25 Z" />
        </svg>
      </div>
    </button>
  )
}

export default function JourneyPage() {
  const navigate = useNavigate()
  const [progress, setProgress] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchProgress = () => {
    setLoading(true)
    setError(null)
    fetchWithTimeout(`${API_BASE}/api/progress`, { credentials: 'include' })
      .then(res => {
        if (!res.ok) throw new Error('Failed to retrieve user progress')
        return res.json()
      })
      .then(data => {
        setProgress(data)
        setLoading(false)
      })
      .catch(err => {
        console.error('Failed to fetch progress:', err)
        setError('Failed to fetch progress database records.')
        setLoading(false)
      })
  }
  
  useEffect(() => {
    fetchProgress()
  }, [])

  if (error) {
    return (
      <div className="min-h-screen bg-transparent relative z-10 text-text-primary flex items-center justify-center">
        <div className="bg-card/85 backdrop-blur-xl border border-border/50 rounded-3xl p-8 max-w-md text-center shadow-lg animate-fade-in mx-4">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold mb-2">Expedition Data Unresolved</h2>
          <p className="text-text-secondary text-sm mb-6">{error}</p>
          <button
            onClick={fetchProgress}
            className="px-6 py-2.5 bg-primary text-white rounded-xl font-bold hover:scale-105 transition-transform cursor-pointer"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-transparent flex flex-col">
        <div className="flex-1 flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    )
  }

  const xp = progress?.xp || 0
  const streak = progress?.streak_days || 0
  
  // Calculate active node (0-indexed logic, 100 XP per sector)
  const activeSectorIndex = Math.floor(xp / 100)

  return (
    <div className="min-h-screen bg-transparent flex flex-col pb-32">
      {/* Sticky Progress Dashboard */}
      <div className="sticky top-0 sm:top-4 z-40 bg-surface/80 backdrop-blur-xl border-b sm:border border-border shadow-sm py-4 px-6 flex items-center justify-between max-w-5xl mx-auto w-full md:rounded-3xl mb-8 mt-0 sm:mt-4">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-amber-500 font-bold bg-amber-500/10 px-4 py-2 rounded-xl">
            <FlameIcon className="w-5 h-5 fill-amber-500" />
            <span className="text-lg">{streak}</span>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-blue-500 font-bold bg-blue-500/10 px-4 py-2 rounded-xl">
            <StarIcon className="w-5 h-5 fill-blue-500" />
            <span className="text-lg">{xp} XP</span>
          </div>
        </div>
        <div className="text-right">
          <h2 className="font-heading font-black text-xl text-text-primary tracking-wide">EXPEDITION</h2>
          <p className="text-xs text-text-secondary font-medium tracking-widest uppercase">Global Progress</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col max-w-5xl mx-auto w-full px-4 md:px-8 mt-4">
        
        {/* Bento Grid Container */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 auto-rows-[140px] md:auto-rows-[160px]">
          {Array.from({ length: TOTAL_SECTORS }).map((_, i) => {
            const sectorId = i + 1
            let state = 'LOCKED'
            if (i < activeSectorIndex) state = 'COMPLETED'
            if (i === activeSectorIndex) state = 'ACTIVE'
            
            // Fallback span if we run out of defined bento patterns
            const spanClass = bentoSpans[i] || 'col-span-1 row-span-1'

            return (
              <SectorCard 
                key={sectorId}
                id={sectorId}
                state={state}
                spanClass={spanClass}
                onClick={() => navigate(`/journey/lesson/${sectorId}`)}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}
