/**
 * poseDetector.ts — MediaPipe Pose Landmarker wrapper.
 *
 * ──────────────────────────────────────────────────────────────────────────────
 * THIS IS THE ONLY FILE IN THE APPLICATION THAT IMPORTS FROM @mediapipe/tasks-vision.
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * All other modules receive clean PoseLandmarks objects from the application's
 * own type system (landmarks.ts). This means:
 *   - Swapping MediaPipe for a different pose library requires changing ONLY this file.
 *   - Unit tests for analysis logic do NOT require mocking MediaPipe.
 *
 * Architecture note (why client-side):
 * ───────────────────────────────────
 * Pose inference runs entirely in the browser via MediaPipe's WebAssembly runtime.
 * Sending webcam frames to a backend server would add 50–300 ms of latency per
 * frame, making real-time (30 FPS) overlays impossible. The WASM approach
 * achieves 30+ FPS on modern desktop hardware with zero network involvement.
 *
 * Model information:
 * ─────────────────
 * Model:   pose_landmarker_full (Float16, Google MediaPipe)
 * Source:  https://developers.google.com/mediapipe/solutions/vision/pose_landmarker
 * License: Apache 2.0
 *
 * The model is loaded on-demand from Google's official model CDN.
 * It is NOT bundled with the application (too large — ~12 MB).
 * It is NOT a model we trained ourselves.
 *
 * WASM runtime:
 * ────────────
 * Loaded from jsDelivr CDN (mirrors the @mediapipe/tasks-vision npm package).
 * Version is pinned to match the installed npm package version.
 */

import {
  PoseLandmarker,
  FilesetResolver,
  type PoseLandmarkerResult,
} from '@mediapipe/tasks-vision'

import { mapMediaPipeLandmarks, type PoseLandmarks, type RawLandmark } from '@/types/landmarks'

// ─── Model & Runtime URLs ─────────────────────────────────────────────────────

/**
 * MediaPipe Tasks Vision WASM runtime.
 *
 * These are the compiled WebAssembly files that execute the inference engine.
 * Served from jsDelivr CDN, which mirrors the npm package.
 * Version is pinned to match the installed @mediapipe/tasks-vision version.
 *
 * IMPORTANT: This is NOT our model — it is MediaPipe's inference runtime.
 */
const WASM_FILESET_URL =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'

/**
 * Pose Landmarker model file.
 *
 * pose_landmarker_full: balanced accuracy/speed, Float16 precision.
 *   - 33 pose landmarks
 *   - Recommended for desktop/laptop real-time use
 *   - ~12 MB download (cached by browser after first load)
 *
 * Alternatives (not used in MVP):
 *   - pose_landmarker_lite  — faster, less accurate (mobile)
 *   - pose_landmarker_heavy — most accurate, slower
 *
 * Source: https://developers.google.com/mediapipe/solutions/vision/pose_landmarker
 */
const MODEL_ASSET_URL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/latest/pose_landmarker_full.task'

// ─── Configuration ────────────────────────────────────────────────────────────

const POSE_LANDMARKER_CONFIG = {
  /** Maximum number of people to detect simultaneously. 1 = squat analysis only needs the user. */
  numPoses: 1,
  /**
   * Minimum confidence to consider a new pose detection valid.
   * Range [0, 1]. 0.5 is MediaPipe's recommended default.
   */
  minPoseDetectionConfidence: 0.5,
  /**
   * Minimum confidence to consider a detected pose still present.
   * Range [0, 1]. Affects how quickly "pose lost" is reported.
   */
  minPosePresenceConfidence: 0.5,
  /**
   * Minimum confidence for pose tracking between frames.
   * Higher values = more stable tracking, but may lose pose during fast movement.
   */
  minTrackingConfidence: 0.5,
} as const

// ─── Detector status ──────────────────────────────────────────────────────────

export type PoseDetectorStatus =
  | 'IDLE'          // Not yet initialized
  | 'LOADING'       // Downloading WASM + model
  | 'READY'         // Initialized and ready for inference
  | 'ERROR'         // Initialization failed

// ─── Service class ────────────────────────────────────────────────────────────

/**
 * PoseDetectorService — manages the MediaPipe Pose Landmarker lifecycle.
 *
 * Usage pattern:
 *   const detector = new PoseDetectorService()
 *   await detector.initialize()
 *   const landmarks = detector.detectFrame(videoElement, performance.now())
 *   detector.destroy()
 *
 * Thread safety note:
 * MediaPipe's Tasks Vision API is synchronous for video mode — detectForVideo()
 * blocks until inference completes. Each call must receive a timestamp greater
 * than the previous call (monotonically increasing).
 */
