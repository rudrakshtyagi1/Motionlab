/**
 * PhaseIndicator.tsx — Current squat movement phase indicator component.
 *
 * Displays state machine output: STANDING, DESCENDING, BOTTOM, ASCENDING, or UNAVAILABLE.
 */

import type { SquatState } from '@/types/analysis'

interface PhaseIndicatorProps {
  phase: SquatState
}

function getPhaseBadgeStyle(phase: SquatState): { bg: string; text: string; border: string } {
  switch (phase) {
    case 'STANDING':
      return { bg: 'bg-good/15', text: 'text-good', border: 'border-good/40' }
    case 'DESCENDING':
      return { bg: 'bg-warn/15', text: 'text-warn', border: 'border-warn/40' }
    case 'BOTTOM':
      return { bg: 'bg-accent/20', text: 'text-accent font-bold', border: 'border-accent/40' }
    case 'ASCENDING':
      return { bg: 'bg-cyan-500/15', text: 'text-cyan-300', border: 'border-cyan-500/40' }
    case 'UNAVAILABLE':
    default:
      return { bg: 'bg-surface-400/20', text: 'text-muted', border: 'border-surface-400/40' }
  }
}

export default function PhaseIndicator({ phase }: PhaseIndicatorProps) {
  const style = getPhaseBadgeStyle(phase)

  return (
    <div className="glass rounded-xl p-3 flex items-center justify-between border border-surface-400/30">
      <span className="text-[10px] font-mono uppercase text-slate-300 tracking-wider">
        Current Phase
      </span>
      <span className={`px-3 py-1 rounded-full text-xs font-mono border font-semibold tracking-wide ${style.bg} ${style.text} ${style.border}`}>
        {phase}
      </span>
    </div>
  )
}
