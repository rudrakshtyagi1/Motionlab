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
    <div className="glass rounded-xl p-3.5 space-y-2.5 border border-surface-400/30">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-mono uppercase text-accent tracking-wider font-semibold">
          Session Quick Stats
        </span>
        <span className="text-[10px] font-mono text-muted">Real-Time</span>
      </div>

      <div className="grid grid-cols-2 gap-2 font-mono text-xs">
        {/* Total Reps */}
        <div className="glass-accent rounded-lg p-2 flex flex-col">
          <span className="text-[9px] uppercase text-muted tracking-wider">Total Reps</span>
          <span className="text-base font-bold text-slate-100">{String(repCount).padStart(2, '0')}</span>
        </div>

        {/* Avg Rep Time */}
        <div className="glass-accent rounded-lg p-2 flex flex-col">
          <span className="text-[9px] uppercase text-muted tracking-wider">Avg Duration</span>
          <span className="text-base font-bold text-slate-100">{avgDuration !== null ? `${avgDuration}s` : '—'}</span>
        </div>

        {/* Good Reps */}
        <div className="glass-accent rounded-lg p-2 flex flex-col">
          <span className="text-[9px] uppercase text-muted tracking-wider">Good Reps</span>
          <span className="text-base font-bold text-good">{String(goodReps).padStart(2, '0')}</span>
        </div>

        {/* Form Consistency */}
        <div className="glass-accent rounded-lg p-2 flex flex-col">
          <span className="text-[9px] uppercase text-muted tracking-wider">Consistency</span>
          <span className="text-base font-bold text-accent">{consistency !== null ? `${consistency}%` : '—'}</span>
        </div>
      </div>
    </div>
  )
}
