import { useMemo } from 'react'

export default function ActivityHeatmap({ data = [] }) {
  // data is an array of { date: 'YYYY-MM-DD', count: N }
  
  const heatmapGrid = useMemo(() => {
    // Generate the last 371 days (53 columns * 7 days) to fill the grid exactly
    const days = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    // Create a map of date to count for fast lookup
    const dateMap = new Map()
    data.forEach(d => dateMap.set(d.date, d.count))

    // 53 weeks * 7 days = 371 days.
    for (let i = 370; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().slice(0, 10)
      const count = dateMap.get(dateStr) || 0
      days.push({ date: dateStr, count })
    }
    return days
  }, [data])

  const getColor = (count) => {
    if (count === 0) return 'bg-surface border border-border/50'
    if (count < 5) return 'bg-emerald-500/20 border border-emerald-500/30'
    if (count < 15) return 'bg-emerald-500/50 border border-emerald-500/60'
    if (count < 30) return 'bg-emerald-500/80 border border-emerald-500/90'
    return 'bg-emerald-500 border border-emerald-600'
  }

  return (
    <div className="w-full flex flex-col">
      <div 
        className="grid gap-[1px] sm:gap-0.5 md:gap-1 w-full"
        style={{ 
          gridTemplateColumns: 'repeat(53, minmax(0, 1fr))', 
          gridTemplateRows: 'repeat(7, minmax(0, 1fr))',
          gridAutoFlow: 'column'
        }}
      >
        {heatmapGrid.map((day, idx) => (
          <div
            key={day.date}
            tabIndex={0}
            aria-label={`${day.count} reviews on ${day.date}`}
            className={`w-full aspect-square rounded-[1px] sm:rounded-sm ${getColor(day.count)} transition-all hover:scale-125 hover:z-10 cursor-pointer relative group focus:outline-none focus:ring-1 focus:ring-primary`}
          >
            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-[10px] rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-20 pointer-events-none">
              {day.count} reviews on {day.date}
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-end items-center mt-3 gap-2 text-xs text-text-secondary">
        <span>Less</span>
        <div className="w-3 h-3 rounded-sm bg-surface border border-border/50"></div>
        <div className="w-3 h-3 rounded-sm bg-emerald-500/20 border border-emerald-500/30"></div>
        <div className="w-3 h-3 rounded-sm bg-emerald-500/50 border border-emerald-500/60"></div>
        <div className="w-3 h-3 rounded-sm bg-emerald-500/80 border border-emerald-500/90"></div>
        <div className="w-3 h-3 rounded-sm bg-emerald-500 border border-emerald-600"></div>
        <span>More</span>
      </div>
    </div>
  )
}
