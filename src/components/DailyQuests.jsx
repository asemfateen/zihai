import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import API_BASE, { fetchWithTimeout } from '../api'
import { Check as CheckIcon, Star as StarIcon } from 'lucide-react'

export default function DailyQuests({ onGemsUpdated }) {
  const navigate = useNavigate()
  const [quests, setQuests] = useState([])
  const [loading, setLoading] = useState(true)
  const [claiming, setClaiming] = useState({})

  const fetchQuests = async () => {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/api/quests`, { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setQuests(data)
      }
    } catch (err) {
      console.error('Failed to fetch quests:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchQuests()
  }, [])

  const playBlingSound = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      
      osc.type = 'sine'
      // Bling sound chord progression: E5 -> G5 -> C6
      const now = ctx.currentTime
      osc.frequency.setValueAtTime(659.25, now) // E5
      osc.frequency.setValueAtTime(783.99, now + 0.1) // G5
      osc.frequency.setValueAtTime(1046.50, now + 0.2) // C6
      
      gain.gain.setValueAtTime(0.3, now)
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4)
      
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now)
      osc.stop(now + 0.4)
    } catch (err) {
      console.warn('AudioContext failed to start:', err)
    }
  }

  const handleClaim = async (questId) => {
    setClaiming(prev => ({ ...prev, [questId]: true }))
    try {
      const res = await fetchWithTimeout(`${API_BASE}/api/quests/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questId }),
        credentials: 'include'
      })
      if (res.ok) {
        const data = await res.json()
        playBlingSound()
        if (onGemsUpdated && data.gems !== undefined) {
          onGemsUpdated(data.gems)
        }
        // Update local state
        setQuests(prev => prev.map(q => q.id === questId ? { ...q, claimed: 1 } : q))
      }
    } catch (err) {
      console.error('Failed to claim quest:', err)
    } finally {
      setClaiming(prev => ({ ...prev, [questId]: false }))
    }
  }

  const getQuestTitle = (type) => {
    const titles = {
      flashcards: 'Review 20 Flashcards',
      match: 'Play Match Game',
      analyze: 'Analyze 1 Text'
    }
    return titles[type] || 'Daily Objective'
  }

  const getQuestIcon = (type) => {
    const icons = {
      flashcards: '📇',
      match: '🎮',
      analyze: '🔍'
    }
    return icons[type] || '✨'
  }

  if (loading) {
    return (
      <div className="bg-card/45 backdrop-blur-xl border border-border/50 rounded-3xl p-6 shadow-sm animate-pulse">
        <div className="h-4 bg-surface rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          <div className="h-10 bg-surface rounded"></div>
          <div className="h-10 bg-surface rounded"></div>
          <div className="h-10 bg-surface rounded"></div>
        </div>
      </div>
    )
  }

  if (quests.length === 0) return null

  return (
    <div className="bg-card/45 backdrop-blur-xl border border-border/50 rounded-[2.5rem] p-5 shadow-sm h-full flex flex-col justify-between">
      <div className="flex justify-between items-center mb-3">
        <div>
          <span className="text-[9px] font-black uppercase tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
            Daily Missions
          </span>
          <h2 className="text-base font-black text-text-primary mt-1">Daily Quests</h2>
        </div>
        <div className="text-[10px] text-text-secondary font-medium bg-surface/50 border border-border/50 px-2.5 py-0.5 rounded-full">
          Resets Daily
        </div>
      </div>

      <div className="space-y-2 flex-1 flex flex-col justify-center">
        {quests.map(quest => {
          const isCompleted = quest.progress >= quest.target
          const isClaimed = quest.claimed === 1
          const percent = Math.min(100, (quest.progress / quest.target) * 100)

          return (
            <div key={quest.id} className="flex flex-col gap-1.5 p-2.5 bg-surface/30 border border-border/30 rounded-xl">
              <div className="flex justify-between items-center gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-xl select-none shrink-0">{getQuestIcon(quest.quest_type)}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-text-primary leading-tight truncate">
                      {getQuestTitle(quest.quest_type)}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <p className="text-[9px] text-text-secondary font-semibold whitespace-nowrap">
                        {quest.progress} / {quest.target} completed
                      </p>
                    </div>
                  </div>
                </div>

                {isClaimed ? (
                  <span className="text-[10px] font-bold text-text-secondary bg-surface px-2 py-1 rounded-lg border border-border flex items-center gap-1 select-none shrink-0">
                    <CheckIcon className="w-3 h-3 text-text-secondary" />
                    Claimed
                  </span>
                ) : isCompleted ? (
                  <button
                    onClick={() => handleClaim(quest.id)}
                    disabled={claiming[quest.id]}
                    className="px-2 py-1 bg-gradient-to-r from-primary to-emerald-500 hover:shadow-lg hover:shadow-primary/20 text-white rounded-lg text-[10px] font-bold shadow-md hover:scale-[1.03] active:scale-[0.97] transition-all cursor-pointer flex items-center gap-1 border border-primary/20 disabled:opacity-50 shrink-0"
                  >
                    Claim +{quest.gems_reward} 💎
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[9px] font-black tracking-wider uppercase text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md whitespace-nowrap">
                      +{quest.gems_reward} Gems
                    </span>
                    <button
                      onClick={() => {
                        const paths = {
                          flashcards: '/flashcards',
                          match: '/match-game',
                          analyze: '/analyzer'
                        }
                        const path = paths[quest.quest_type]
                        if (path) navigate(path)
                      }}
                      className="px-2 py-0.5 bg-primary/10 hover:bg-primary text-primary hover:text-white border border-primary/20 hover:border-primary rounded text-[9px] font-bold transition-all duration-300 cursor-pointer active:scale-95 flex items-center gap-0.5 whitespace-nowrap"
                    >
                      Go →
                    </button>
                  </div>
                )}
              </div>

              {/* Progress bar */}
              <div className="w-full bg-surface/50 border border-border/50 rounded-full h-2 overflow-hidden p-0.5">
                <div
                  className="bg-gradient-to-r from-primary to-emerald-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${percent}%` }}
                ></div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
