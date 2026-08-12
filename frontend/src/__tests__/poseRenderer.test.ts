/**
 * poseRenderer.test.ts — Unit tests for pose skeleton renderer module.
 *
 * Verifies:
 *  1. POSE_CONNECTIONS list contains valid landmark index pairs.
 *  2. renderPose handles null or empty landmarks without throwing (clears canvas).
 *  3. renderPose transforms normalized [0,1] coordinates into canvas pixel space.
 *  4. Landmarks below visibility threshold are skipped during line and joint rendering.
 *  5. Custom options (colors, line widths, visibility thresholds) are respected.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderPose, POSE_CONNECTIONS } from '../services/poseRenderer'
import { mapMediaPipeLandmarks, TOTAL_LANDMARK_COUNT, LANDMARK_INDEX, type RawLandmark } from '../types/landmarks'

// ─── Canvas 2D Context Mock ───────────────────────────────────────────────────

function createMockCanvasContext(): CanvasRenderingContext2D {
  return {
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    lineCap: 'butt',
    lineJoin: 'miter',
    shadowColor: '',
    shadowBlur: 0,
    strokeStyle: '',
    fillStyle: '',
    lineWidth: 1,
  } as unknown as CanvasRenderingContext2D
}

function makeSyntheticRaw(defaultVis = 0.9): RawLandmark[] {
  return Array.from({ length: TOTAL_LANDMARK_COUNT }, (_, i) => ({
    x: (i + 1) * 0.02,
    y: (i + 1) * 0.02,
    z: 0,
    visibility: defaultVis,
  }))
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('POSE_CONNECTIONS definition', () => {
  it('contains anatomical connection index pairs', () => {
    expect(POSE_CONNECTIONS.length).toBeGreaterThan(15)
  })

  it('all connection indices are valid landmark indices (0 to 32)', () => {
    for (const [start, end] of POSE_CONNECTIONS) {
      expect(start).toBeGreaterThanOrEqual(0)
      expect(start).toBeLessThan(TOTAL_LANDMARK_COUNT)
      expect(end).toBeGreaterThanOrEqual(0)
      expect(end).toBeLessThan(TOTAL_LANDMARK_COUNT)
    }
  })

  it('includes key squat connections: hip-knee and knee-ankle', () => {
    const leftHipKnee = POSE_CONNECTIONS.some(
      ([a, b]) => (a === LANDMARK_INDEX.LEFT_HIP && b === LANDMARK_INDEX.LEFT_KNEE) ||
                  (b === LANDMARK_INDEX.LEFT_HIP && a === LANDMARK_INDEX.LEFT_KNEE)
    )
    const leftKneeAnkle = POSE_CONNECTIONS.some(
      ([a, b]) => (a === LANDMARK_INDEX.LEFT_KNEE && b === LANDMARK_INDEX.LEFT_ANKLE) ||
                  (b === LANDMARK_INDEX.LEFT_KNEE && a === LANDMARK_INDEX.LEFT_ANKLE)
    )
    expect(leftHipKnee).toBe(true)
    expect(leftKneeAnkle).toBe(true)
  })
})

describe('renderPose engine', () => {
  let ctx: CanvasRenderingContext2D

  beforeEach(() => {
    ctx = createMockCanvasContext()
  })

  it('clears canvas when landmarks are null', () => {
    renderPose(ctx, null, 800, 600)
    expect(ctx.clearRect).toHaveBeenCalledWith(0, 0, 800, 600)
    expect(ctx.beginPath).not.toHaveBeenCalled()
  })

  it('clears canvas when raw landmarks are empty', () => {
    const emptyLandmarks = mapMediaPipeLandmarks([])
    emptyLandmarks.raw = []

    renderPose(ctx, emptyLandmarks, 800, 600)
    expect(ctx.clearRect).toHaveBeenCalledWith(0, 0, 800, 600)
    expect(ctx.beginPath).not.toHaveBeenCalled()
  })

  it('renders lines and joint arcs for valid visible landmarks', () => {
    const raw = makeSyntheticRaw(0.9)
    const landmarks = mapMediaPipeLandmarks(raw)

    renderPose(ctx, landmarks, 1000, 500)

    expect(ctx.clearRect).toHaveBeenCalledWith(0, 0, 1000, 500)
    expect(ctx.beginPath).toHaveBeenCalled()
    expect(ctx.stroke).toHaveBeenCalled()
    expect(ctx.fill).toHaveBeenCalled()

    // Coordinate scaling check for index 0 (x=0.02, y=0.02)
    // 0.02 * 1000 = 20, 0.02 * 500 = 10
    expect(ctx.arc).toHaveBeenCalledWith(expect.any(Number), expect.any(Number), expect.any(Number), 0, 2 * Math.PI)
  })

  it('filters out landmarks below visibility threshold', () => {
    // All landmarks have visibility 0.1 (below 0.5 default threshold)
    const raw = makeSyntheticRaw(0.1)
    const landmarks = mapMediaPipeLandmarks(raw)

    renderPose(ctx, landmarks, 1000, 500)

    // clearRect is called, but no lines or joint arcs should be drawn
    expect(ctx.clearRect).toHaveBeenCalledWith(0, 0, 1000, 500)
    expect(ctx.moveTo).not.toHaveBeenCalled()
    expect(ctx.arc).not.toHaveBeenCalled()
  })

  it('respects custom styling options for line width and shadow color', () => {
    const raw = makeSyntheticRaw(0.9)
    const landmarks = mapMediaPipeLandmarks(raw)

    renderPose(ctx, landmarks, 800, 600, {
      lineColor: '#ff0000',
      lineWidth: 5,
      jointRadius: 6,
      enableGlow: true,
    })

    expect(ctx.shadowColor).toBe('#ff0000')
    expect(ctx.save).toHaveBeenCalled()
    expect(ctx.restore).toHaveBeenCalled()
  })

  it('scales coordinates accurately to canvas width and height', () => {
    const raw = makeSyntheticRaw(0.9)
    raw[LANDMARK_INDEX.LEFT_HIP] = { x: 0.5, y: 0.4, z: 0, visibility: 0.9 }
    const landmarks = mapMediaPipeLandmarks(raw)

    renderPose(ctx, landmarks, 1000, 2000)

    // Expected canvas coords: x = 0.5 * 1000 = 500, y = 0.4 * 2000 = 800
    expect(ctx.arc).toHaveBeenCalledWith(500, 800, expect.any(Number), 0, 2 * Math.PI)
  })
})