export class PoseDetectorService {
  private landmarker: PoseLandmarker | null = null
  private _status: PoseDetectorStatus = 'IDLE'
  private _error: string | null = null

  get status(): PoseDetectorStatus { return this._status }
  get error(): string | null { return this._error }
  get isReady(): boolean { return this._status === 'READY' }

  /**
   * initialize — download and set up the MediaPipe runtime and model.
   *
   * This is an async operation that:
   *   1. Downloads the WASM files (~500 KB, cached by browser)
   *   2. Downloads the model file (~12 MB, cached by browser)
   *   3. Initializes the inference engine
   *
   * Subsequent calls are fast because the browser caches both downloads.
   * Safe to call multiple times — returns immediately if already initialized.
   */
  async initialize(): Promise<void> {
    if (this._status === 'READY') return
    if (this._status === 'LOADING') {
      throw new Error('PoseDetectorService: initialization already in progress')
    }

    this._status = 'LOADING'
    this._error = null

    try {
      // Step 1: Resolve the MediaPipe WASM fileset.
      // FilesetResolver downloads and compiles the WASM binary.
      const vision = await FilesetResolver.forVisionTasks(WASM_FILESET_URL)

      // Step 2: Create the PoseLandmarker in VIDEO running mode.
      // VIDEO mode is required for real-time per-frame inference.
      // (IMAGE mode creates a new session per call — too slow for 30 FPS.)
      this.landmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: MODEL_ASSET_URL,
          /**
           * GPU delegate: uses WebGL for hardware-accelerated inference.
           * MediaPipe automatically falls back to CPU if GPU is unavailable.
           * GPU typically gives 2–4× speedup for pose estimation.
           */
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        ...POSE_LANDMARKER_CONFIG,
      })

      this._status = 'READY'
    } catch (err) {
      this._status = 'ERROR'
      const message = err instanceof Error ? err.message : String(err)
      this._error = `MediaPipe initialization failed: ${message}`
      throw new Error(this._error)
    }
  }

  /**
   * detectFrame — run pose estimation on a single video frame.
   *
   * Must only be called after initialize() resolves.
   * The timestampMs parameter MUST increase monotonically across calls —
   * passing a timestamp ≤ the previous timestamp will throw in MediaPipe.
   * Use performance.now() or the requestAnimationFrame timestamp.
   *
   * @param video       The <video> element currently playing the webcam stream
   * @param timestampMs Monotonically increasing timestamp in milliseconds
   * @returns PoseLandmarks if a person is detected, null otherwise
   */
  detectFrame(video: HTMLVideoElement, timestampMs: number): PoseLandmarks | null {
    if (!this.landmarker || this._status !== 'READY') {
      return null
    }

    let result: PoseLandmarkerResult

    try {
      /**
       * detectForVideo runs synchronous inference on the provided video frame.
       * It uses the current frame at the given timestamp.
       *
       * The result contains:
       *   result.landmarks[]      — normalized [0,1] 2D+depth landmarks
       *   result.worldLandmarks[] — 3D world-space landmarks in meters
       *   result.segmentationMasks[] — body segmentation (disabled, not configured)
       */
      result = this.landmarker.detectForVideo(video, timestampMs)
    } catch (err) {
      // detectForVideo can throw if timestamps are non-monotonic or video is invalid.
      // Log in dev mode but don't crash the inference loop.
      if (import.meta.env.DEV) {
        console.warn('[PoseDetector] detectForVideo error:', err)
      }
      return null
    }

    // No person detected — result.landmarks is an empty array
    if (!result.landmarks || result.landmarks.length === 0) {
      return null
    }

    // Convert MediaPipe's NormalizedLandmark[] to our application type.
    // result.landmarks[0] is the first (and only) detected person.
    const rawLandmarks = result.landmarks[0] as RawLandmark[]
    return mapMediaPipeLandmarks(rawLandmarks)
  }

  /**
   * destroy — release MediaPipe resources.
   *
   * Call this when the component unmounts or the user stops the session.
   * Safe to call multiple times.
   */
  destroy(): void {
    if (this.landmarker) {
      this.landmarker.close()
      this.landmarker = null
    }
    this._status = 'IDLE'
    this._error = null
  }
}
