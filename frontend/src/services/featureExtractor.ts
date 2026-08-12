/**
 * featureExtractor.ts — Biomechanical feature extraction from pose landmarks.
 *
 * ──────────────────────────────────────────────────────────────────────────────
 * RATIONALE & ARCHITECTURE
 * ──────────────────────────────────────────────────────────────────────────────
 * Converts raw normalized pose landmarks into structured, numerical features.
 *
 * 1. 2D vs 3D Geometry:
 *    - Uses 2D normalized x/y image coordinates for MVP calculations.
 *    - Rationale: Monocular camera pose landmarker 2D coordinates are calibrated
 *      relative to frame dimensions and provide highly stable angle estimates in both
 *      frontal and sagittal camera setups.
 *    - Limitation: Depth (z) from a single camera is an uncalibrated relative estimate
 *      and can introduce noise into 3D dot products without multi-camera calibration.
 *
 * 2. Pretrained CV vs Custom ML:
 *    - These features are deterministic mathematical derivations from MediaPipe landmarks.
 *    - They are NOT AI predictions.
 *    - They serve as the input vector for rule-based analysis (Steps 6-8) and
 *      future custom ML classifier models.
 * ──────────────────────────────────────────────────────────────────────────────
 */

import type { PoseLandmarks, Landmark } from '@/types/landmarks'
import { isVisible, VISIBILITY_THRESHOLD, hasRequiredSquatLandmarks } from '@/types/landmarks'
import type { SquatFeatures } from '@/types/analysis'

// ─── Mathematical Primitives ──────────────────────────────────────────────────

/**
 * calculateAngle — Computes the 2D angle in degrees formed by three points (A – B – C).
 *
 * The angle is calculated at vertex point B.
 *
 * Vector math:
 *   BA = A - B
 *   BC = C - B
 *   cos(theta) = (BA · BC) / (|BA| * |BC|)
 *   theta = arccos(clamp(cos(theta), -1, 1))
 *
 * @param a - First point (e.g. Hip)
 * @param b - Vertex point (e.g. Knee)
 * @param c - Third point (e.g. Ankle)
 * @param threshold - Minimum visibility score required for points A, B, and C
 * @returns Angle in degrees [0, 180], or null if any point is below threshold or degenerate
 */
export function calculateAngle(
  a: Landmark | null | undefined,
  b: Landmark | null | undefined,
  c: Landmark | null | undefined,
  threshold = VISIBILITY_THRESHOLD
): number | null {
  if (!a || !b || !c) return null
  if (!isVisible(a, threshold) || !isVisible(b, threshold) || !isVisible(c, threshold)) {
    return null
  }

  // Vector BA (from B to A)
  const baX = a.x - b.x
  const baY = a.y - b.y

  // Vector BC (from B to C)
  const bcX = c.x - b.x
  const bcY = c.y - b.y

  // Magnitudes
  const magBA = Math.hypot(baX, baY)
  const magBC = Math.hypot(bcX, bcY)

  // Guard against zero-length vectors (overlapping points)
  if (magBA === 0 || magBC === 0) {
    return null
  }

  // Dot product
  const dot = baX * bcX + baY * bcY

  // Cosine of angle
  const cosTheta = dot / (magBA * magBC)

  // Clamp cosine to [-1, 1] to prevent floating-point precision domain errors in Math.acos
  const clampedCos = Math.max(-1.0, Math.min(1.0, cosTheta))

  // Calculate angle in radians and convert to degrees
  const angleRad = Math.acos(clampedCos)
  const angleDeg = angleRad * (180 / Math.PI)

  return Math.round(angleDeg * 10) / 10 // Round to 1 decimal place
}

/**
 * calculateTorsoInclination — Computes torso inclination angle relative to vertical.
 *
 * Vector definition:
 *   shoulderMid = (leftShoulder + rightShoulder) / 2
 *   hipMid      = (leftHip + rightHip) / 2
 *   torsoVector = shoulderMid - hipMid (pointing upwards in image space)
 *
 * Coordinate Convention:
 *   In 2D screen coordinates, y increases DOWNWARDS (top of image is y=0).
 *   Therefore, vertical UP is represented by direction vector (0, -1).
 *
 * Angle result:
 *   0°  = Perfectly upright torso (shoulderMid directly above hipMid).
 *   >0° = Torso leaning forward (or backward), in degrees.
 *
 * @returns Torso angle relative to vertical in degrees [0, 90+], or null if unconfident
 */
