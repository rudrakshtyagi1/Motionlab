/**
 * landmarks.test.ts — Unit tests for landmark types and mapping utilities.
 *
 * All tests use synthetic landmark data — not real webcam output.
 * Values are clearly artificial (e.g. 0.1, 0.5, 0.9) so there is no risk
 * of confusing test data with real inference results.
 *
 * Tests verify:
 *  1. mapMediaPipeLandmarks correctly maps all 33 indices to named fields
 *  2. Visibility defaults to 0 when missing from raw data
 *  3. Missing raw landmarks return zero-confidence placeholders
 *  4. isVisible correctly applies the threshold
 *  5. hasRequiredSquatLandmarks detects insufficient landmark coverage
 *  6. midpoint calculation
 */

import { describe, it, expect } from 'vitest'
import {
  mapMediaPipeLandmarks,
  isVisible,
  hasRequiredSquatLandmarks,
  midpoint,
  LANDMARK_INDEX,
  TOTAL_LANDMARK_COUNT,
  VISIBILITY_THRESHOLD,
  type RawLandmark,
} from '../types/landmarks'

// ─── Test data factory ────────────────────────────────────────────────────────

/**
 * Create a full array of 33 synthetic raw landmarks.
 * Each landmark's x/y/z is set to index/100 for easy debugging.
 * Visibility is 0.9 (high confidence) by default.
 */
