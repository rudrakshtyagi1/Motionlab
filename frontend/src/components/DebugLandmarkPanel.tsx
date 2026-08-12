/**
 * DebugLandmarkPanel.tsx — Development-only real-time landmark inspector.
 *
 * Displays actual landmark coordinates from MediaPipe to verify:
 *   1. The model is running (not stubbed/mocked)
 *   2. Coordinates change when the user moves
 *   3. Visibility scores reflect occlusion correctly
 *   4. Real-time inference FPS calculation
 *
 * This component is for DEVELOPMENT verification only (Step 3 & 4).
 * It will be replaced by the analytics panel in Steps 9–10.
 */

import type { PoseLandmarks } from '@/types/landmarks'
import { isVisible, VISIBILITY_THRESHOLD } from '@/types/landmarks'

// ─── Individual landmark row ──────────────────────────────────────────────────

interface LandmarkRowProps {
  label: string
  landmark: { x: number; y: number; z: number; visibility: number }
}

function LandmarkRow({ label, landmark }: LandmarkRowProps) {
  const visible = isVisible(landmark)

  return (
    <div className={`grid grid-cols-5 gap-1 py-1 border-b border-surface-400/20 text-xs font-mono
                     ${visible ? 'text-slate-300' : 'text-muted/50'}`}>
      <span className={`col-span-1 font-sans font-medium text-[10px] truncate ${visible ? 'text-slate-200' : 'text-muted/40'}`}>
        {label}
      </span>
      <span className="text-right">{landmark.x.toFixed(3)}</span>
      <span className="text-right">{landmark.y.toFixed(3)}</span>
      <span className="text-right">{landmark.z.toFixed(3)}</span>
      <span className={`text-right ${
        landmark.visibility >= 0.8  ? 'text-good' :
        landmark.visibility >= 0.5  ? 'text-warn' :
        'text-danger'
      }`}>
        {landmark.visibility.toFixed(2)}
      </span>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface DebugLandmarkPanelProps {
  landmarks: PoseLandmarks | null
  personDetected: boolean
  fps?: number
}

/**
 * DebugLandmarkPanel — shows real MediaPipe landmark data & FPS for verification.
 */
export default function DebugLandmarkPanel({ landmarks, personDetected, fps = 0 }: DebugLandmarkPanelProps) {
  return (
    <div className="glass rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-surface-400/30
                      bg-surface-300/50">
        <div className="flex items-center gap-2">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-warn animate-pulse-slow" />
          <span className="text-[10px] font-mono tracking-widest text-warn uppercase">
            Dev · Inspector
          </span>
        </div>
        <div className="flex items-center gap-3">
          {fps > 0 && (
            <span className="text-[10px] font-mono text-accent font-semibold">
              {fps} FPS
            </span>
          )}
          <div className="flex items-center gap-1.5">
            <span className={`status-dot ${personDetected ? 'bg-good' : 'bg-muted'}`} />
            <span className="text-[10px] font-mono text-muted">
              {personDetected ? 'DETECTED' : 'NO PERSON'}
            </span>
          </div>
        </div>
      </div>

      {/* No landmarks state */}
      {!landmarks && (
        <div className="px-4 py-5 text-center">
          <p className="text-xs text-muted">
            {personDetected
              ? 'Receiving landmarks…'
              : 'Stand in front of the camera to see landmark data & skeleton.'}
          </p>
        </div>
      )}

      {/* Landmark data */}
      {landmarks && (
        <div className="px-4 py-2">
          {/* Summary */}
          <div className="flex items-center justify-between py-2 mb-1">
            <span className="text-xs text-slate-300 font-medium">
              33 landmarks detected
            </span>
            <span className="text-[10px] text-muted font-mono">
              thresh: {VISIBILITY_THRESHOLD}
            </span>
          </div>

          {/* Column headers */}
          <div className="grid grid-cols-5 gap-1 pb-1 text-[9px] font-mono text-muted/60 uppercase tracking-wider border-b border-surface-400/30">
            <span>Landmark</span>
            <span className="text-right">X</span>
            <span className="text-right">Y</span>
            <span className="text-right">Z</span>
            <span className="text-right">Vis</span>
          </div>

          {/* Key landmarks for squat analysis */}
          <div className="mt-1 space-y-0">
            <div className="py-1 text-[9px] text-muted/50 font-mono uppercase tracking-wider">
              — Upper Body —
            </div>
            <LandmarkRow label="Nose"          landmark={landmarks.nose} />
            <LandmarkRow label="L.Shoulder"    landmark={landmarks.leftShoulder} />
            <LandmarkRow label="R.Shoulder"    landmark={landmarks.rightShoulder} />
            <LandmarkRow label="L.Elbow"       landmark={landmarks.leftElbow} />
            <LandmarkRow label="R.Elbow"       landmark={landmarks.rightElbow} />

            <div className="py-1 text-[9px] text-muted/50 font-mono uppercase tracking-wider">
              — Hips & Legs —
            </div>
            <LandmarkRow label="L.Hip"         landmark={landmarks.leftHip} />
            <LandmarkRow label="R.Hip"         landmark={landmarks.rightHip} />
            <LandmarkRow label="L.Knee"        landmark={landmarks.leftKnee} />
            <LandmarkRow label="R.Knee"        landmark={landmarks.rightKnee} />
            <LandmarkRow label="L.Ankle"       landmark={landmarks.leftAnkle} />
            <LandmarkRow label="R.Ankle"       landmark={landmarks.rightAnkle} />
            <LandmarkRow label="L.Heel"        landmark={landmarks.leftHeel} />
            <LandmarkRow label="R.Heel"        landmark={landmarks.rightHeel} />
          </div>

          {/* Coordinate system reference */}
          <div className="mt-3 pt-2 border-t border-surface-400/20">
            <p className="text-[9px] text-muted/50 leading-relaxed font-mono">
              x/y ∈ [0,1] normalized · y↑ = up in image space ↓ in coords<br />
              z = depth rel. hip · vis = model confidence
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
