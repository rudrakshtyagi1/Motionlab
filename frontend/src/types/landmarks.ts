/**
 * landmarks.ts — Application-level body landmark types and mapping utilities.
 *
 * This file is the boundary between raw MediaPipe output and the rest of MotionLab.
 *
 * ──────────────────────────────────────────────────────────────────────────────
 * IMPORTANT NOTE ON POSE ESTIMATION
 * ──────────────────────────────────────────────────────────────────────────────
 * MotionLab uses a pretrained MediaPipe Pose Landmarker for body-pose estimation.
 * We did NOT train this model — it is provided by Google as part of the
 * MediaPipe Tasks library.
 *
 * MotionLab's contribution is:
 *   - The squat movement analysis logic (Steps 5–8)
 *   - The rule-based form feedback system
 *   - The rep-counting state machine
 *   - The clean landmark abstraction defined in this file
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * MediaPipe Coordinate System
 * ───────────────────────────
 * MediaPipe returns NORMALIZED coordinates, meaning values are relative to the
 * input image dimensions rather than absolute pixel positions:
 *
 *   x → horizontal position [0, 1]
 *       0 = left edge of frame, 1 = right edge
 *       Note: the raw video is NOT mirrored, so x=0 is the user's right side
 *             when using a front-facing camera. Our CameraView mirrors the video
 *             display horizontally (transform: scaleX(-1)) for the natural
 *             "mirror" effect, but landmark coordinates remain in the original
 *             (un-mirrored) space.
 *
 *   y → vertical position [0, 1]
 *       0 = top edge of frame, 1 = bottom edge
 *       (Note: y increases DOWNWARD, opposite of standard math convention)
 *
 *   z → depth relative to the hip midpoint
 *       Smaller z = closer to the camera
 *       Larger z = further from the camera
 *       Less reliable than x/y — use cautiously in calculations
 *
 *   visibility → model confidence that the landmark is visible [0, 1]
 *       Threshold recommendation from MediaPipe: 0.5
 *       Below this, landmark positions are unreliable
 */

// ─── Primitive types ──────────────────────────────────────────────────────────

/**
 * A single body landmark with normalized coordinates.
 *
 * Coordinates are in [0, 1] range relative to the input image.
 * See the coordinate system documentation above.
 */
export interface Landmark {
  /** Horizontal position [0, 1]. 0 = left edge, 1 = right edge. */
  x: number
  /** Vertical position [0, 1]. 0 = top edge, 1 = bottom edge (y increases downward). */
  y: number
  /**
   * Depth estimate relative to hip midpoint.
   * Smaller = closer to camera. Less reliable than x/y.
   */
  z: number
  /** Model confidence that this landmark is visible [0, 1]. Threshold: 0.5 */
  visibility: number
}

// ─── MediaPipe landmark index map ─────────────────────────────────────────────

/**
 * MediaPipe Pose Landmarker returns exactly 33 landmarks.
 * This map documents which index corresponds to which body part.
 *
 * Source: https://developers.google.com/mediapipe/solutions/vision/pose_landmarker
 */
export const LANDMARK_INDEX = {
  // ── Face ──────────────────────────────────────────────────────────────────
  NOSE:            0,
  LEFT_EYE_INNER:  1,
  LEFT_EYE:        2,
  LEFT_EYE_OUTER:  3,
  RIGHT_EYE_INNER: 4,
  RIGHT_EYE:       5,
  RIGHT_EYE_OUTER: 6,
  LEFT_EAR:        7,
  RIGHT_EAR:       8,
  MOUTH_LEFT:      9,
  MOUTH_RIGHT:     10,
  // ── Upper body ────────────────────────────────────────────────────────────
  LEFT_SHOULDER:   11,
  RIGHT_SHOULDER:  12,
  LEFT_ELBOW:      13,
  RIGHT_ELBOW:     14,
  LEFT_WRIST:      15,
  RIGHT_WRIST:     16,
  LEFT_PINKY:      17,
  RIGHT_PINKY:     18,
  LEFT_INDEX:      19,
  RIGHT_INDEX:     20,
  LEFT_THUMB:      21,
  RIGHT_THUMB:     22,
  // ── Lower body ────────────────────────────────────────────────────────────
  LEFT_HIP:        23,
  RIGHT_HIP:       24,
  LEFT_KNEE:       25,
  RIGHT_KNEE:      26,
  LEFT_ANKLE:      27,
  RIGHT_ANKLE:     28,
  LEFT_HEEL:       29,
  RIGHT_HEEL:      30,
  LEFT_FOOT_INDEX: 31,
  RIGHT_FOOT_INDEX: 32,
} as const

