/**
 * poseDetector.test.ts — Unit tests for PoseDetectorService.
 *
 * MediaPipe is mocked entirely — we never call real inference in unit tests.
 *
 * This verifies:
 *  1. Initial status is IDLE
 *  2. initialize() transitions to LOADING then READY
 *  3. detectFrame() returns null before initialization
 *  4. detectFrame() returns null when no landmarks detected (empty array)
 *  5. detectFrame() returns mapped PoseLandmarks when MediaPipe returns data
 *  6. detectFrame() handles MediaPipe errors gracefully (returns null, no throw)
 *  7. destroy() resets status to IDLE
 *  8. Calling initialize() twice is a no-op (idempotent)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { RawLandmark } from '../types/landmarks'
import { TOTAL_LANDMARK_COUNT } from '../types/landmarks'

// ─── Mock @mediapipe/tasks-vision ─────────────────────────────────────────────
// We mock the entire module so tests never download WASM or models.
//
// vi.mock() calls are hoisted to the TOP of the file by Vitest's transformer.
// Variables referenced inside the factory must also be hoisted via vi.hoisted().

const { mockDetectForVideo, mockClose } = vi.hoisted(() => ({
  mockDetectForVideo: vi.fn(),
  mockClose:          vi.fn(),
}))

vi.mock('@mediapipe/tasks-vision', () => ({
  FilesetResolver: {
    forVisionTasks: vi.fn().mockResolvedValue({}),
  },
  PoseLandmarker: {
    createFromOptions: vi.fn().mockResolvedValue({
      detectForVideo: mockDetectForVideo,
      close:          mockClose,
    }),
  },
}))

// ─── Import AFTER mock is registered ─────────────────────────────────────────
// Vitest hoists vi.mock() calls, so this import picks up the mocked module.
import { PoseDetectorService } from '../services/poseDetector'

// ─── Helper factories ─────────────────────────────────────────────────────────

/**
 * Create 33 synthetic raw landmarks with visible confidence.
 * Clearly synthetic: each x = index * 0.01, y = 0.5, z = 0, visibility = 0.9
 */
function makeSyntheticLandmarks(): RawLandmark[] {
  return Array.from({ length: TOTAL_LANDMARK_COUNT }, (_, i) => ({
    x:          i * 0.01,
    y:          0.5,
    z:          0,
    visibility: 0.9,
  }))
}

function makeMockVideoElement(): HTMLVideoElement {
  return {
    readyState: 4, // HAVE_ENOUGH_DATA
  } as HTMLVideoElement
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('PoseDetectorService — initial state', () => {
  it('starts with IDLE status', () => {
    const detector = new PoseDetectorService()
    expect(detector.status).toBe('IDLE')
  })

  it('isReady is false initially', () => {
    const detector = new PoseDetectorService()
    expect(detector.isReady).toBe(false)
  })

  it('error is null initially', () => {
    const detector = new PoseDetectorService()
    expect(detector.error).toBeNull()
  })
})

describe('PoseDetectorService — initialize()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('transitions to READY after successful initialization', async () => {
    const detector = new PoseDetectorService()
    await detector.initialize()
    expect(detector.status).toBe('READY')
    expect(detector.isReady).toBe(true)
    expect(detector.error).toBeNull()
  })

  it('calls FilesetResolver.forVisionTasks with the WASM URL', async () => {
    const { FilesetResolver } = await import('@mediapipe/tasks-vision')
    const detector = new PoseDetectorService()
    await detector.initialize()
    expect(FilesetResolver.forVisionTasks).toHaveBeenCalledWith(
      expect.stringContaining('cdn.jsdelivr.net')
    )
  })

  it('calls PoseLandmarker.createFromOptions with VIDEO runningMode', async () => {
    const { PoseLandmarker } = await import('@mediapipe/tasks-vision')
    const detector = new PoseDetectorService()
    await detector.initialize()
    expect(PoseLandmarker.createFromOptions).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ runningMode: 'VIDEO' })
    )
  })

  it('requests numPoses: 1', async () => {
    const { PoseLandmarker } = await import('@mediapipe/tasks-vision')
    const detector = new PoseDetectorService()
    await detector.initialize()
    expect(PoseLandmarker.createFromOptions).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ numPoses: 1 })
    )
  })

  it('is idempotent — does not re-initialize if already READY', async () => {
    const { PoseLandmarker } = await import('@mediapipe/tasks-vision')
    const detector = new PoseDetectorService()
    await detector.initialize()
    await detector.initialize() // second call
    expect(PoseLandmarker.createFromOptions).toHaveBeenCalledTimes(1)
  })

  it('transitions to ERROR if initialization fails', async () => {
    const { FilesetResolver } = await import('@mediapipe/tasks-vision')
    vi.mocked(FilesetResolver.forVisionTasks).mockRejectedValueOnce(
      new Error('Network error — WASM not found')
    )
    const detector = new PoseDetectorService()
    await expect(detector.initialize()).rejects.toThrow()
    expect(detector.status).toBe('ERROR')
    expect(detector.error).toContain('MediaPipe initialization failed')
  })
})

