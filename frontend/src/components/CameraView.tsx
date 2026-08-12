/**
 * CameraView.tsx — Webcam feed component with video stream persistence & real-time debug overlay.
 */

import { useCallback, useEffect, useState } from 'react'
import type { UseCameraReturn } from '@/hooks/useCamera'
import { CAMERA_ERROR_MESSAGES } from '@/types/camera'
import type { PoseDetectorStatus } from '@/services/poseDetector'
import type { PoseLandmarks } from '@/types/landmarks'
import PoseSkeleton from '@/components/PoseSkeleton'

interface CameraViewProps {
  camera: UseCameraReturn
  poseStatus?: PoseDetectorStatus
  personDetected?: boolean
  landmarksRef?: React.RefObject<PoseLandmarks | null>
  onStopCustom?: () => void
}

function VideoDebugPanel({
  videoRef,
  stream,
}: {
  videoRef: React.RefObject<HTMLVideoElement>
  stream: MediaStream | null
}) {
  const [diag, setDiag] = useState<{
    hasSrcObject: boolean
    readyState: number
    videoWidth: number
    videoHeight: number
    paused: boolean
    ended: boolean
    trackState?: string
    trackEnabled?: boolean
    trackMuted?: boolean
    trackKind?: string
    trackLabel?: string
  } | null>(null)

  useEffect(() => {
    const interval = setInterval(() => {
      const video = videoRef.current
      const track = stream?.getVideoTracks()[0]

      if (!video) {
        setDiag(null)
        return
      }

      setDiag({
        hasSrcObject: video.srcObject !== null,
        readyState: video.readyState,
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight,
        paused: video.paused,
        ended: video.ended,
        trackState: track?.readyState,
        trackEnabled: track?.enabled,
        trackMuted: track?.muted,
        trackKind: track?.kind,
        trackLabel: track?.label,
      })
    }, 250)

    return () => clearInterval(interval)
  }, [videoRef, stream])

  if (!diag) return null

  return (
    <div className="absolute top-16 left-4 z-30 glass rounded-xl p-3 text-[10px] font-mono space-y-1.5 border border-surface-400/40 max-w-xs shadow-2xl">
      <div className="flex items-center justify-between border-b border-surface-400/30 pb-1">
        <span className="text-warn font-bold uppercase tracking-wider">VIDEO DEBUG</span>
        <span className={diag.hasSrcObject && diag.readyState >= 2 && !diag.paused && diag.videoWidth > 0 ? 'text-good' : 'text-danger font-bold'}>
          {diag.hasSrcObject && diag.readyState >= 2 && !diag.paused && diag.videoWidth > 0 ? 'FEED ACTIVE' : 'NO VIDEO FEED'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
        <div><span className="text-muted">srcObject:</span> <span className={diag.hasSrcObject ? 'text-good' : 'text-danger'}>{String(diag.hasSrcObject)}</span></div>
        <div><span className="text-muted">readyState:</span> <span className={diag.readyState >= 2 ? 'text-good' : 'text-warn'}>{diag.readyState}</span></div>
        <div><span className="text-muted">videoWidth:</span> <span className={diag.videoWidth > 0 ? 'text-good' : 'text-danger'}>{diag.videoWidth}px</span></div>
        <div><span className="text-muted">videoHeight:</span> <span className={diag.videoHeight > 0 ? 'text-good' : 'text-danger'}>{diag.videoHeight}px</span></div>
        <div><span className="text-muted">paused:</span> <span className={!diag.paused ? 'text-good' : 'text-warn'}>{String(diag.paused)}</span></div>
        <div><span className="text-muted">ended:</span> <span className={!diag.ended ? 'text-good' : 'text-danger'}>{String(diag.ended)}</span></div>
      </div>

      {diag.trackKind && (
        <div className="border-t border-surface-400/20 pt-1 space-y-0.5 text-[9px]">
          <span className="text-muted block font-semibold uppercase tracking-wider">Video Track</span>
          <div>
            <span className="text-muted">State:</span> <span className={diag.trackState === 'live' ? 'text-good' : 'text-danger'}>{diag.trackState}</span> | <span className="text-muted">En:</span> {String(diag.trackEnabled)} | <span className="text-muted">Mut:</span> {String(diag.trackMuted)}
          </div>
          <div className="text-slate-300 truncate">{diag.trackLabel}</div>
        </div>
      )}
    </div>
  )
}

function IconCamera({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
    </svg>
  )
}

function IconStop({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  )
}

function IconAlert({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  )
}

function IconLoader({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" d="M12 3v3M12 18v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M3 12h3M18 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" />
    </svg>
  )
}

function IdleOverlay({ onStart }: { onStart: () => void }) {
  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-8 px-8 bg-surface-100/90 backdrop-blur-sm">
      <div className="relative">
        <div className="w-20 h-20 rounded-2xl glass-accent flex items-center justify-center">
          <IconCamera className="w-9 h-9 text-accent" />
        </div>
        <div
          className="absolute inset-0 rounded-2xl animate-ping opacity-20"
          style={{ background: 'rgba(0,212,255,0.3)' }}
        />
      </div>
      <div className="text-center space-y-3">
        <h2 className="text-2xl font-bold text-slate-100">Ready to Analyze</h2>
        <p className="text-slate-400 text-sm max-w-xs leading-relaxed">
          MotionLab will use your webcam to track body position in real time.
          No video leaves your device.
        </p>
      </div>
      <div className="flex items-start gap-2.5 glass rounded-xl px-4 py-3 max-w-sm text-xs text-muted">
        <svg className="w-4 h-4 text-good shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
        </svg>
        <span>
          <strong className="text-slate-300">Privacy:</strong> Your camera feed is
          processed locally. MotionLab does not upload or store video.
        </span>
      </div>
      <button
        id="start-camera-btn"
        onClick={onStart}
        className="btn-primary group flex items-center gap-2.5 text-base px-10 py-3.5"
      >
        <IconCamera className="w-5 h-5" />
        Start Analysis
      </button>
    </div>
  )
}

