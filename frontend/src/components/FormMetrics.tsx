/**
 * FormMetrics.tsx — Live movement metrics grid component.
 *
 * Displays numerical and categorical values for Knee Angle, Torso Lean, Knee Alignment, and Stability.
 * Shows "—" when data is unavailable.
 */

import type { FormAnalysis, SquatFeatures } from '@/types/analysis'

interface FormMetricsProps {
  features?: SquatFeatures | null
  analysis?: FormAnalysis | null
}

export default function FormMetrics({ features, analysis }: FormMetricsProps) {
  const kneeAngle = features?.kneeAngle !== null && features?.kneeAngle !== undefined
    ? `${Math.round(features.kneeAngle)}°`
    : '—'

  const torsoLean = features?.torsoInclination !== null && features?.torsoInclination !== undefined
    ? `${Math.round(features.torsoInclination)}°`
    : '—'

  const kneeTrackingStatus = analysis?.kneeAlignment.status ?? '—'
  const stabilityStatus = analysis?.stability.status ?? '—'

  return (
    <div className="glass rounded-xl p-3 space-y-2.5 border border-surface-400/30">
      <div className="text-[10px] font-mono uppercase text-accent tracking-wider font-semibold">
        Live Movement Metrics
      </div>

      <div className="grid grid-cols-2 gap-2 font-mono">
        {/* Knee Angle */}
        <div className="glass-accent rounded-lg p-2.5 flex flex-col">
          <span className="text-[9px] uppercase text-muted tracking-wider">Knee Angle</span>
          <span className="text-xl font-bold text-slate-100">{kneeAngle}</span>
        </div>

        {/* Torso Lean */}
        <div className="glass-accent rounded-lg p-2.5 flex flex-col">
          <span className="text-[9px] uppercase text-muted tracking-wider">Torso Lean</span>
          <span className="text-xl font-bold text-slate-100">{torsoLean}</span>
        </div>

        {/* Knee Alignment */}
        <div className="glass-accent rounded-lg p-2.5 flex flex-col justify-between">
          <span className="text-[9px] uppercase text-muted tracking-wider">Knee Tracking</span>
          <span className={`text-xs font-bold uppercase mt-1 ${
            kneeTrackingStatus === 'GOOD' ? 'text-good' : kneeTrackingStatus === 'WARNING' ? 'text-warn' : kneeTrackingStatus === 'POOR' ? 'text-danger' : 'text-muted'
          }`}>
            {kneeTrackingStatus}
          </span>
        </div>

        {/* Stability */}
        <div className="glass-accent rounded-lg p-2.5 flex flex-col justify-between">
          <span className="text-[9px] uppercase text-muted tracking-wider">Stability</span>
          <span className={`text-xs font-bold uppercase mt-1 ${
            stabilityStatus === 'GOOD' ? 'text-good' : stabilityStatus === 'WARNING' ? 'text-warn' : stabilityStatus === 'POOR' ? 'text-danger' : 'text-muted'
          }`}>
            {stabilityStatus}
          </span>
        </div>
      </div>
    </div>
  )
}
