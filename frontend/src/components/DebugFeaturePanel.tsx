/**
 * DebugFeaturePanel.tsx — Development-only real-time biomechanical feature panel.
 *
 * Displays live numerical features computed by `featureExtractor.ts`:
 *   - Knee angles (left, right, average)
 *   - Hip angles (left, right, average)
 *   - Torso inclination from vertical
 *   - Left/right knee angle symmetry
 *   - Lateral knee alignment offsets
 *
 * All values are derived dynamically from the active pose landmarks.
 * None are fabricated or hardcoded.
 */

import type { SquatFeatures } from '@/types/analysis'

interface DebugFeaturePanelProps {
  features: SquatFeatures | null
  isReliable?: boolean
}

function FormatValue({ val, unit = '°' }: { val: number | null; unit?: string }) {
  if (val === null || val === undefined) {
    return <span className="text-muted/40 font-mono">--</span>
  }
  return (
    <span className="font-mono text-slate-100 font-medium">
      {val}{unit}
    </span>
  )
}

export default function DebugFeaturePanel({ features, isReliable }: DebugFeaturePanelProps) {
  const reliable = isReliable ?? features?.isReliable ?? false

  return (
    <div className="glass rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-surface-400/30 bg-surface-300/50">
        <div className="flex items-center gap-2">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent animate-pulse-slow" />
          <span className="text-[10px] font-mono tracking-widest text-accent uppercase">
            Dev · Live Features
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`status-dot ${reliable ? 'bg-good' : 'bg-warn'}`} />
          <span className="text-[10px] font-mono text-muted">
            {reliable ? 'RELIABLE' : 'UNRELIABLE'}
          </span>
        </div>
      </div>

      {!features || !reliable ? (
        <div className="px-4 py-5 text-center">
          <p className="text-xs text-muted">
            {!features
              ? 'Start camera & pose detection to view biomechanical features.'
              : 'Position full body in frame for reliable angle calculations.'}
          </p>
        </div>
      ) : (
        <div className="p-4 space-y-3">
          {/* Knee Angles */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-mono uppercase text-muted tracking-wider">
                Knee Angles
              </span>
              <span className="text-xs text-accent font-mono font-bold">
                Avg <FormatValue val={features.kneeAngle} />
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 glass-accent rounded-lg p-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Left Knee</span>
                <FormatValue val={features.leftKneeAngle} />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Right Knee</span>
                <FormatValue val={features.rightKneeAngle} />
              </div>
            </div>
          </div>

          {/* Hip Angles */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-mono uppercase text-muted tracking-wider">
                Hip Angles
              </span>
              <span className="text-xs text-accent font-mono font-bold">
                Avg <FormatValue val={features.hipAngle} />
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 glass-accent rounded-lg p-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Left Hip</span>
                <FormatValue val={features.leftHipAngle} />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Right Hip</span>
                <FormatValue val={features.rightHipAngle} />
              </div>
            </div>
          </div>

          {/* Torso & Symmetry */}
          <div className="grid grid-cols-2 gap-2">
            <div className="glass rounded-lg p-2 text-xs flex flex-col gap-1">
              <span className="text-[10px] font-mono uppercase text-muted">Torso Lean</span>
              <div className="text-sm font-semibold">
                <FormatValue val={features.torsoInclination} />
              </div>
            </div>
            <div className="glass rounded-lg p-2 text-xs flex flex-col gap-1">
              <span className="text-[10px] font-mono uppercase text-muted">Knee Symmetry</span>
              <div className="text-sm font-semibold">
                <FormatValue val={features.kneeAngleSymmetry} />
              </div>
            </div>
          </div>

          {/* Alignment Offsets */}
          <div className="glass rounded-lg p-2 text-xs space-y-1">
            <div className="flex justify-between items-center text-[10px] text-muted font-mono uppercase border-b border-surface-400/20 pb-1">
              <span>Knee-Ankle Offset</span>
              <span>Raw (x)</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Left</span>
              <FormatValue val={features.leftKneeAnkleOffset} unit="" />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Right</span>
              <FormatValue val={features.rightKneeAnkleOffset} unit="" />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
