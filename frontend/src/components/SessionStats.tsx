/**
 * SessionStats.tsx — Real-time session statistics component.
 *
 * Displays Total Reps, Avg Rep Time, Good Reps Count, and Form Consistency (%).
 * Uses transparent selector functions from sessionStore.
 */

import {
  useSessionStore,
  selectGoodRepsCount,
  selectAvgRepDurationSec,
  selectFormConsistencyPercent,
} from '@/store/sessionStore'

export default function SessionStats() {
  const reps = useSessionStore(s => s.reps)
  const repCount = useSessionStore(s => s.repCount)

  const goodReps = selectGoodRepsCount(reps)
  const avgDuration = selectAvgRepDurationSec(reps)
  const consistency = selectFormConsistencyPercent(reps)

  return (
    <div className="glass rounded-xl p-2.5 space-y-1.5 border border-surface-400/30 font-mono">
      <div className="flex items-center justify-between">
        <span className="text-[9px] uppercase text-accent tracking-wider font-semibold">
          Session Quick Stats
        </span>
        <span className="text-[8.5px] text-muted">Real-Time</span>
      </div>

      <div className="grid grid-cols-2 gap-1.5 text-xs">
        {/* Total Reps */}
        <div className="glass-accent rounded-lg p-1.5 px-2 flex flex-col justify-between">
          <span className="text-[8.5px] uppercase text-muted tracking-wider">Total Reps</span>
          <span className="text-sm font-bold text-slate-100 mt-0.5">{String(repCount).padStart(2, '0')}</span>
        </div>

        {/* Avg Rep Time */}
        <div className="glass-accent rounded-lg p-1.5 px-2 flex flex-col justify-between">
          <span className="text-[8.5px] uppercase text-muted tracking-wider">Avg Duration</span>
          <span className="text-sm font-bold text-slate-100 mt-0.5">{avgDuration !== null ? `${avgDuration}s` : '—'}</span>
        </div>

        {/* Good Reps */}
        <div className="glass-accent rounded-lg p-1.5 px-2 flex flex-col justify-between">
          <span className="text-[8.5px] uppercase text-muted tracking-wider">Good Reps</span>
          <span className="text-sm font-bold text-good mt-0.5">{String(goodReps).padStart(2, '0')}</span>
        </div>

        {/* Form Consistency */}
        <div className="glass-accent rounded-lg p-1.5 px-2 flex flex-col justify-between">
          <span className="text-[8.5px] uppercase text-muted tracking-wider">Consistency</span>
          <span className="text-sm font-bold text-accent mt-0.5">{consistency !== null ? `${consistency}%` : '—'}</span>
        </div>
      </div>
    </div>
  )
}