function RequestingOverlay() {
  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-6 bg-surface-100/90 backdrop-blur-sm">
      <IconLoader className="w-10 h-10 text-accent animate-spin" />
      <div className="text-center space-y-1.5">
        <p className="text-slate-200 font-medium">Requesting camera access…</p>
        <p className="text-muted text-sm">Check the browser permission prompt above.</p>
      </div>
    </div>
  )
}

function StoppedOverlay({ onRestart }: { onRestart: () => void }) {
  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-6 bg-surface-100/90 backdrop-blur-sm">
      <div className="w-16 h-16 rounded-xl glass flex items-center justify-center opacity-50">
        <IconCamera className="w-7 h-7 text-muted" />
      </div>
      <div className="text-center space-y-1.5">
        <p className="text-slate-300 font-medium">Analysis stopped</p>
        <p className="text-muted text-sm">Your webcam has been released.</p>
      </div>
      <button id="restart-camera-btn" onClick={onRestart} className="btn-ghost text-sm">
        Restart Analysis
      </button>
    </div>
  )
}

function ErrorOverlay({
  errorType,
  onRetry,
}: {
  errorType: keyof typeof CAMERA_ERROR_MESSAGES
  onRetry: () => void
}) {
  const { title, detail } = CAMERA_ERROR_MESSAGES[errorType]
  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-6 px-8 bg-surface-100/90 backdrop-blur-sm">
      <div className="w-16 h-16 rounded-xl bg-danger/10 border border-danger/30 flex items-center justify-center">
        <IconAlert className="w-7 h-7 text-danger" />
      </div>
      <div className="text-center space-y-2">
        <p className="text-slate-200 font-semibold">{title}</p>
        <p className="text-muted text-sm max-w-xs leading-relaxed">{detail}</p>
      </div>
      {errorType === 'PERMISSION_DENIED' && (
        <div className="glass rounded-xl px-4 py-3 text-xs text-muted max-w-sm space-y-1">
          <p className="text-slate-400 font-medium mb-1.5">How to allow camera access:</p>
          <p>• <strong className="text-slate-300">Chrome:</strong> Click the 🔒 in the address bar → Camera → Allow</p>
          <p>• <strong className="text-slate-300">Firefox:</strong> Click the camera icon → Allow</p>
          <p>• <strong className="text-slate-300">Safari:</strong> Safari → Settings → Websites → Camera → Allow</p>
        </div>
      )}
      <button id="retry-camera-btn" onClick={onRetry} className="btn-ghost text-sm">
        Try Again
      </button>
    </div>
  )
}

