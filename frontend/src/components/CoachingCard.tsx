/**
 * CoachingCard.tsx — Live coaching feedback card component.
 *
 * Displays primary real-time coaching cue from RuleBasedSquatAnalyzer.
 */

import type { LiveFormFeedback } from '@/types/analysis'

interface CoachingCardProps {
  feedback?: LiveFormFeedback | null
}

export default function CoachingCard({ feedback }: CoachingCardProps) {
  const message = feedback?.primaryMessage ?? '✓ GOOD FORM'
  const isGood = message.includes('GOOD')
  const isWarning = message.includes('DEEPER') || message.includes('ALIGNMENT') || message.includes('UPRIGHT') || message.includes('STABILITY')
  const isPoor = message.includes('CAVING') || message.includes('LEANING') || message.includes('INSUFFICIENT')

  const style = isGood
    ? 'bg-good/15 border-good/40 text-good'
    : isWarning
    ? 'bg-warn/15 border-warn/40 text-warn'
    : isPoor
    ? 'bg-danger/15 border-danger/40 text-danger'
    : 'bg-accent/15 border-accent/40 text-accent'

  return (
    <div className="glass rounded-xl p-2.5 space-y-1.5 border border-surface-400/30 font-mono">
      <span className="text-[9px] uppercase text-slate-300 tracking-wider block font-semibold">
        Live Coaching
      </span>

      <div className={`rounded-lg px-3 py-2 border text-xs font-bold tracking-wide uppercase transition-all duration-300 truncate ${style}`}>
        {message}
      </div>
    </div>
  )
}