export function calculateTorsoInclination(
  leftShoulder: Landmark | null | undefined,
  rightShoulder: Landmark | null | undefined,
  leftHip: Landmark | null | undefined,
  rightHip: Landmark | null | undefined,
  threshold = VISIBILITY_THRESHOLD
): number | null {
  if (!leftShoulder || !rightShoulder || !leftHip || !rightHip) return null
  if (
    !isVisible(leftShoulder, threshold) ||
    !isVisible(rightShoulder, threshold) ||
    !isVisible(leftHip, threshold) ||
    !isVisible(rightHip, threshold)
  ) {
    return null
  }

  // Midpoints
  const shoulderMidX = (leftShoulder.x + rightShoulder.x) / 2
  const shoulderMidY = (leftShoulder.y + rightShoulder.y) / 2

  const hipMidX = (leftHip.x + rightHip.x) / 2
  const hipMidY = (leftHip.y + rightHip.y) / 2

  // Vector from hip to shoulder (pointing UP)
  const vX = shoulderMidX - hipMidX
  const vY = shoulderMidY - hipMidY

  const magV = Math.hypot(vX, vY)
  if (magV === 0) return null

  // Dot product with vertical UP vector (0, -1):
  // (vX * 0) + (vY * -1) = -vY
  const cosTheta = -vY / magV
  const clampedCos = Math.max(-1.0, Math.min(1.0, cosTheta))

  const angleDeg = Math.acos(clampedCos) * (180 / Math.PI)
  return Math.round(angleDeg * 10) / 10
}

// ─── Main Feature Extractor Function ──────────────────────────────────────────

/**
 * extractFeatures — Extracts full set of biomechanical features from pose landmarks.
 *
 * Pure function: does not mutate inputs or hold internal state.
 *
 * @param landmarks - PoseLandmarks object from MediaPipe detection, or null
 * @param timestamp - Optional timestamp in ms (defaults to performance.now())
 * @returns SquatFeatures object containing extracted numerical features
 */