export const TOTAL_LANDMARK_COUNT = 33

// ─── Named landmark structure ─────────────────────────────────────────────────

/**
 * PoseLandmarks — application-level named landmark structure.
 *
 * Provides named access to all 33 MediaPipe Pose landmarks.
 * The `raw` array preserves the original ordered array for drawing algorithms
 * (skeleton connections are defined by index pairs, not names).
 *
 * Usage:
 *   landmarks.leftKnee.x      → normalized x position of left knee
 *   landmarks.leftKnee.visibility  → detection confidence
 *   landmarks.raw[25]         → same landmark via index (for drawing)
 */
export interface PoseLandmarks {
  // ── Face ──────────────────────────────────────────────────────────────────
  nose:           Landmark
  leftEyeInner:   Landmark
  leftEye:        Landmark
  leftEyeOuter:   Landmark
  rightEyeInner:  Landmark
  rightEye:       Landmark
  rightEyeOuter:  Landmark
  leftEar:        Landmark
  rightEar:       Landmark
  mouthLeft:      Landmark
  mouthRight:     Landmark

  // ── Upper body ────────────────────────────────────────────────────────────
  leftShoulder:   Landmark
  rightShoulder:  Landmark
  leftElbow:      Landmark
  rightElbow:     Landmark
  leftWrist:      Landmark
  rightWrist:     Landmark
  leftPinky:      Landmark
  rightPinky:     Landmark
  leftIndex:      Landmark
  rightIndex:     Landmark
  leftThumb:      Landmark
  rightThumb:     Landmark

  // ── Lower body ────────────────────────────────────────────────────────────
  leftHip:        Landmark
  rightHip:       Landmark
  leftKnee:       Landmark
  rightKnee:      Landmark
  leftAnkle:      Landmark
  rightAnkle:     Landmark
  leftHeel:       Landmark
  rightHeel:      Landmark
  leftFootIndex:  Landmark
  rightFootIndex: Landmark

  /**
   * Raw ordered array of all 33 landmarks.
   * Used by skeleton drawing code (Step 4) which addresses landmarks by index.
   * Also preserves full precision from the model output.
   */
  raw: Landmark[]
}

// ─── Raw MediaPipe landmark type ──────────────────────────────────────────────

/**
 * Minimal type for a raw landmark as returned by MediaPipe.
 * MediaPipe's NormalizedLandmark has x, y, z, and optionally visibility.
 */
export interface RawLandmark {
  x: number
  y: number
  z: number
  visibility?: number
}

// ─── Mapping function ─────────────────────────────────────────────────────────

/**
 * mapMediaPipeLandmarks — Convert raw MediaPipe landmark array to PoseLandmarks.
 *
 * This is the ONLY place in the application that knows the MediaPipe index→name
 * mapping. All other modules receive clean PoseLandmarks objects.
 *
 * @param rawLandmarks - Array of 33 NormalizedLandmark objects from MediaPipe
 * @returns PoseLandmarks with named fields and a preserved raw array
 */
