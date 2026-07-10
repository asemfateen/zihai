import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import API_BASE, { fetchWithTimeout } from '../api'
import { Trophy as TrophyIcon, Flame as FlameIcon, Star as StarIcon } from 'lucide-react'

export default function LeaderboardPage() {
  const navigate = useNavigate()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchWithTimeout(`${API_BASE}/api/leaderboard`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        setUsers(data)
        setLoading(false)
      })
      .catch(err => {
        console.error('Failed to load leaderboard:', err)
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-transparent flex flex-col">
        <div className="flex-1 flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-transparent flex flex-col pb-32">
      <div className="flex-1 max-w-3xl mx-auto w-full px-4 py-8">
        <div className="text-center mb-12 animate-fade-in">
          <div className="w-24 h-24 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-amber-500/20">
            <TrophyIcon className="w-12 h-12 text-amber-500" />
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-text-primary mb-4">Global Leaderboard</h1>
          <p className="text-lg text-text-secondary">See who is mastering the most Chinese characters!</p>
        </div>

        <div className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-3xl overflow-hidden shadow-sm animate-fade-in [animation-delay:150ms]">
          {users.map((user, idx) => {
            let rankClass = "text-text-secondary font-bold"
            if (user.rank === 1) rankClass = "text-amber-500 font-black text-xl drop-shadow-sm"
            if (user.rank === 2) rankClass = "text-slate-400 font-bold text-lg"
            if (user.rank === 3) rankClass = "text-orange-400 font-bold text-lg"

            return (
              <div 
                key={user.id} 
                className={`flex items-center gap-4 px-6 py-5 border-b border-border/50 last:border-0 hover:bg-surface/50 transition-colors ${user.rank <= 3 ? 'bg-primary/5' : ''}`}
              >
                <div className={`w-8 text-center ${rankClass}`}>
                  {user.rank}
                </div>
                
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-rose-500 flex items-center justify-center text-white font-bold text-lg shadow-inner">
                  {user.username.charAt(0).toUpperCase()}
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-text-primary truncate">{user.username}</h3>
                </div>
                
                <div className="flex items-center gap-4 text-sm sm:text-base">
                  <div className="flex items-center gap-1.5 text-blue-500 font-bold">
                    {user.xp} <StarIcon className="w-4 h-4 fill-blue-500 hidden sm:block" />
                  </div>
                  <div className="flex items-center gap-1.5 text-amber-500 font-bold">
                    {user.streak} <FlameIcon className="w-4 h-4 fill-amber-500 hidden sm:block" />
                  </div>
                </div>
              </div>
            )
          })}

          {users.length === 0 && (
            <div className="p-8 text-center text-text-secondary">
              No users on the leaderboard yet. Be the first!
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
