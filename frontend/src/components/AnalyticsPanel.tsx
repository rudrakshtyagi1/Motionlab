/**
 * AnalyticsPanel.tsx — Master live computer-vision analytics dashboard container.
 *
 * Composes sub-components into a clean, technical, high-contrast dashboard hierarchy:
 *   1. Session Status Header (Active status, person detection, FPS)
 *   2. Hero Rep Counter (RepCounterCard)
 *   3. Current Squat Phase (PhaseIndicator)
 *   4. Live Form Analysis Metrics (FormMetrics)
 *   5. Live Coaching Feedback (CoachingCard)
 *   6. Session Quick Stats (SessionStats)
 *   7. Recent Repetitions History (RepHistory)
 *   8. Collapsible ADVANCED / DEBUG Drawer (developer diagnostics)
 */

import { useState } from 'react'
import type { SquatFeatures, SquatStateResult, LiveFormFeedback } from '@/types/analysis'
import type { RepCounterResult } from '@/types/session'
import type { PoseLandmarks } from '@/types/landmarks'

import RepCounterCard from '@/components/RepCounterCard'
import PhaseIndicator from '@/components/PhaseIndicator'
import FormMetrics from '@/components/FormMetrics'
import CoachingCard from '@/components/CoachingCard'
import SessionStats from '@/components/SessionStats'
import RepHistory from '@/components/RepHistory'

import DebugStatePanel from '@/components/DebugStatePanel'
import DebugFeaturePanel from '@/components/DebugFeaturePanel'
import DebugLandmarkPanel from '@/components/DebugLandmarkPanel'

interface AnalyticsPanelProps {
  personDetected: boolean
  fps: number
  stateResult?: SquatStateResult | null
  repResult?: RepCounterResult | null
  formFeedback?: LiveFormFeedback | null
  features?: SquatFeatures | null
  landmarks?: PoseLandmarks | null
}

export default function AnalyticsPanel({
  personDetected,
  fps,
  stateResult,
  repResult,
  formFeedback,
  features,
  landmarks,
}: AnalyticsPanelProps) {
  const [showDebug, setShowDebug] = useState(false)

  const repCount = repResult?.repCount ?? 0
  const currentPhase = stateResult?.state ?? 'UNAVAILABLE'

  return (
    <aside className="w-full xl:w-80 flex flex-col gap-3 min-w-0 font-mono">
      {/* ── 1. Top Session Status Header ───────────────────────────────────── */}
      <div className="glass rounded-xl px-4 py-2.5 flex items-center justify-between border border-surface-400/30">
        <div className="flex items-center gap-2">
          <span className={`status-dot ${personDetected ? 'bg-good animate-pulse-slow' : 'bg-muted'}`} />
          <span className="text-xs font-bold tracking-wider text-slate-200 uppercase">
            {personDetected ? 'ANALYSIS ACTIVE' : 'NO PERSON DETECTED'}
          </span>
        </div>
        <span className="text-xs text-accent font-semibold">
          {fps > 0 ? `${fps} FPS` : '— FPS'}
        </span>
      </div>

      {/* ── 2. Hero Rep Counter ───────────────────────────────────────────── */}
      <RepCounterCard repCount={repCount} />

      {/* ── 3. Current Squat Phase ────────────────────────────────────────── */}
      <PhaseIndicator phase={currentPhase} />

      {/* ── 4. Live Coaching Feedback ─────────────────────────────────────── */}
      <CoachingCard feedback={formFeedback} />

      {/* ── 5. Live Movement Metrics ──────────────────────────────────────── */}
      <FormMetrics features={features} analysis={formFeedback ?? undefined} />

      {/* ── 6. Session Quick Stats ────────────────────────────────────────── */}
      <SessionStats />

      {/* ── 7. Recent Repetitions Log ─────────────────────────────────────── */}
      <RepHistory />

      {/* ── 8. Collapsible Developer Debug Section ────────────────────────── */}
      <div className="glass rounded-xl overflow-hidden border border-surface-400/30">
        <button
          onClick={() => setShowDebug(!showDebug)}
          className="w-full px-4 py-2 flex items-center justify-between text-[10px] uppercase text-muted hover:text-accent transition-colors bg-surface-300/40"
        >
          <span>ADVANCED / DEVELOPER DEBUG</span>
          <span>{showDebug ? '▲ HIDE' : '▼ SHOW'}</span>
        </button>

        {showDebug && (
          <div className="p-3 space-y-3 border-t border-surface-400/20">
            <DebugStatePanel stateResult={stateResult ?? null} />
            <DebugFeaturePanel features={features ?? null} isReliable={personDetected} />
            <DebugLandmarkPanel landmarks={landmarks ?? null} personDetected={personDetected} fps={fps} />
          </div>
        )}
      </div>
    </aside>
  )
}
