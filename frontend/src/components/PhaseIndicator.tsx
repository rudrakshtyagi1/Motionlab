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
    <div className="glass rounded-xl p-2.5 flex flex-col justify-between border border-surface-400/30 font-mono min-h-[64px]">
      <span className="text-[9px] uppercase text-slate-300 tracking-wider">
        Current Phase
      </span>
      <span className={`px-2 py-1 mt-1 rounded-lg text-xs font-bold text-center border tracking-wider uppercase transition-all ${style.bg} ${style.text} ${style.border}`}>
        {phase}
      </span>
    </div>
  )
}
