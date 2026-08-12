/**
 * DebugRepPanel.tsx — Live repetition counter & rep history panel.
 *
 * Displays:
 *   - Prominent real-time rep counter (e.g. "REPS 05")
 *   - Current rep progress phase (IDLE, DESCENDING, REACHED_BOTTOM, ASCENDING)
 *   - Flash visual indicator when a rep is completed
 *   - Recent rep performance metrics (Duration, Deepest Knee Angle)
 *   - Completed rep history log
 *
 * All values come directly from RepCounter / sessionStore. No values are simulated.
 */

import { useEffect, useState } from 'react'
import type { RepRecord, RepCounterResult } from '@/types/session'

interface DebugRepPanelProps {
  repResult: RepCounterResult | null
}

function getProgressBadgeClass(progress: string): string {
  switch (progress) {
    case 'DESCENDING':
      return 'bg-warn/20 border-warn/40 text-warn'
    case 'REACHED_BOTTOM':
      return 'bg-accent/20 border-accent/40 text-accent font-bold animate-pulse-slow'
    case 'ASCENDING':
      return 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
    case 'IDLE':
    default:
      return 'bg-surface-400/20 border-surface-400/40 text-muted'
  }
}

export default function DebugRepPanel({ repResult }: DebugRepPanelProps) {
  const repCount = repResult?.repCount ?? 0
  const progress = repResult?.currentProgress ?? 'IDLE'
  const latestRep = repResult?.latestRep ?? null
  const history = repResult?.history ?? []

  // Flash notification when a rep completes
  const [justCompletedRep, setJustCompletedRep] = useState<number | null>(null)

  useEffect(() => {
    if (repResult?.repCompleted && latestRep) {
      setJustCompletedRep(latestRep.repNumber)
      const timer = setTimeout(() => {
        setJustCompletedRep(null)
      }, 2500)
      return () => clearTimeout(timer)
    }
  }, [repResult?.repCompleted, latestRep])

  // Format count as two digits (01, 02... 05)
  const formattedCount = String(repCount).padStart(2, '0')

  return (
    <div className="glass rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-surface-400/30 bg-surface-300/50">
        <div className="flex items-center gap-2">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-good animate-pulse-slow" />
          <span className="text-[10px] font-mono tracking-widest text-good uppercase">
            Live Rep Counter
          </span>
        </div>
        <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${getProgressBadgeClass(progress)}`}>
          {progress}
        </span>
      </div>

      {/* Main Counter Display */}
      <div className="p-4 space-y-3">
        <div className="relative glass-accent rounded-xl p-4 flex items-center justify-between overflow-hidden">
          {/* Completion flash background effect */}
          {justCompletedRep !== null && (
            <div className="absolute inset-0 bg-good/15 border border-good/40 rounded-xl animate-pulse" />
          )}

          <div>
            <span className="text-[10px] font-mono uppercase text-muted tracking-wider block">
              Completed Reps
            </span>
            <span className="text-4xl font-mono font-extrabold text-slate-100 tracking-tight">
              {formattedCount}
            </span>
          </div>

          <div className="text-right">
            {justCompletedRep !== null ? (
              <div className="flex items-center gap-1.5 text-good font-mono text-xs font-bold animate-bounce">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                REP {justCompletedRep} COMPLETE!
              </div>
            ) : latestRep ? (
              <div className="text-xs font-mono space-y-0.5">
                <span className="text-muted block text-[10px] uppercase">Last Rep</span>
                <span className="text-slate-200 block">
                  {(latestRep.durationMs / 1000).toFixed(1)}s · {latestRep.bottomKneeAngle}°
                </span>
              </div>
            ) : (
              <span className="text-xs font-mono text-muted/50 italic">
                Ready for rep 1
              </span>
            )}
          </div>
        </div>

        {/* Recent Reps Log */}
        {history.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-[10px] font-mono text-muted uppercase tracking-wider px-1">
              <span>Rep History</span>
              <span>Duration / Depth</span>
            </div>
            <div className="max-h-32 overflow-y-auto space-y-1 pr-1">
              {history.slice().reverse().map((rep: RepRecord) => (
                <div key={rep.repNumber} className="flex justify-between items-center glass rounded px-2.5 py-1 text-xs font-mono">
                  <span className="text-slate-300 font-medium">Rep #{rep.repNumber}</span>
                  <span className="text-accent">
                    {(rep.durationMs / 1000).toFixed(1)}s <span className="text-slate-400">({rep.bottomKneeAngle}°)</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