function makeSyntheticRaw(
  overrides: Partial<Record<number, Partial<RawLandmark>>> = {}
): RawLandmark[] {
  return Array.from({ length: TOTAL_LANDMARK_COUNT }, (_, i) => ({
    x:          i / 100,
    y:          i / 100 + 0.01,
    z:          -(i / 100),
    visibility: 0.9,
    ...overrides[i],
  }))
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('mapMediaPipeLandmarks', () => {
  it('maps the correct index to leftKnee', () => {
    const raw = makeSyntheticRaw()
    const lm  = mapMediaPipeLandmarks(raw)
    // LANDMARK_INDEX.LEFT_KNEE = 25, so x = 25/100 = 0.25
    expect(lm.leftKnee.x).toBeCloseTo(0.25)
    expect(lm.leftKnee.y).toBeCloseTo(0.26)
  })

  it('maps the correct index to rightKnee', () => {
    const raw = makeSyntheticRaw()
    const lm  = mapMediaPipeLandmarks(raw)
    // LANDMARK_INDEX.RIGHT_KNEE = 26
    expect(lm.rightKnee.x).toBeCloseTo(0.26)
  })

  it('maps the correct index to leftHip', () => {
    const raw = makeSyntheticRaw()
    const lm  = mapMediaPipeLandmarks(raw)
    // LANDMARK_INDEX.LEFT_HIP = 23
    expect(lm.leftHip.x).toBeCloseTo(0.23)
  })

  it('maps nose to index 0', () => {
    const raw = makeSyntheticRaw()
    const lm  = mapMediaPipeLandmarks(raw)
    expect(lm.nose.x).toBeCloseTo(0.0)
  })

  it('preserves the raw array with 33 elements', () => {
    const raw = makeSyntheticRaw()
    const lm  = mapMediaPipeLandmarks(raw)
    expect(lm.raw).toHaveLength(TOTAL_LANDMARK_COUNT)
  })

  it('raw array values match named landmark values', () => {
    const raw = makeSyntheticRaw()
    const lm  = mapMediaPipeLandmarks(raw)
    // raw[25] should equal leftKnee
    expect(lm.raw[LANDMARK_INDEX.LEFT_KNEE].x).toBeCloseTo(lm.leftKnee.x)
    expect(lm.raw[LANDMARK_INDEX.LEFT_KNEE].y).toBeCloseTo(lm.leftKnee.y)
  })

  it('defaults visibility to 0 when raw landmark has no visibility field', () => {
    const raw = makeSyntheticRaw({ [0]: { x: 0.5, y: 0.5, z: 0 } })
    // Remove visibility from nose (index 0) by not including it in the override
    const rawWithoutVisibility = raw.map((r, i) =>
      i === 0 ? { x: r.x, y: r.y, z: r.z } : r
    ) as RawLandmark[]

    const lm = mapMediaPipeLandmarks(rawWithoutVisibility)
    expect(lm.nose.visibility).toBe(0)
  })

  it('returns a zero placeholder for a missing landmark index', () => {
    // Provide only 10 landmarks (fewer than 33)
    const shortRaw: RawLandmark[] = Array.from({ length: 10 }, (_, i) => ({
      x: i / 10, y: i / 10, z: 0, visibility: 0.9,
    }))
    const lm = mapMediaPipeLandmarks(shortRaw)
    // Index 25 (leftKnee) is beyond the array — should return zero placeholder
    expect(lm.leftKnee.x).toBe(0)
    expect(lm.leftKnee.y).toBe(0)
    expect(lm.leftKnee.visibility).toBe(0)
  })

  it('correctly maps ALL 33 named fields without duplication', () => {
    // Give each landmark a unique x-value equal to its index
    const raw = makeSyntheticRaw()
    const lm  = mapMediaPipeLandmarks(raw)

    const namedKeys = [
      'nose', 'leftEyeInner', 'leftEye', 'leftEyeOuter',
      'rightEyeInner', 'rightEye', 'rightEyeOuter',
      'leftEar', 'rightEar', 'mouthLeft', 'mouthRight',
      'leftShoulder', 'rightShoulder',
      'leftElbow', 'rightElbow',
      'leftWrist', 'rightWrist',
      'leftPinky', 'rightPinky', 'leftIndex', 'rightIndex',
      'leftThumb', 'rightThumb',
      'leftHip', 'rightHip',
      'leftKnee', 'rightKnee',
      'leftAnkle', 'rightAnkle',
      'leftHeel', 'rightHeel',
      'leftFootIndex', 'rightFootIndex',
    ] as const

    // Verify every named key exists and has correct x value
    for (const key of namedKeys) {
      const expectedIndex = Object.entries(LANDMARK_INDEX).find(
        ([name]) => name.toLowerCase().replace(/_/g, '') === key.toLowerCase()
      )?.[1]
      if (expectedIndex !== undefined) {
        expect(lm[key].x).toBeCloseTo(expectedIndex / 100)
      }
    }

    // All 33 keys should be present
    expect(namedKeys).toHaveLength(33)
  })
})

describe('isVisible', () => {
  it('returns true when visibility meets the threshold', () => {
    expect(isVisible({ x: 0, y: 0, z: 0, visibility: VISIBILITY_THRESHOLD })).toBe(true)
    expect(isVisible({ x: 0, y: 0, z: 0, visibility: 1.0 })).toBe(true)
  })

  it('returns false when visibility is below the threshold', () => {
    expect(isVisible({ x: 0, y: 0, z: 0, visibility: VISIBILITY_THRESHOLD - 0.01 })).toBe(false)
    expect(isVisible({ x: 0, y: 0, z: 0, visibility: 0 })).toBe(false)
  })

  it('respects a custom threshold', () => {
    const lm = { x: 0, y: 0, z: 0, visibility: 0.7 }
    expect(isVisible(lm, 0.7)).toBe(true)
    expect(isVisible(lm, 0.71)).toBe(false)
  })
})

describe('hasRequiredSquatLandmarks', () => {
  it('returns true when all required landmarks are visible', () => {
    const raw = makeSyntheticRaw() // all visibility 0.9
    const lm  = mapMediaPipeLandmarks(raw)
    expect(hasRequiredSquatLandmarks(lm)).toBe(true)
  })

  it('returns false when left knee is not visible', () => {
    const raw = makeSyntheticRaw({ [LANDMARK_INDEX.LEFT_KNEE]: { visibility: 0.1 } })
    const lm  = mapMediaPipeLandmarks(raw)
    expect(hasRequiredSquatLandmarks(lm)).toBe(false)
  })

  it('returns false when right hip is not visible', () => {
    const raw = makeSyntheticRaw({ [LANDMARK_INDEX.RIGHT_HIP]: { visibility: 0.0 } })
    const lm  = mapMediaPipeLandmarks(raw)
    expect(hasRequiredSquatLandmarks(lm)).toBe(false)
  })

  it('returns false when both ankles are not visible', () => {
    const raw = makeSyntheticRaw({
      [LANDMARK_INDEX.LEFT_ANKLE]:  { visibility: 0.1 },
      [LANDMARK_INDEX.RIGHT_ANKLE]: { visibility: 0.1 },
    })
    const lm = mapMediaPipeLandmarks(raw)
    expect(hasRequiredSquatLandmarks(lm)).toBe(false)
  })
})

describe('midpoint', () => {
  it('calculates the geometric midpoint of two landmarks', () => {
    const a = { x: 0.2, y: 0.4, z: 0.1, visibility: 0.9 }
    const b = { x: 0.6, y: 0.8, z: 0.3, visibility: 0.9 }
    const mid = midpoint(a, b)
    expect(mid.x).toBeCloseTo(0.4)
    expect(mid.y).toBeCloseTo(0.6)
    expect(mid.z).toBeCloseTo(0.2)
  })

  it('returns the same point when both inputs are identical', () => {
    const a = { x: 0.5, y: 0.5, z: 0.0, visibility: 1.0 }
    const mid = midpoint(a, a)
    expect(mid.x).toBe(0.5)
    expect(mid.y).toBe(0.5)
  })
})

describe('LANDMARK_INDEX constants', () => {
  it('has exactly 33 entries', () => {
    expect(Object.keys(LANDMARK_INDEX)).toHaveLength(33)
  })

  it('key values span 0–32 with no gaps', () => {
    const values = Object.values(LANDMARK_INDEX).sort((a, b) => a - b)
    for (let i = 0; i < 33; i++) {
      expect(values[i]).toBe(i)
    }
  })
})
