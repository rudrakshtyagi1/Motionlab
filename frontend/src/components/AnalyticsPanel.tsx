/**
 * AnalyticsPanel.tsx — Master live computer-vision analytics dashboard container.
 *
 * Responsive right sidebar for 2-column desktop dashboard layout.
 * Controlled height matching camera workspace, zero page overflow on desktop.
 *
 * Ordering:
 *   1. Status Header (Active status & FPS)
 *   2. Hero Rep Counter & Phase Row (RepCounterCard + PhaseIndicator)
 *   3. Live Coaching Feedback (CoachingCard)
 *   4. Live Movement Metrics (FormMetrics)
 *   5. Session Quick Stats (SessionStats)
 *   6. Recent Repetitions Log (RepHistory)
 *   7. Collapsible Developer Debug Accordion (Debug panels)
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
    <aside className="w-full xl:w-[32%] flex flex-col gap-2 min-w-0 font-mono xl:h-full xl:max-h-full xl:overflow-y-auto custom-scrollbar pr-0.5">
      {/* ── 1. Top Session Status Header ───────────────────────────────────── */}
      <div className="glass rounded-xl px-3.5 py-2 flex items-center justify-between border border-surface-400/30 shrink-0">
        <div className="flex items-center gap-2">
          <span className={`status-dot ${personDetected ? 'bg-good animate-pulse-slow' : 'bg-warn'}`} />
          <span className="text-[10.5px] font-bold tracking-wider text-slate-200 uppercase">
            {personDetected ? 'ANALYSIS ACTIVE' : 'NO PERSON DETECTED'}
          </span>
        </div>
        <span className="text-xs text-accent font-semibold">
          {fps > 0 ? `${fps} FPS` : '— FPS'}
        </span>
      </div>

      {/* ── 2. Hero Rep Counter & Phase Row ───────────────────────────────── */}
      <div className="grid grid-cols-2 gap-2 shrink-0">
        <RepCounterCard repCount={repCount} />
        <PhaseIndicator phase={currentPhase} />
      </div>

      {/* ── 3. Live Coaching Feedback ─────────────────────────────────────── */}
      <div className="shrink-0">
        <CoachingCard feedback={formFeedback} />
      </div>

      {/* ── 4. Live Movement Metrics ──────────────────────────────────────── */}
      <div className="shrink-0">
        <FormMetrics features={features} analysis={formFeedback ?? undefined} />
      </div>

      {/* ── 5. Session Quick Stats ────────────────────────────────────────── */}
      <div className="shrink-0">
        <SessionStats />
      </div>

      {/* ── 6. Recent Repetitions Log ─────────────────────────────────────── */}
      <div className="shrink-0">
        <RepHistory />
      </div>

      {/* ── 7. Collapsible Developer Debug Section ────────────────────────── */}
      <div className="glass rounded-xl overflow-hidden border border-surface-400/30 shrink-0">
        <button
          onClick={() => setShowDebug(!showDebug)}
          className="w-full px-3.5 py-1.5 flex items-center justify-between text-[9.5px] uppercase text-muted hover:text-accent transition-colors bg-surface-300/40"
        >
          <span>DEVELOPER / DEBUG DIAGNOSTICS</span>
          <span>{showDebug ? '▲ HIDE' : '▼ SHOW'}</span>
        </button>

        {showDebug && (
          <div className="p-2.5 space-y-2.5 border-t border-surface-400/20">
            <DebugStatePanel stateResult={stateResult ?? null} />
            <DebugFeaturePanel features={features ?? null} isReliable={personDetected} />
            <DebugLandmarkPanel landmarks={landmarks ?? null} personDetected={personDetected} fps={fps} />
          </div>
        )}
      </div>
    </aside>
  )
}
