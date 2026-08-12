/**
 * featureExtractor.test.ts — Unit tests for vector math and feature extraction.
 *
 * Verifies:
 *  1. calculateAngle geometry (180°, 90°, 45°, 0°, zero-length, clamping, low visibility).
 *  2. calculateTorsoInclination geometry (0° upright, 45° forward lean, 90° horizontal).
 *  3. extractFeatures handles full synthetic pose landmarks accurately.
 *  4. extractFeatures handles missing/unreliable landmarks cleanly with null values.
 *  5. FeatureSmoother applies exponential moving average correctly.
 */

import { describe, it, expect } from 'vitest'
import {
  calculateAngle,
  calculateTorsoInclination,
  extractFeatures,
  FeatureSmoother,
} from '../services/featureExtractor'
import { mapMediaPipeLandmarks, TOTAL_LANDMARK_COUNT, LANDMARK_INDEX, type RawLandmark, type Landmark } from '../types/landmarks'

function makePoint(x: number, y: number, z = 0, visibility = 0.9): Landmark {
  return { x, y, z, visibility }
}

function makeSyntheticRaw(defaultVis = 0.9): RawLandmark[] {
  return Array.from({ length: TOTAL_LANDMARK_COUNT }, (_, i) => ({
    x: 0.5,
    y: (i + 1) * 0.02,
    z: 0,
    visibility: defaultVis,
  }))
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('calculateAngle', () => {
  it('calculates 180° for a straight line', () => {
    // Points: A(0, 0), B(0, 1), C(0, 2)
    // BA = (0, -1), BC = (0, 1), dot = -1, mag = 1*1 = 1, cos = -1 -> 180°
    const a = makePoint(0, 0)
    const b = makePoint(0, 1)
    const c = makePoint(0, 2)

    const angle = calculateAngle(a, b, c)
    expect(angle).toBe(180)
  })

  it('calculates 90° for a right angle', () => {
    // Points: A(0, 1), B(0, 0), C(1, 0)
    // BA = (0, 1), BC = (1, 0), dot = 0 -> 90°
    const a = makePoint(0, 1)
    const b = makePoint(0, 0)
    const c = makePoint(1, 0)

    const angle = calculateAngle(a, b, c)
    expect(angle).toBe(90)
  })

  it('calculates 45° angle accurately', () => {
    // Points: A(1, 1), B(0, 0), C(1, 0)
    const a = makePoint(1, 1)
    const b = makePoint(0, 0)
    const c = makePoint(1, 0)

    const angle = calculateAngle(a, b, c)
    expect(angle).toBeCloseTo(45, 0)
  })

  it('calculates 0° for overlapping ray directions', () => {
    const a = makePoint(1, 0)
    const b = makePoint(0, 0)
    const c = makePoint(2, 0)

    const angle = calculateAngle(a, b, c)
    expect(angle).toBe(0)
  })

  it('returns null for zero-length vector (coincident points)', () => {
    const a = makePoint(0, 0)
    const b = makePoint(0, 0) // vertex is same as A
    const c = makePoint(1, 1)

    const angle = calculateAngle(a, b, c)
    expect(angle).toBeNull()
  })

  it('clamps dot product to prevent NaN on floating-point precision edge cases', () => {
    // Co-linear points that might produce 1.0000000000000002 without clamping
    const a = makePoint(1.0, 1.0)
    const b = makePoint(0.0, 0.0)
    const c = makePoint(2.0, 2.0)

    const angle = calculateAngle(a, b, c)
    expect(angle).not.toBeNaN()
    expect(angle).toBe(0)
  })

  it('returns null when any point visibility is below threshold (0.5)', () => {
    const a = makePoint(0, 1, 0, 0.9)
    const b = makePoint(0, 0, 0, 0.4) // low visibility
    const c = makePoint(1, 0, 0, 0.9)

    const angle = calculateAngle(a, b, c)
    expect(angle).toBeNull()
  })

  it('returns null when any point is null or undefined', () => {
    expect(calculateAngle(null, makePoint(0, 0), makePoint(1, 1))).toBeNull()
  })
})

describe('calculateTorsoInclination', () => {
  it('returns 0° for perfectly upright torso', () => {
    // Shoulders at y=0.2, Hips at y=0.6 (both x=0.5)
    // Vector from hip to shoulder is (0, -0.4) -> perfectly vertical UP
    const lSh = makePoint(0.4, 0.2)
    const rSh = makePoint(0.6, 0.2)
    const lHip = makePoint(0.4, 0.6)
    const rHip = makePoint(0.6, 0.6)

    const torsoAngle = calculateTorsoInclination(lSh, rSh, lHip, rHip)
    expect(torsoAngle).toBe(0)
  })

  it('returns 45° for 45° forward lean', () => {
    // Hip mid: (0.5, 0.6), Shoulder mid: (0.8, 0.3)
    // Vector v = (0.3, -0.3). Angle with (0, -1): dot = 0.3, mag = sqrt(0.18) = 0.42426
    // cos = 0.3 / 0.42426 = 0.7071 -> 45°
    const lSh = makePoint(0.7, 0.3)
    const rSh = makePoint(0.9, 0.3)
    const lHip = makePoint(0.4, 0.6)
    const rHip = makePoint(0.6, 0.6)

    const torsoAngle = calculateTorsoInclination(lSh, rSh, lHip, rHip)
    expect(torsoAngle).toBeCloseTo(45, 0)
  })

  it('returns 90° for horizontal torso', () => {
    // Hip mid: (0.3, 0.5), Shoulder mid: (0.7, 0.5)
    // Vector v = (0.4, 0). Dot with (0, -1) = 0 -> 90°
    const lSh = makePoint(0.7, 0.4)
    const rSh = makePoint(0.7, 0.6)
    const lHip = makePoint(0.3, 0.4)
    const rHip = makePoint(0.3, 0.6)

    const torsoAngle = calculateTorsoInclination(lSh, rSh, lHip, rHip)
    expect(torsoAngle).toBe(90)
  })

  it('returns null if any shoulder/hip landmark is low visibility', () => {
    const lSh = makePoint(0.4, 0.2, 0, 0.2) // low vis
    const rSh = makePoint(0.6, 0.2)
    const lHip = makePoint(0.4, 0.6)
    const rHip = makePoint(0.6, 0.6)

    expect(calculateTorsoInclination(lSh, rSh, lHip, rHip)).toBeNull()
  })
})

describe('extractFeatures', () => {
  it('returns complete SquatFeatures for synthetic pose landmarks', () => {
    const raw = makeSyntheticRaw(0.9)
    // Left leg: Hip(0.4, 0.4), Knee(0.4, 0.6), Ankle(0.4, 0.8) -> 180°
    raw[LANDMARK_INDEX.LEFT_HIP]   = { x: 0.4, y: 0.4, z: 0, visibility: 0.9 }
    raw[LANDMARK_INDEX.LEFT_KNEE]  = { x: 0.4, y: 0.6, z: 0, visibility: 0.9 }
    raw[LANDMARK_INDEX.LEFT_ANKLE] = { x: 0.4, y: 0.8, z: 0, visibility: 0.9 }

    // Right leg: Hip(0.6, 0.4), Knee(0.6, 0.6), Ankle(0.6, 0.8) -> 180°
    raw[LANDMARK_INDEX.RIGHT_HIP]   = { x: 0.6, y: 0.4, z: 0, visibility: 0.9 }
    raw[LANDMARK_INDEX.RIGHT_KNEE]  = { x: 0.6, y: 0.6, z: 0, visibility: 0.9 }
    raw[LANDMARK_INDEX.RIGHT_ANKLE] = { x: 0.6, y: 0.8, z: 0, visibility: 0.9 }

    // Shoulders
    raw[LANDMARK_INDEX.LEFT_SHOULDER]  = { x: 0.4, y: 0.1, z: 0, visibility: 0.9 }
    raw[LANDMARK_INDEX.RIGHT_SHOULDER] = { x: 0.6, y: 0.1, z: 0, visibility: 0.9 }

    const landmarks = mapMediaPipeLandmarks(raw)
    const features = extractFeatures(landmarks, 1000)

    expect(features.timestamp).toBe(1000)
    expect(features.leftKneeAngle).toBe(180)
    expect(features.rightKneeAngle).toBe(180)
    expect(features.kneeAngle).toBe(180)
    expect(features.torsoInclination).toBe(0)
    expect(features.kneeAngleSymmetry).toBe(0)
    expect(features.isReliable).toBe(true)
  })

  it('returns null fields and isReliable: false when landmarks are null', () => {
    const features = extractFeatures(null, 2000)

    expect(features.timestamp).toBe(2000)
    expect(features.leftKneeAngle).toBeNull()
    expect(features.rightKneeAngle).toBeNull()
    expect(features.kneeAngle).toBeNull()
    expect(features.torsoInclination).toBeNull()
    expect(features.isReliable).toBe(false)
  })

  it('calculates knee symmetry difference accurately', () => {
    const raw = makeSyntheticRaw(0.9)
    // Left knee angle: 90° (Hip(0.4, 0.6), Knee(0.4, 0.4), Ankle(0.6, 0.4))
    raw[LANDMARK_INDEX.LEFT_HIP]   = { x: 0.4, y: 0.6, z: 0, visibility: 0.9 }
    raw[LANDMARK_INDEX.LEFT_KNEE]  = { x: 0.4, y: 0.4, z: 0, visibility: 0.9 }
    raw[LANDMARK_INDEX.LEFT_ANKLE] = { x: 0.6, y: 0.4, z: 0, visibility: 0.9 }

    // Right knee angle: 180°
    raw[LANDMARK_INDEX.RIGHT_HIP]   = { x: 0.6, y: 0.2, z: 0, visibility: 0.9 }
    raw[LANDMARK_INDEX.RIGHT_KNEE]  = { x: 0.6, y: 0.4, z: 0, visibility: 0.9 }
    raw[LANDMARK_INDEX.RIGHT_ANKLE] = { x: 0.6, y: 0.6, z: 0, visibility: 0.9 }

    raw[LANDMARK_INDEX.LEFT_SHOULDER]  = { x: 0.4, y: 0.1, z: 0, visibility: 0.9 }
    raw[LANDMARK_INDEX.RIGHT_SHOULDER] = { x: 0.6, y: 0.1, z: 0, visibility: 0.9 }

    const landmarks = mapMediaPipeLandmarks(raw)
    const features = extractFeatures(landmarks)

    expect(features.leftKneeAngle).toBe(90)
    expect(features.rightKneeAngle).toBe(180)
    expect(features.kneeAngleSymmetry).toBe(90)
  })
})

describe('FeatureSmoother', () => {
  it('applies exponential moving average to raw features', () => {
    const smoother = new FeatureSmoother(0.5) // alpha = 0.5

    const raw1 = extractFeatures(null, 100)
    raw1.leftKneeAngle = 180
    raw1.isReliable = true

    const s1 = smoother.smooth(raw1)
    expect(s1.leftKneeAngle).toBe(180)

    const raw2 = extractFeatures(null, 200)
    raw2.leftKneeAngle = 90
    raw2.isReliable = true

    // EMA: 90 * 0.5 + 180 * 0.5 = 135
    const s2 = smoother.smooth(raw2)
    expect(s2.leftKneeAngle).toBe(135)
  })

  it('resets smooth history on reset()', () => {
    const smoother = new FeatureSmoother(0.5)

    const raw1 = extractFeatures(null, 100)
    raw1.leftKneeAngle = 180
    raw1.isReliable = true
    smoother.smooth(raw1)

    smoother.reset()

    const raw2 = extractFeatures(null, 200)
    raw2.leftKneeAngle = 90
    raw2.isReliable = true

    // After reset, first sample is taken directly without averaging previous history
    const s2 = smoother.smooth(raw2)
    expect(s2.leftKneeAngle).toBe(90)
  })
})
