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
    <div className="relative glass-accent rounded-xl p-2.5 flex flex-col justify-between overflow-hidden shadow-lg border border-accent/20 font-mono min-h-[64px]">
      <span className="text-[9px] uppercase text-muted tracking-wider">
        Completed Reps
      </span>

      <div className="flex items-baseline justify-between mt-1">
        <span
          className={`text-3xl font-extrabold text-slate-100 tracking-tight transition-transform duration-300 inline-block ${
            animate ? 'scale-110 text-good' : 'scale-100'
          }`}
        >
          {formattedCount}
        </span>
        <span className="text-[9px] text-accent uppercase font-bold tracking-wider glass px-1.5 py-0.5 rounded border border-accent/30">
          SQUATS
        </span>
      </div>
    </div>
  )
}
