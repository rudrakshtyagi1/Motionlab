/**
 * RepCounterCard.tsx — Hero repetition counter card component.
 *
 * Displays visually prominent two-digit repetition count (e.g. "08")
 * derived directly from RepCounter / sessionStore.
 */

import { useEffect, useState } from 'react'

interface RepCounterCardProps {
  repCount: number
}

export default function RepCounterCard({ repCount }: RepCounterCardProps) {
  const formattedCount = String(repCount).padStart(2, '0')
  const [animate, setAnimate] = useState(false)

  useEffect(() => {
    if (repCount > 0) {
      setAnimate(true)
      const timer = setTimeout(() => setAnimate(false), 500)
      return () => clearTimeout(timer)
    }
  }, [repCount])

  return (
    <div className="relative glass-accent rounded-xl p-4 flex items-center justify-between overflow-hidden shadow-lg border border-accent/20">
      <div>
        <span className="text-[10px] font-mono uppercase text-muted tracking-wider block">
          Completed Reps
        </span>
        <span
          className={`text-5xl font-mono font-extrabold text-slate-100 tracking-tight transition-transform duration-300 inline-block ${
            animate ? 'scale-110 text-good' : 'scale-100'
          }`}
        >
          {formattedCount}
        </span>
      </div>

      <div className="flex flex-col items-end gap-1">
        <span className="glass px-2.5 py-1 rounded-full text-[10px] font-mono text-accent uppercase tracking-widest border border-accent/30">
          SQUAT ANALYSIS
        </span>
        <span className="text-[10px] font-mono text-muted/60">
          Real-Time Counter
        </span>
      </div>
    </div>
  )
}