describe('PoseDetectorService — detectFrame()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns null before initialization', () => {
    const detector = new PoseDetectorService()
    const video = makeMockVideoElement()
    const result = detector.detectFrame(video, 100)
    expect(result).toBeNull()
  })

  it('returns null when MediaPipe returns no landmarks (no person)', async () => {
    mockDetectForVideo.mockReturnValue({ landmarks: [] })
    const detector = new PoseDetectorService()
    await detector.initialize()
    const result = detector.detectFrame(makeMockVideoElement(), 100)
    expect(result).toBeNull()
  })

  it('returns null when MediaPipe result has undefined landmarks', async () => {
    mockDetectForVideo.mockReturnValue({ landmarks: undefined })
    const detector = new PoseDetectorService()
    await detector.initialize()
    const result = detector.detectFrame(makeMockVideoElement(), 100)
    expect(result).toBeNull()
  })

  it('returns PoseLandmarks when MediaPipe returns 33 landmarks', async () => {
    const syntheticLandmarks = makeSyntheticLandmarks()
    mockDetectForVideo.mockReturnValue({ landmarks: [syntheticLandmarks] })

    const detector = new PoseDetectorService()
    await detector.initialize()
    const result = detector.detectFrame(makeMockVideoElement(), 100)

    expect(result).not.toBeNull()
    // leftKnee is at index 25 → x = 25 * 0.01 = 0.25
    expect(result!.leftKnee.x).toBeCloseTo(0.25)
    // nose is at index 0 → x = 0
    expect(result!.nose.x).toBeCloseTo(0)
  })

  it('result includes all 33 raw landmarks', async () => {
    mockDetectForVideo.mockReturnValue({ landmarks: [makeSyntheticLandmarks()] })
    const detector = new PoseDetectorService()
    await detector.initialize()
    const result = detector.detectFrame(makeMockVideoElement(), 100)
    expect(result!.raw).toHaveLength(33)
  })

  it('returns null and does not throw when detectForVideo throws', async () => {
    mockDetectForVideo.mockImplementation(() => {
      throw new Error('Timestamp not monotonically increasing')
    })
    const detector = new PoseDetectorService()
    await detector.initialize()
    expect(() => detector.detectFrame(makeMockVideoElement(), 100)).not.toThrow()
    expect(detector.detectFrame(makeMockVideoElement(), 100)).toBeNull()
  })
})

describe('PoseDetectorService — destroy()', () => {
  it('calls close() on the MediaPipe landmarker', async () => {
    vi.clearAllMocks()
    const detector = new PoseDetectorService()
    await detector.initialize()
    detector.destroy()
    expect(mockClose).toHaveBeenCalledTimes(1)
  })

  it('resets status to IDLE after destroy()', async () => {
    vi.clearAllMocks()
    const detector = new PoseDetectorService()
    await detector.initialize()
    expect(detector.status).toBe('READY')
    detector.destroy()
    expect(detector.status).toBe('IDLE')
  })

  it('returns null from detectFrame() after destroy()', async () => {
    vi.clearAllMocks()
    mockDetectForVideo.mockReturnValue({ landmarks: [makeSyntheticLandmarks()] })
    const detector = new PoseDetectorService()
    await detector.initialize()
    detector.destroy()
    const result = detector.detectFrame(makeMockVideoElement(), 200)
    expect(result).toBeNull()
  })

  it('does not throw when destroy() is called before initialize()', () => {
    const detector = new PoseDetectorService()
    expect(() => detector.destroy()).not.toThrow()
  })
})
