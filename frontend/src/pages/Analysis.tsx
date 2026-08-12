/**
 * Analysis.tsx — Production-grade MotionLab real-time computer-vision movement analysis page.
 *
 * True 2-Column Responsive Desktop Dashboard Layout (68% Camera / 32% Analytics).
 * Fits all essential analytics above the fold at 1366x768 and 1440x900 viewports without page scroll.
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
    <main className="relative h-screen max-h-screen bg-surface text-slate-100 flex flex-col overflow-hidden font-sans">

      {/* ── Background grid ───────────────────────────────────────────────── */}
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
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
      <nav className="relative z-10 flex items-center justify-between px-6 py-2.5 border-b border-surface-400/30 shrink-0 h-[50px]">
        <div className="flex items-center gap-3">
          <button
            id="nav-back-btn"
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 text-muted hover:text-accent transition-colors text-xs font-mono"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Home
          </button>
          <span className="text-surface-400">·</span>
          <span className="font-mono font-bold text-sm tracking-[0.2em] text-accent">
            MOTION<span className="text-slate-100">LAB</span>
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs font-mono">
          <button onClick={() => navigate('/history')} className="text-muted hover:text-slate-100 transition-colors">
            History
          </button>
          <button onClick={() => navigate('/profile')} className="glass-accent px-2.5 py-0.5 rounded-full text-accent font-bold hover:bg-surface-300">
            {profile.mode === 'profile' ? `👤 ${profile.name}` : 'Guest Mode'}
          </button>
        </div>
      </nav>

      {/* ── Main content: True 2-Column Responsive Dashboard ─────────────── */}
      <div className="relative z-10 flex flex-1 flex-col xl:flex-row gap-3.5 p-3.5 overflow-hidden max-h-[calc(100vh-50px)]">

        {/* ── Left column: Camera workspace (~68% width on desktop) ──────── */}
        <section className="flex flex-col gap-2.5 flex-1 xl:w-[68%] min-w-0 h-full justify-between overflow-hidden">
          <div className="flex items-center justify-between shrink-0">
            <span className="label-mono text-accent text-xs">Live Computer-Vision Feed</span>
            <PoseStatusBadge status={poseStatus} error={poseError} />
          </div>

          {/* Camera View Component */}
          <CameraView
            camera={camera}
            poseStatus={poseStatus}
            personDetected={personDetected}
            landmarksRef={landmarksRef}
            onStopCustom={handleStopAnalysis}
          />

          {/* Real-time coaching feedback banner */}
          <div className="shrink-0">
            <FeedbackBanner feedback={debugFormFeedback} />
          </div>

          {/* Privacy footer */}
          <div className="flex items-center gap-2 text-[10.5px] font-mono text-muted px-1 shrink-0">
            <svg className="w-3.5 h-3.5 text-good shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
            Camera stream is processed locally in WebAssembly. Video is never uploaded.
          </div>
        </section>

        {/* ── Right column: Compact Analytics Dashboard (~32% width) ──────── */}
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
