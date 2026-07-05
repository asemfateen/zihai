import React, { useState, useEffect } from 'react';
import { Trophy, Award, Flame } from 'lucide-react';
import API_BASE, { fetchWithTimeout } from '../api';
import Navbar from '../components/Navbar';
import Spinner from '../components/Spinner';
import AchievementCard from '../components/AchievementCard';

export default function AchievementsPage() {
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAchievements();
  }, []);

  const fetchAchievements = async () => {
    try {
      setLoading(true);
      const res = await fetchWithTimeout(`${API_BASE}/api/achievements`, { credentials: 'include' });
      if (!res.ok) throw new Error('Network response was not ok');
      const data = await res.json();
      setAchievements(data);
      setError(null);
    } catch (err) {
      console.error('Failed to load achievements:', err);
      setError('Failed to load achievements. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const unlockedCount = achievements.filter(a => a.is_unlocked).length;
  const totalCount = achievements.length;
  const progressPercentage = totalCount === 0 ? 0 : Math.round((unlockedCount / totalCount) * 100);

  return (
    <div className="min-h-screen flex flex-col relative z-10 pb-24">
      <Navbar />
      
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Header Section */}
        <div className="mb-12 relative">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-4 bg-orange-500/20 text-orange-400 rounded-2xl">
              <Trophy size={40} strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-text mb-1">Achievements</h1>
              <p className="text-muted">Track your learning milestones and earn rewards.</p>
            </div>
          </div>
          
          {/* Global Progress */}
          {!loading && !error && (
            <div className="bg-card/60 backdrop-blur-md border border-white/10 rounded-3xl p-6 mt-8 max-w-2xl shadow-xl">
              <div className="flex justify-between items-end mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-text flex items-center gap-2">
                    <Award size={20} className="text-orange-400" />
                    Trophy Case
                  </h2>
                  <p className="text-sm text-muted mt-1">{unlockedCount} of {totalCount} Unlocked</p>
                </div>
                <div className="text-3xl font-bold text-orange-400 flex items-center gap-1">
                  <Flame size={28} className="text-orange-500" />
                  {progressPercentage}%
                </div>
              </div>
              <div className="w-full bg-surface/80 rounded-full h-3 overflow-hidden shadow-inner">
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-orange-400 via-orange-500 to-yellow-500 transition-all duration-1000"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Spinner size={48} className="text-orange-500" />
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <p className="text-red-400 mb-4">{error}</p>
            <button 
              onClick={fetchAchievements}
              className="px-6 py-2 bg-surface hover:bg-surface-hover rounded-xl text-text transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 auto-rows-fr">
            {achievements.map(ach => (
              <AchievementCard key={ach.id} achievement={ach} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