export default function CameraView({
  camera,
  poseStatus,
  personDetected,
  landmarksRef,
  onStopCustom,
}: CameraViewProps) {
  const { videoRef, state, startCamera, stopCamera } = camera
  const handleRetry = useCallback(() => { startCamera() }, [startCamera])
  const handleStop = useCallback(() => {
    if (onStopCustom) {
      onStopCustom()
    } else {
      stopCamera()
    }
  }, [onStopCustom, stopCamera])

  return (
    <div
      className="relative w-full rounded-2xl overflow-hidden bg-surface-100 border border-surface-400/30 flex items-center justify-center"
      style={{ minHeight: '420px', minWidth: '100%' }}
    >
      <video
        ref={videoRef}
        id="motionlab-video"
        autoPlay
        muted
        playsInline
        className={`w-full h-full object-cover rounded-2xl transition-opacity duration-300 ${
          state.status === 'ACTIVE' ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        style={{ transform: 'scaleX(-1)', minHeight: '420px' }}
      />

      {state.status === 'ACTIVE' && landmarksRef && (
        <PoseSkeleton
          landmarksRef={landmarksRef}
          videoRef={videoRef}
          isActive={true}
        />
      )}

      {state.status === 'ACTIVE' && (
        <>
          <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
            <div className="flex items-center gap-2 glass px-3 py-1.5 rounded-full">
              <span className="status-dot bg-danger animate-pulse-slow" />
              <span className="text-xs font-mono text-slate-300 tracking-wider">LIVE</span>
            </div>

            {poseStatus === 'LOADING' && (
              <div className="flex items-center gap-1.5 glass px-3 py-1.5 rounded-full">
                <IconLoader className="w-3 h-3 text-warn animate-spin" />
                <span className="text-xs font-mono text-warn">Initializing pose detection...</span>
              </div>
            )}
            {poseStatus === 'READY' && (
              <div className="flex items-center gap-1.5 glass px-3 py-1.5 rounded-full">
                <span className={`status-dot ${personDetected ? 'bg-good animate-pulse-slow' : 'bg-warn'}`} />
                <span className={`text-xs font-mono ${personDetected ? 'text-good font-bold' : 'text-warn'}`}>
                  {personDetected ? 'Ready for analysis' : 'Move into the camera frame'}
                </span>
              </div>
            )}
            {poseStatus === 'ERROR' && (
              <div className="flex items-center gap-1.5 glass px-3 py-1.5 rounded-full">
                <span className="status-dot bg-danger" />
                <span className="text-xs font-mono text-danger">Pose model failure</span>
              </div>
            )}
          </div>

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20">
            <button
              id="stop-camera-btn"
              onClick={handleStop}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl
                         bg-danger/20 border border-danger/40 text-danger text-sm font-medium
                         hover:bg-danger/30 hover:border-danger/60
                         transition-all duration-200 active:scale-95"
            >
              <IconStop className="w-4 h-4" />
              Stop Analysis
            </button>
          </div>

          <div className="absolute bottom-4 left-4 z-20 glass px-3 py-1.5 rounded-full
                          flex items-center gap-2 text-xs text-slate-300 font-mono">
            <span className="status-dot bg-good" />
            Camera connected
          </div>
        </>
      )}

      <VideoDebugPanel videoRef={videoRef} stream={camera.state.stream} />

      {state.status === 'IDLE' && <IdleOverlay onStart={startCamera} />}
      {state.status === 'REQUESTING' && <RequestingOverlay />}
      {state.status === 'STOPPED' && !state.error && <StoppedOverlay onRestart={startCamera} />}
      {state.status === 'ERROR' && state.error && <ErrorOverlay errorType={state.error.type} onRetry={handleRetry} />}
    </div>
  )
}
