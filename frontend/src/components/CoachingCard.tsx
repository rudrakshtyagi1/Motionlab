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
    <div className="glass rounded-xl p-3.5 space-y-2 border border-surface-400/30">
      <span className="text-[10px] font-mono uppercase text-slate-300 tracking-wider">
        Live Coaching
      </span>

      <div className={`rounded-lg px-4 py-3 border font-mono text-xs font-bold tracking-wide uppercase transition-all duration-300 ${style}`}>
        {message}
      </div>
    </div>
  )
}
