/**
 * usePoseDetector.ts — React hook for real-time pose detection, features, state machine, rep counter, & form analyzer.
 *
 * Manages the complete inference & analysis pipeline:
 *   1. Initialize PoseDetectorService (download WASM + model)
 *   2. Run a requestAnimationFrame loop feeding frames to MediaPipe
 *   3. Extract numerical biomechanical features via extractFeatures()
 *   4. Update SquatStateMachine to determine current movement phase
 *   5. Process RepCounter to validate and count completed repetitions
 *   6. Run RuleBasedSquatAnalyzer for real-time form metrics & coaching cues
 *   7. Update Zustand sessionStore when a rep completes with full RepFormAnalysis
 *   8. Expose reactive state for UI & refs for zero-latency frame consumers
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { PoseDetectorService, type PoseDetectorStatus } from '@/services/poseDetector'
import type { PoseLandmarks } from '@/types/landmarks'
import type { SquatFeatures, SquatStateResult, LiveFormFeedback } from '@/types/analysis'
import { extractFeatures } from '@/services/featureExtractor'
import { SquatStateMachine } from '@/services/squatStateMachine'
import { RepCounter } from '@/services/repCounter'
import type { RepCounterResult } from '@/types/session'
import { RuleBasedSquatAnalyzer } from '@/services/formAnalyzer'
import { useSessionStore } from '@/store/sessionStore'

// ─── Hook return type ─────────────────────────────────────────────────────────

export interface UsePoseDetectorReturn {
  poseStatus:        PoseDetectorStatus
  poseError:         string | null
  personDetected:    boolean
  fps:               number
  landmarksRef:      React.RefObject<PoseLandmarks | null>
  featuresRef:       React.RefObject<SquatFeatures | null>
  stateResultRef:    React.RefObject<SquatStateResult | null>
  repResultRef:      React.RefObject<RepCounterResult | null>
  formFeedbackRef:   React.RefObject<LiveFormFeedback | null>
  debugLandmarks:    PoseLandmarks | null
  debugFeatures:     SquatFeatures | null
  debugStateResult:  SquatStateResult | null
  debugRepResult:    RepCounterResult | null
  debugFormFeedback: LiveFormFeedback | null
  startPoseDetection: () => Promise<void>
  stopPoseDetection:  () => void
}

export function usePoseDetector(
  videoRef: React.RefObject<HTMLVideoElement>
): UsePoseDetectorReturn {

  // ── Reactive state (drives UI) ────────────────────────────────────────────
  const [poseStatus,        setPoseStatus]        = useState<PoseDetectorStatus>('IDLE')
  const [poseError,         setPoseError]         = useState<string | null>(null)
  const [personDetected,    setPersonDetected]    = useState<boolean>(false)
  const [debugLandmarks,    setDebugLandmarks]    = useState<PoseLandmarks | null>(null)
  const [debugFeatures,     setDebugFeatures]     = useState<SquatFeatures | null>(null)
  const [debugStateResult,  setDebugStateResult]  = useState<SquatStateResult | null>(null)
  const [debugRepResult,    setDebugRepResult]    = useState<RepCounterResult | null>(null)
  const [debugFormFeedback, setDebugFormFeedback] = useState<LiveFormFeedback | null>(null)
  const [fps,               setFps]               = useState<number>(0)

  // ── Refs (no re-renders) ──────────────────────────────────────────────────
  const landmarksRef     = useRef<PoseLandmarks | null>(null)
  const featuresRef      = useRef<SquatFeatures | null>(null)
  const stateResultRef   = useRef<SquatStateResult | null>(null)
  const repResultRef     = useRef<RepCounterResult | null>(null)
  const formFeedbackRef  = useRef<LiveFormFeedback | null>(null)
  const detectorRef      = useRef<PoseDetectorService | null>(null)
  const stateMachineRef  = useRef<SquatStateMachine>(new SquatStateMachine())
  const repCounterRef    = useRef<RepCounter>(new RepCounter())
  const formAnalyzerRef  = useRef<RuleBasedSquatAnalyzer>(new RuleBasedSquatAnalyzer())

  // Accumulated feature vectors for current ongoing rep
  const repFeaturesBuffer = useRef<SquatFeatures[]>([])

  const animFrameRef     = useRef<number | null>(null)
  const isLoopRunning    = useRef(false)
  const personDetectedRef = useRef(false)
  const frameCountRef    = useRef(0)

  const fpsFrameCountRef   = useRef(0)
  const lastFpsCalcTimeRef = useRef(0)
  const lastTimestampRef   = useRef(0)

  // ── Internal: start the rAF inference loop ────────────────────────────────
  const startLoop = useCallback(() => {
    if (isLoopRunning.current) return
    isLoopRunning.current = true
    frameCountRef.current = 0
    lastTimestampRef.current = 0
    fpsFrameCountRef.current = 0
    lastFpsCalcTimeRef.current = performance.now()

    stateMachineRef.current.reset()
    repCounterRef.current.reset()
    formAnalyzerRef.current.reset()
    repFeaturesBuffer.current = []

    useSessionStore.getState().startSession()

    function loop(now: number): void {
      if (!isLoopRunning.current) return

      const video    = videoRef.current
      const detector = detectorRef.current

      if (video && video.readyState >= 2 && detector?.isReady) {
        if (now > lastTimestampRef.current) {
          lastTimestampRef.current = now

          const landmarks = detector.detectFrame(video, now)
          landmarksRef.current = landmarks

          // Step 5: Feature extraction
          const features = extractFeatures(landmarks, now)
          featuresRef.current = features

          // Buffer features during active rep attempt
          if (features.isReliable) {
            repFeaturesBuffer.current.push(features)
            if (repFeaturesBuffer.current.length > 300) {
              repFeaturesBuffer.current.shift()
            }
          }

          // Step 6: Squat state machine
          const stateResult = stateMachineRef.current.update(features)
          stateResultRef.current = stateResult

          // Step 7: Rep counter
          const repResult = repCounterRef.current.update(stateResult, now)
          repResultRef.current = repResult

          // Step 8: Form Analyzer
          const formFeedback = formAnalyzerRef.current.analyzeFrame(features)
          formFeedbackRef.current = formFeedback

          // Sync completed rep + form analysis to Zustand store
          if (repResult.repCompleted && repResult.latestRep) {
            const repAnalysis = formAnalyzerRef.current.analyzeRep(repFeaturesBuffer.current)
            const fullRecord = {
              ...repResult.latestRep,
              formAnalysis: repAnalysis,
            }
            useSessionStore.getState().incrementRep(fullRecord)
            repFeaturesBuffer.current = []
          }

          // Update FPS counter over rolling 1s window
          fpsFrameCountRef.current++
          const elapsed = now - lastFpsCalcTimeRef.current
          if (elapsed >= 1000) {
            const currentFps = Math.round((fpsFrameCountRef.current * 1000) / elapsed)
            setFps(currentFps)
            fpsFrameCountRef.current = 0
            lastFpsCalcTimeRef.current = now
          }

          // Update person detection state ONLY on change
          const detected = landmarks !== null
          if (detected !== personDetectedRef.current) {
            personDetectedRef.current = detected
            setPersonDetected(detected)
          }

          // Update debug displays at ~10 FPS (every 3rd frame)
          frameCountRef.current++
          if (frameCountRef.current % 3 === 0) {
            setDebugLandmarks(landmarks)
            setDebugFeatures(features)
            setDebugStateResult(stateResult)
            setDebugRepResult(repResult)
            setDebugFormFeedback(formFeedback)
          }
        }
      }

      animFrameRef.current = requestAnimationFrame(loop)
    }

    animFrameRef.current = requestAnimationFrame(loop)
  }, [videoRef])

  // ── Internal: stop the rAF loop ───────────────────────────────────────────
  const stopLoop = useCallback(() => {
    isLoopRunning.current = false

    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current)
      animFrameRef.current = null
    }

    stateMachineRef.current.reset()
    repCounterRef.current.reset()
    formAnalyzerRef.current.reset()
    repFeaturesBuffer.current = []

    landmarksRef.current = null
    featuresRef.current = null
    stateResultRef.current = null
    repResultRef.current = null
    formFeedbackRef.current = null

    if (personDetectedRef.current) {
      personDetectedRef.current = false
      setPersonDetected(false)
    }
    setDebugLandmarks(null)
    setDebugFeatures(null)
    setDebugStateResult(null)
    setDebugRepResult(null)
    setDebugFormFeedback(null)
    setFps(0)
  }, [])

  // ── Public: initialize + start ────────────────────────────────────────────
  const startPoseDetection = useCallback(async () => {
    if (!detectorRef.current) {
      detectorRef.current = new PoseDetectorService()
    }

    if (!detectorRef.current.isReady) {
      setPoseStatus('LOADING')
      setPoseError(null)

      try {
        await detectorRef.current.initialize()
        setPoseStatus('READY')
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        setPoseStatus('ERROR')
        setPoseError(msg)
        return
      }
    }

    startLoop()
  }, [startLoop])

  // ── Public: stop ──────────────────────────────────────────────────────────
  const stopPoseDetection = useCallback(() => {
    stopLoop()
  }, [stopLoop])

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      isLoopRunning.current = false
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current)
      }
      detectorRef.current?.destroy()
      detectorRef.current = null
      stateMachineRef.current.reset()
      repCounterRef.current.reset()
      formAnalyzerRef.current.reset()
    }
  }, [])

  return {
    poseStatus,
    poseError,
    personDetected,
    fps,
    landmarksRef,
    featuresRef,
    stateResultRef,
    repResultRef,
    formFeedbackRef,
    debugLandmarks,
    debugFeatures,
    debugStateResult,
    debugRepResult,
    debugFormFeedback,
    startPoseDetection,
    stopPoseDetection,
  }
}