export function mapMediaPipeLandmarks(rawLandmarks: RawLandmark[]): PoseLandmarks {
  /**
   * Safe landmark getter: returns a zero-confidence placeholder if the index
   * is missing (e.g. if a future model returns fewer than 33 landmarks).
   */
  const get = (index: number): Landmark => {
    const raw = rawLandmarks[index]
    if (!raw) {
      return { x: 0, y: 0, z: 0, visibility: 0 }
    }
    return {
      x:          raw.x,
      y:          raw.y,
      z:          raw.z,
      visibility: raw.visibility ?? 0,
    }
  }

  // Build the normalized raw array (ensures visibility is always a number)
  const normalizedRaw: Landmark[] = Array.from(
    { length: TOTAL_LANDMARK_COUNT },
    (_, i) => get(i)
  )

  const idx = LANDMARK_INDEX
  return {
    // Face
    nose:           get(idx.NOSE),
    leftEyeInner:   get(idx.LEFT_EYE_INNER),
    leftEye:        get(idx.LEFT_EYE),
    leftEyeOuter:   get(idx.LEFT_EYE_OUTER),
    rightEyeInner:  get(idx.RIGHT_EYE_INNER),
    rightEye:       get(idx.RIGHT_EYE),
    rightEyeOuter:  get(idx.RIGHT_EYE_OUTER),
    leftEar:        get(idx.LEFT_EAR),
    rightEar:       get(idx.RIGHT_EAR),
    mouthLeft:      get(idx.MOUTH_LEFT),
    mouthRight:     get(idx.MOUTH_RIGHT),
    // Upper body
    leftShoulder:   get(idx.LEFT_SHOULDER),
    rightShoulder:  get(idx.RIGHT_SHOULDER),
    leftElbow:      get(idx.LEFT_ELBOW),
    rightElbow:     get(idx.RIGHT_ELBOW),
    leftWrist:      get(idx.LEFT_WRIST),
    rightWrist:     get(idx.RIGHT_WRIST),
    leftPinky:      get(idx.LEFT_PINKY),
    rightPinky:     get(idx.RIGHT_PINKY),
    leftIndex:      get(idx.LEFT_INDEX),
    rightIndex:     get(idx.RIGHT_INDEX),
    leftThumb:      get(idx.LEFT_THUMB),
    rightThumb:     get(idx.RIGHT_THUMB),
    // Lower body
    leftHip:        get(idx.LEFT_HIP),
    rightHip:       get(idx.RIGHT_HIP),
    leftKnee:       get(idx.LEFT_KNEE),
    rightKnee:      get(idx.RIGHT_KNEE),
    leftAnkle:      get(idx.LEFT_ANKLE),
    rightAnkle:     get(idx.RIGHT_ANKLE),
    leftHeel:       get(idx.LEFT_HEEL),
    rightHeel:      get(idx.RIGHT_HEEL),
    leftFootIndex:  get(idx.LEFT_FOOT_INDEX),
    rightFootIndex: get(idx.RIGHT_FOOT_INDEX),
    raw: normalizedRaw,
  }
}

// ─── Visibility helpers ───────────────────────────────────────────────────────

/** Minimum visibility score for a landmark to be considered reliable. */
export const VISIBILITY_THRESHOLD = 0.5

/**
 * isVisible — returns true if a landmark meets the minimum visibility threshold.
 *
 * Use this before performing calculations on any landmark to avoid computing
 * angles or distances from unreliable landmark positions.
 */
export function isVisible(lm: Landmark, threshold = VISIBILITY_THRESHOLD): boolean {
  return lm.visibility >= threshold
}

/**
 * hasRequiredSquatLandmarks — returns true if all landmarks necessary for
 * squat analysis are visible with sufficient confidence.
 *
 * Minimum requirements for squat phase detection:
 *   - Both hips (position reference)
 *   - Both knees (primary angle measurement)
 *   - Both ankles (angle base point)
 *   - Both shoulders (torso inclination)
 */
export function hasRequiredSquatLandmarks(lm: PoseLandmarks): boolean {
  return (
    isVisible(lm.leftHip)      &&
    isVisible(lm.rightHip)     &&
    isVisible(lm.leftKnee)     &&
    isVisible(lm.rightKnee)    &&
    isVisible(lm.leftAnkle)    &&
    isVisible(lm.rightAnkle)   &&
    isVisible(lm.leftShoulder) &&
    isVisible(lm.rightShoulder)
  )
}

// ─── Utility ──────────────────────────────────────────────────────────────────

/**
 * midpoint — compute the geometric midpoint of two landmarks.
 * Used for shoulder midpoint, hip midpoint, etc.
 */
export function midpoint(a: Landmark, b: Landmark): { x: number; y: number; z: number } {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
    z: (a.z + b.z) / 2,
  }
}
