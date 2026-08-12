/**
 * RepHistory.tsx — Compact recent repetitions history list component.
 *
 * Displays the last 5 completed repetitions with rep number, duration, depth, and overall form status badge.
 */

import { useSessionStore } from '@/store/sessionStore'
import type { FormStatus } from '@/types/analysis'

function getFormBadgeStyle(status?: FormStatus): { bg: string; text: string; border: string } {
  switch (status) {
    case 'GOOD':
      return { bg: 'bg-good/20', text: 'text-good', border: 'border-good/40' }
    case 'WARNING':
      return { bg: 'bg-warn/20', text: 'text-warn', border: 'border-warn/40' }
    case 'POOR':
      return { bg: 'bg-danger/20', text: 'text-danger', border: 'border-danger/40' }
    default:
      return { bg: 'bg-surface-400/20', text: 'text-muted', border: 'border-surface-400/40' }
  }
}

export default function RepHistory() {
  const reps = useSessionStore(s => s.reps)
  const recentReps = reps.slice(-5).reverse()

  return (
    <div className="glass rounded-xl p-3.5 space-y-2 border border-surface-400/30">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-mono uppercase text-accent tracking-wider font-semibold">
          Recent Repetitions
        </span>
        <span className="text-[10px] font-mono text-muted">
          Last {recentReps.length}
        </span>
      </div>

      {recentReps.length === 0 ? (
        <p className="text-xs font-mono text-muted/60 italic p-2 text-center">
          No completed reps yet
        </p>
      ) : (
        <div className="space-y-1.5 font-mono text-xs max-h-40 overflow-y-auto pr-1">
          {recentReps.map(rep => {
            const formStatus = rep.formAnalysis?.summary?.overall ?? (rep.formAnalysis?.isGoodRep ? 'GOOD' : 'WARNING')
            const style = getFormBadgeStyle(formStatus)
            const durationSec = (rep.durationMs / 1000).toFixed(1)

            return (
              <div key={rep.repNumber} className="glass rounded-lg px-3 py-1.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-200">#{String(rep.repNumber).padStart(2, '0')}</span>
                  <span className="text-muted text-[11px]">{durationSec}s</span>
                  <span className="text-slate-400 text-[11px]">({rep.bottomKneeAngle}°)</span>
                </div>
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold border uppercase ${style.bg} ${style.text} ${style.border}`}>
                  {formStatus}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
