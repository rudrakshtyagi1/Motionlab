/**
 * DebugStatePanel.tsx — Development-only real-time squat state machine inspector.
 *
 * Displays:
 *   - Current Squat State (STANDING, DESCENDING, BOTTOM, ASCENDING, UNAVAILABLE)
 *   - Current Knee Angle
 *   - Movement Direction (DOWN, UP, HOLD, STANDING, NONE)
 *   - Most Recent State Transition (e.g., STANDING → DESCENDING)
 *
 * All values come directly from SquatStateMachine.
 */

import type { SquatStateResult, SquatState } from '@/types/analysis'

interface DebugStatePanelProps {
  stateResult: SquatStateResult | null
}

function getStateBadgeClass(state: SquatState): string {
  switch (state) {
    case 'STANDING':
      return 'bg-good/20 border-good/40 text-good'
    case 'DESCENDING':
      return 'bg-warn/20 border-warn/40 text-warn'
    case 'BOTTOM':
      return 'bg-accent/20 border-accent/40 text-accent font-bold animate-pulse-slow'
    case 'ASCENDING':
      return 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
    case 'UNAVAILABLE':
    default:
      return 'bg-surface-400/20 border-surface-400/40 text-muted'
  }
}

function getDirectionBadgeClass(dir: string): string {
  if (dir === 'DOWN') return 'text-warn font-semibold'
  if (dir === 'UP') return 'text-cyan-300 font-semibold'
  if (dir === 'HOLD') return 'text-slate-400'
  return 'text-muted/60'
}

export default function DebugStatePanel({ stateResult }: DebugStatePanelProps) {
  const state = stateResult?.state ?? 'UNAVAILABLE'
  const kneeAngle = stateResult?.kneeAngle ?? null
  const direction = stateResult?.direction ?? 'NONE'
  const transition = stateResult?.transition

  return (
    <div className="glass rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-surface-400/30 bg-surface-300/50">
        <div className="flex items-center gap-2">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse-slow" />
          <span className="text-[10px] font-mono tracking-widest text-cyan-400 uppercase">
            Dev · State Machine
          </span>
        </div>
        <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${getStateBadgeClass(state)}`}>
          {state}
        </span>
      </div>

      <div className="p-4 space-y-3">
        {/* Main state display */}
        <div className="grid grid-cols-2 gap-2 glass-accent rounded-lg p-3">
          <div>
            <span className="text-[10px] font-mono uppercase text-muted block mb-0.5">
              Current Phase
            </span>
            <span className="text-sm font-mono font-bold text-slate-100">
              {state}
            </span>
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase text-muted block mb-0.5">
              Knee Angle
            </span>
            <span className="text-sm font-mono font-bold text-accent">
              {kneeAngle !== null ? `${kneeAngle}°` : '--'}
            </span>
          </div>
        </div>

        {/* Direction & Transition */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="glass rounded-lg p-2 flex flex-col justify-between">
            <span className="text-[10px] font-mono uppercase text-muted">Direction</span>
            <span className={`font-mono text-sm ${getDirectionBadgeClass(direction)}`}>
              {direction === 'DOWN' ? '↓ DOWN' : direction === 'UP' ? '↑ UP' : direction}
            </span>
          </div>
          <div className="glass rounded-lg p-2 flex flex-col justify-between">
            <span className="text-[10px] font-mono uppercase text-muted">Transition</span>
            <span className="font-mono text-xs text-slate-300 truncate">
              {transition ? `${transition.from} → ${transition.to}` : 'None'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
