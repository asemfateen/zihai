import React from 'react';
import PropTypes from 'prop-types';
import * as LucideIcons from 'lucide-react';

export default function AchievementCard({ achievement }) {
  const { name, description, icon, current_progress, requirement_value, is_unlocked, unlocked_at } = achievement;

  const IconComponent = LucideIcons[icon] || LucideIcons.Trophy;
  const percentage = Math.min(100, Math.max(0, (current_progress / requirement_value) * 100));

  return (
    <div className={`relative overflow-hidden transition-all duration-300  group rounded-xl p-6 border ${is_unlocked ? 'bg-card border-orange-500/30 hover:shadow-[0_0_30px_rgba(249,115,22,0.2)]' : 'bg-card border-white/5 grayscale-[50%] opacity-80'}`}>
      
      {/* Background glow for unlocked */}
      {is_unlocked && (
        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-3xl -z-10 group-hover:bg-orange-500/20 transition-all duration-500"></div>
      )}

      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-xl ${is_unlocked ? 'bg-orange-500/20 text-orange-400' : 'bg-surface text-muted'}`}>
          <IconComponent size={28} strokeWidth={1.5} />
        </div>
        {is_unlocked && (
          <span className="text-xs font-medium text-orange-400 bg-orange-500/10 px-3 py-1 rounded-full">
            Unlocked
          </span>
        )}
      </div>

      <h3 className={`text-lg font-bold mb-1 ${is_unlocked ? 'text-text' : 'text-text/70'}`}>
        {name}
      </h3>
      <p className="text-sm text-muted mb-6 line-clamp-2">
        {description}
      </p>

      <div className="mt-auto">
        <div className="flex justify-between text-xs mb-2">
          <span className="text-muted font-medium">Progress</span>
          <span className={is_unlocked ? 'text-orange-400 font-bold' : 'text-muted font-bold'}>
            {current_progress} / {requirement_value}
          </span>
        </div>
        <div className="w-full bg-surface rounded-full h-2 overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-1000 ease-out ${is_unlocked ? 'bg-gradient-to-r from-orange-400 to-orange-600' : 'bg-muted/30'}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        {is_unlocked && unlocked_at && (
           <p className="text-[10px] text-muted/60 mt-3 text-right">
             Unlocked on {new Date(unlocked_at).toLocaleDateString()}
           </p>
        )}
      </div>
    </div>
  );
}

AchievementCard.propTypes = {
  achievement: PropTypes.shape({
    name: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
    icon: PropTypes.string.isRequired,
    current_progress: PropTypes.number.isRequired,
    requirement_value: PropTypes.number.isRequired,
    is_unlocked: PropTypes.bool.isRequired,
    unlocked_at: PropTypes.string
  }).isRequired
};
