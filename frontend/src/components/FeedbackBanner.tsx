/**
 * FeedbackBanner.tsx — Real-time coaching feedback banner.
 *
 * Displays the primary real-time coaching cue from RuleBasedSquatAnalyzer.
 * Color-coded based on status (GOOD = green, WARNING = yellow/cyan, POOR = red).
 */

import type { LiveFormFeedback } from '@/types/analysis'

interface FeedbackBannerProps {
  feedback?: LiveFormFeedback | null
  primaryMessage?: string
}

function getBannerStyle(msg: string): { bg: string; border: string; text: string; icon: string } {
  if (msg.includes('GOOD')) {
    return {
      bg: 'bg-good/15',
      border: 'border-good/40',
      text: 'text-good',
      icon: '✓',
    }
  }
  if (msg.includes('DEEPER') || msg.includes('ALIGNMENT') || msg.includes('FORWARD')) {
    return {
      bg: 'bg-warn/15',
      border: 'border-warn/40',
      text: 'text-warn',
      icon: '⚠',
    }
  }
  if (msg.includes('LEANING') || msg.includes('CAVING') || msg.includes('INSUFFICIENT')) {
    return {
      bg: 'bg-danger/15',
      border: 'border-danger/40',
      text: 'text-danger',
      icon: '⛔',
    }
  }
  return {
    bg: 'bg-accent/15',
    border: 'border-accent/40',
    text: 'text-accent',
    icon: 'ℹ',
  }
}

export default function FeedbackBanner({ feedback, primaryMessage }: FeedbackBannerProps) {
  const msg = primaryMessage ?? feedback?.primaryMessage ?? '✓ GOOD FORM'
  const style = getBannerStyle(msg)

  return (
    <div className={`w-full rounded-xl px-5 py-3 border transition-all duration-300 flex items-center justify-between shadow-lg ${style.bg} ${style.border}`}>
      <div className="flex items-center gap-3">
        <span className={`text-base font-bold ${style.text}`}>{style.icon}</span>
        <span className={`font-mono text-sm font-bold tracking-wide uppercase ${style.text}`}>
          {msg}
        </span>
      </div>

      {feedback && (feedback.formScore ?? 0) > 0 && (
        <div className="flex items-center gap-2 font-mono text-xs text-slate-300">
          <span className="text-muted text-[10px] uppercase">Form Score</span>
          <span className="font-bold text-accent px-2 py-0.5 rounded bg-surface-300 border border-surface-400">
            {feedback.formScore}
          </span>
        </div>
      )}
    </div>
  )
}