export function extractFeatures(
  landmarks: PoseLandmarks | null,
  timestamp = performance.now()
): SquatFeatures {
  if (!landmarks) {
    return {
      timestamp,
      leftKneeAngle: null,
      rightKneeAngle: null,
      kneeAngle: null,
      leftHipAngle: null,
      rightHipAngle: null,
      hipAngle: null,
      leftElbowAngle: null,
      rightElbowAngle: null,
      torsoInclination: null,
      torsoAngle: null,
      leftKneeAnkleOffset: null,
      rightKneeAnkleOffset: null,
      normalizedLeftKneeAnkleOffset: null,
      normalizedRightKneeAnkleOffset: null,
      kneeAngleSymmetry: null,
      hipAngleSymmetry: null,
      isReliable: false,
    }
  }

  // 1. Joint Angles
  const leftKneeAngle = calculateAngle(landmarks.leftHip, landmarks.leftKnee, landmarks.leftAnkle)
  const rightKneeAngle = calculateAngle(landmarks.rightHip, landmarks.rightKnee, landmarks.rightAnkle)

  const leftHipAngle = calculateAngle(landmarks.leftShoulder, landmarks.leftHip, landmarks.leftKnee)
  const rightHipAngle = calculateAngle(landmarks.rightShoulder, landmarks.rightHip, landmarks.rightKnee)

  const leftElbowAngle = calculateAngle(landmarks.leftShoulder, landmarks.leftElbow, landmarks.leftWrist)
  const rightElbowAngle = calculateAngle(landmarks.rightShoulder, landmarks.rightElbow, landmarks.rightWrist)

  const torsoInclination = calculateTorsoInclination(
    landmarks.leftShoulder,
    landmarks.rightShoulder,
    landmarks.leftHip,
    landmarks.rightHip
  )

  // Average joint angles
  let kneeAngle: number | null = null
  if (leftKneeAngle !== null && rightKneeAngle !== null) {
    kneeAngle = Math.round(((leftKneeAngle + rightKneeAngle) / 2) * 10) / 10
  } else {
    kneeAngle = leftKneeAngle ?? rightKneeAngle
  }

  let hipAngle: number | null = null
  if (leftHipAngle !== null && rightHipAngle !== null) {
    hipAngle = Math.round(((leftHipAngle + rightHipAngle) / 2) * 10) / 10
  } else {
    hipAngle = leftHipAngle ?? rightHipAngle
  }

  // 2. Alignment & Offsets
  let leftKneeAnkleOffset: number | null = null
  let rightKneeAnkleOffset: number | null = null
  let normLeftOffset: number | null = null
  let normRightOffset: number | null = null

  if (isVisible(landmarks.leftKnee) && isVisible(landmarks.leftAnkle)) {
    leftKneeAnkleOffset = Math.round((landmarks.leftKnee.x - landmarks.leftAnkle.x) * 1000) / 1000
  }

  if (isVisible(landmarks.rightKnee) && isVisible(landmarks.rightAnkle)) {
    rightKneeAnkleOffset = Math.round((landmarks.rightKnee.x - landmarks.rightAnkle.x) * 1000) / 1000
  }

  if (isVisible(landmarks.leftHip) && isVisible(landmarks.rightHip)) {
    const hipWidth = Math.hypot(
      landmarks.leftHip.x - landmarks.rightHip.x,
      landmarks.leftHip.y - landmarks.rightHip.y
    )
    if (hipWidth > 0) {
      if (leftKneeAnkleOffset !== null) {
        normLeftOffset = Math.round((leftKneeAnkleOffset / hipWidth) * 100) / 100
      }
      if (rightKneeAnkleOffset !== null) {
        normRightOffset = Math.round((rightKneeAnkleOffset / hipWidth) * 100) / 100
      }
    }
  }

  // 3. Symmetry
  let kneeAngleSymmetry: number | null = null
  if (leftKneeAngle !== null && rightKneeAngle !== null) {
    kneeAngleSymmetry = Math.round(Math.abs(leftKneeAngle - rightKneeAngle) * 10) / 10
  }

  let hipAngleSymmetry: number | null = null
  if (leftHipAngle !== null && rightHipAngle !== null) {
    hipAngleSymmetry = Math.round(Math.abs(leftHipAngle - rightHipAngle) * 10) / 10
  }

  const isReliable = hasRequiredSquatLandmarks(landmarks)

  return {
    timestamp,
    leftKneeAngle,
    rightKneeAngle,
    kneeAngle,
    leftHipAngle,
    rightHipAngle,
    hipAngle,
    leftElbowAngle,
    rightElbowAngle,
    torsoInclination,
    torsoAngle: torsoInclination,
    leftKneeAnkleOffset,
    rightKneeAnkleOffset,
    normalizedLeftKneeAnkleOffset: normLeftOffset,
    normalizedRightKneeAnkleOffset: normRightOffset,
    kneeAngleSymmetry,
    hipAngleSymmetry,
    isReliable,
  }
}

// ─── Optional Feature Smoother ────────────────────────────────────────────────

/**
 * FeatureSmoother — Exponential Moving Average (EMA) temporal smoother.
 *
 * Keeps a smooth signal without introducing significant phase lag.
 * Alpha factor controls smoothing intensity (0.3 = smooth, 0.8 = responsive).
 */
export class FeatureSmoother {
  private alpha: number
  private lastFeatures: SquatFeatures | null = null

  constructor(alpha = 0.35) {
    this.alpha = alpha
  }

  smooth(raw: SquatFeatures): SquatFeatures {
    if (!this.lastFeatures || !raw.isReliable) {
      this.lastFeatures = raw
      return raw
    }

    const smoothVal = (curr: number | null, prev: number | null): number | null => {
      if (curr === null) return prev
      if (prev === null) return curr
      return Math.round((curr * this.alpha + prev * (1 - this.alpha)) * 10) / 10
    }

    const prev = this.lastFeatures
    const smoothed: SquatFeatures = {
      ...raw,
      leftKneeAngle:    smoothVal(raw.leftKneeAngle, prev.leftKneeAngle),
      rightKneeAngle:   smoothVal(raw.rightKneeAngle, prev.rightKneeAngle),
      kneeAngle:        smoothVal(raw.kneeAngle, prev.kneeAngle),
      leftHipAngle:     smoothVal(raw.leftHipAngle, prev.leftHipAngle),
      rightHipAngle:    smoothVal(raw.rightHipAngle, prev.rightHipAngle),
      hipAngle:         smoothVal(raw.hipAngle, prev.hipAngle),
      torsoInclination: smoothVal(raw.torsoInclination, prev.torsoInclination),
      torsoAngle:       smoothVal(raw.torsoAngle ?? null, prev.torsoAngle ?? null),
    }

    this.lastFeatures = smoothed
    return smoothed
  }

  reset(): void {
    this.lastFeatures = null
  }
}
