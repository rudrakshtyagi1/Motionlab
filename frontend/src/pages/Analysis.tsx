/**
 * Analysis.tsx — Production-grade MotionLab real-time computer-vision movement analysis page.
 *
 * Integrates:
 *   1. Native browser webcam stream (useCamera & CameraView)
 *   2. MediaPipe Pose Landmarker WASM inference (usePoseDetector)
 *   3. Real-time anatomical pose skeleton canvas overlay (PoseSkeleton)
 *   4. Vector dot-product feature extraction & smoothing (extractFeatures)
 *   5. Squat movement phase state machine (SquatStateMachine)
 *   6. Robust repetition counter with timing & depth records (RepCounter)
 *   7. Rule-based squat form analyzer & coaching feedback (RuleBasedSquatAnalyzer)
 *   8. Polished live computer-vision analytics dashboard (AnalyticsPanel)
 *   9. Post-session performance report & summary overlay modal (SessionSummary)
 */

import { useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCamera } from '@/hooks/useCamera'
import { usePoseDetector } from '@/hooks/usePoseDetector'
import { useSessionStore } from '@/store/sessionStore'
import { useProfileStore } from '@/store/profileStore'

import CameraView from '@/components/CameraView'
import FeedbackBanner from '@/components/FeedbackBanner'
import AnalyticsPanel from '@/components/AnalyticsPanel'
import SessionSummary from '@/components/SessionSummary'

export default function Analysis() {
  const navigate = useNavigate()
  const profile = useProfileStore(s => s.profile)

  // ── Session store state ──────────────────────────────────────────────────
  const sessionStatus = useSessionStore(s => s.status)
  const sessionSummary = useSessionStore(s => s.summary)
  const stopSession = useSessionStore(s => s.stopSession)
  const resetSession = useSessionStore(s => s.resetSession)

  // ── Camera hook — owns the videoRef ──────────────────────────────────────
  const camera = useCamera()

  // ── Pose detector hook — reads from the same videoRef ────────────────────
  const {
    poseStatus,
    poseError,
    personDetected,
    fps,
    landmarksRef,
    debugLandmarks,
    debugFeatures,
    debugStateResult,
    debugRepResult,
    debugFormFeedback,
    startPoseDetection,
    stopPoseDetection,
  } = usePoseDetector(camera.videoRef)

  // ── Sync camera ↔ pose detector ───────────────────────────────────────────
  useEffect(() => {
    if (camera.state.status === 'ACTIVE') {
      startPoseDetection()
    } else {
      stopPoseDetection()
    }
  }, [camera.state.status, startPoseDetection, stopPoseDetection])

  // ── Stop analysis handler: stops hardware & finalizes summary ────────────
  const handleStopAnalysis = useCallback(() => {
    stopPoseDetection()
    camera.stopCamera()
    stopSession()
  }, [camera, stopPoseDetection, stopSession])

  // ── Restart session handler: clears summary & resets to ready state ──────
  const handleRestartSession = useCallback(() => {
    resetSession()
    stopPoseDetection()
    camera.stopCamera()
  }, [camera, resetSession, stopPoseDetection])

  return (
    <main className="relative min-h-screen bg-surface text-slate-100 flex flex-col">

      {/* ── Background grid ───────────────────────────────────────────────── */}
      <div
        className="pointer-events-none absolute inset-0 opacity-50"
        aria-hidden="true"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0,212,255,0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,212,255,0.02) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />

      {/* ── Top nav ───────────────────────────────────────────────────────── */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-surface-400/30">
        <div className="flex items-center gap-3">
          <button
            id="nav-back-btn"
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 text-muted hover:text-accent transition-colors text-sm"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Home
          </button>
          <span className="text-surface-400">·</span>
          <span className="font-mono font-bold text-base tracking-[0.2em] text-accent">
            MOTION<span className="text-slate-100">LAB</span>
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono">
          <button onClick={() => navigate('/history')} className="text-muted hover:text-slate-100 transition-colors">
            History
          </button>
          <button onClick={() => navigate('/profile')} className="glass-accent px-3 py-1 rounded-full text-accent font-bold hover:bg-surface-300">
            {profile.mode === 'profile' ? `👤 ${profile.name}` : 'Guest Mode'}
          </button>
        </div>
      </nav>

      {/* ── Main content ──────────────────────────────────────────────────── */}
      <div className="relative z-10 flex flex-1 flex-col xl:flex-row gap-5 p-5">

        {/* ── Left column: Camera feed + Live Coaching Banner ─────────────── */}
        <section className="flex flex-col gap-4 flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="label-mono text-accent">Live Computer-Vision Feed</span>
            <PoseStatusBadge status={poseStatus} error={poseError} />
          </div>

          {/* Camera component */}
          <CameraView
            camera={camera}
            poseStatus={poseStatus}
            personDetected={personDetected}
            landmarksRef={landmarksRef}
            onStopCustom={handleStopAnalysis}
          />

          {/* Real-time coaching feedback banner */}
          <FeedbackBanner feedback={debugFormFeedback} />

          {/* Privacy footer */}
          <div className="flex items-center gap-2 text-xs text-muted px-1">
            <svg className="w-3.5 h-3.5 text-good shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
            Your camera feed is processed locally in WebAssembly. MotionLab does not upload or store video.
          </div>
        </section>

        {/* ── Right column: Polished Analytics Dashboard ───────────────────── */}
        <AnalyticsPanel
          personDetected={personDetected}
          fps={fps}
          stateResult={debugStateResult}
          repResult={debugRepResult}
          formFeedback={debugFormFeedback}
          features={debugFeatures}
          landmarks={debugLandmarks}
        />
      </div>

      {/* ── Session Summary Modal (Opens on Session Complete) ────────────── */}
      {sessionStatus === 'COMPLETE' && (
        <SessionSummary
          summary={sessionSummary}
          onRestart={handleRestartSession}
        />
      )}
    </main>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PoseStatusBadge({
  status,
  error,
}: {
  status: import('@/services/poseDetector').PoseDetectorStatus
  error: string | null
}) {
  if (status === 'IDLE') {
    return (
      <span className="text-xs text-muted font-mono opacity-40">
        Pose tracking · starts with camera
      </span>
    )
  }
  if (status === 'LOADING') {
    return (
      <span className="flex items-center gap-1.5 text-xs text-warn font-mono">
        <span className="w-1.5 h-1.5 rounded-full bg-warn animate-pulse" />
        Loading pose model…
      </span>
    )
  }
  if (status === 'READY') {
    return (
      <span className="flex items-center gap-1.5 text-xs text-good font-mono">
        <span className="w-1.5 h-1.5 rounded-full bg-good" />
        Pose detection ready
      </span>
    )
  }
  if (status === 'ERROR') {
    return (
      <span className="flex items-center gap-1.5 text-xs text-danger font-mono" title={error ?? ''}>
        <span className="w-1.5 h-1.5 rounded-full bg-danger" />
        Pose detection failed
      </span>
    )
  }
  return null
}
