/**
 * poseRenderer.ts — Real-time pose skeleton rendering engine.
 *
 * ──────────────────────────────────────────────────────────────────────────────
 * RESPONSIBILITIES
 * ──────────────────────────────────────────────────────────────────────────────
 *  1. Map normalized [0, 1] landmark coordinates to canvas pixel space.
 *  2. Render skeleton connection lines between anatomically connected joints.
 *  3. Render landmark joint circles with visibility filtering.
 *  4. Maintain a clean, high-performance, dark AI/CV visual design.
 *
 * NOTE: This module contains ONLY visualization logic.
 *       It does NOT calculate angles, count reps, or evaluate form.
 * ──────────────────────────────────────────────────────────────────────────────
 */

import type { PoseLandmarks } from '@/types/landmarks'
import { isVisible, VISIBILITY_THRESHOLD } from '@/types/landmarks'

// ─── Connection Definitions ───────────────────────────────────────────────────

/**
 * Connection pair represented by raw landmark index pairs.
 */
export type LandmarkConnection = [number, number]

/**
 * Complete list of anatomical connections for MediaPipe 33-landmark pose.
 *
 * Grouped logically:
 *  - Torso box & shoulders
 *  - Left / Right Arms
 *  - Left / Right Legs
 *  - Face keypoints
 */
export const POSE_CONNECTIONS: LandmarkConnection[] = [
  // ── Torso ──────────────────────────────────────────────────────────────────
  [11, 12], // Left Shoulder ↔ Right Shoulder
  [11, 23], // Left Shoulder ↔ Left Hip
  [12, 24], // Right Shoulder ↔ Right Hip
  [23, 24], // Left Hip ↔ Right Hip

  // ── Left Arm ───────────────────────────────────────────────────────────────
  [11, 13], // Left Shoulder ↔ Left Elbow
  [13, 15], // Left Elbow ↔ Left Wrist
  [15, 17], // Left Wrist ↔ Left Pinky
  [15, 19], // Left Wrist ↔ Left Index
  [15, 21], // Left Wrist ↔ Left Thumb
  [17, 19], // Left Pinky ↔ Left Index

  // ── Right Arm ──────────────────────────────────────────────────────────────
  [12, 14], // Right Shoulder ↔ Right Elbow
  [14, 16], // Right Elbow ↔ Right Wrist
  [16, 18], // Right Wrist ↔ Right Pinky
  [16, 20], // Right Wrist ↔ Right Index
  [16, 22], // Right Wrist ↔ Right Thumb
  [18, 20], // Right Pinky ↔ Right Index

  // ── Left Leg ───────────────────────────────────────────────────────────────
  [23, 25], // Left Hip ↔ Left Knee
  [25, 27], // Left Knee ↔ Left Ankle
  [27, 29], // Left Ankle ↔ Left Heel
  [27, 31], // Left Ankle ↔ Left Foot Index
  [29, 31], // Left Heel ↔ Left Foot Index

  // ── Right Leg ──────────────────────────────────────────────────────────────
  [24, 26], // Right Hip ↔ Right Knee
  [26, 28], // Right Knee ↔ Right Ankle
  [28, 30], // Right Ankle ↔ Right Heel
  [28, 32], // Right Ankle ↔ Right Foot Index
  [30, 32], // Right Heel ↔ Right Foot Index

  // ── Face ───────────────────────────────────────────────────────────────────
  [0, 1],   // Nose ↔ Left Eye Inner
  [1, 2],   // Left Eye Inner ↔ Left Eye
  [2, 3],   // Left Eye ↔ Left Eye Outer
  [3, 7],   // Left Eye Outer ↔ Left Ear
  [0, 4],   // Nose ↔ Right Eye Inner
  [4, 5],   // Right Eye Inner ↔ Right Eye
  [5, 6],   // Right Eye ↔ Right Eye Outer
  [6, 8],   // Right Eye Outer ↔ Right Ear
  [9, 10],  // Mouth Left ↔ Mouth Right
]

// ─── Styling Configuration ────────────────────────────────────────────────────

export interface PoseRenderOptions {
  /** Minimum visibility score required to render a landmark or connection (default 0.5) */
  visibilityThreshold?: number
  /** Color of connection lines (default cyan/accent `#00d4ff`) */
  lineColor?: string
  /** Width of connection lines in pixels (default 2.5) */
  lineWidth?: number
  /** Color of standard joint circles (default `#ffffff`) */
  jointColor?: string
  /** Color of primary key joints (hips, knees, ankles, shoulders) (default `#00d4ff`) */
  keyJointColor?: string
  /** Radius of joint circles in pixels (default 4) */
  jointRadius?: number
  /** Whether to draw a subtle glow effect around lines (default true) */
  enableGlow?: boolean
}

const DEFAULT_OPTIONS: Required<PoseRenderOptions> = {
  visibilityThreshold: VISIBILITY_THRESHOLD,
  lineColor:           '#00d4ff',
  lineWidth:           2.5,
  jointColor:          '#ffffff',
  keyJointColor:       '#00f0ff',
  jointRadius:         4,
  enableGlow:          true,
}

// Key landmark indices that warrant emphasis (shoulders, hips, knees, ankles)
const KEY_LANDMARK_INDICES = new Set([11, 12, 23, 24, 25, 26, 27, 28])

// ─── Renderer Engine ──────────────────────────────────────────────────────────

/**
 * renderPose — Draws the pose skeleton onto a 2D HTML Canvas.
 *
 * @param ctx       Target 2D Canvas rendering context
 * @param landmarks PoseLandmarks object or null if no pose detected
 * @param width     Canvas display width in pixels
 * @param height    Canvas display height in pixels
 * @param options   Optional styling overrides
 */
export function renderPose(
  ctx: CanvasRenderingContext2D,
  landmarks: PoseLandmarks | null,
  width: number,
  height: number,
  options?: PoseRenderOptions
): void {
  // Always clear the canvas at the start of frame
  ctx.clearRect(0, 0, width, height)

  if (!landmarks || !landmarks.raw || landmarks.raw.length === 0) {
    return
  }

  const opts = { ...DEFAULT_OPTIONS, ...options }
  const raw = landmarks.raw

  ctx.save()

  // Set line join and cap for smooth connections
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  // Optional glow effect for modern AI/CV aesthetic
  if (opts.enableGlow) {
    ctx.shadowColor = opts.lineColor
    ctx.shadowBlur = 8
  } else {
    ctx.shadowBlur = 0
  }

  // ── Step 1: Draw connection lines ──────────────────────────────────────────
  ctx.strokeStyle = opts.lineColor
  ctx.lineWidth = opts.lineWidth

  ctx.beginPath()
  for (const [startIdx, endIdx] of POSE_CONNECTIONS) {
    const start = raw[startIdx]
    const end = raw[endIdx]

    if (
      start && end &&
      isVisible(start, opts.visibilityThreshold) &&
      isVisible(end, opts.visibilityThreshold)
    ) {
      const startX = start.x * width
      const startY = start.y * height
      const endX = end.x * width
      const endY = end.y * height

      ctx.moveTo(startX, startY)
      ctx.lineTo(endX, endY)
    }
  }
  ctx.stroke()

  // ── Step 2: Draw joint circles ─────────────────────────────────────────────
  // Disable shadow blur for crisp joint points
  ctx.shadowBlur = 0

  for (let i = 0; i < raw.length; i++) {
    const lm = raw[i]
    if (!lm || !isVisible(lm, opts.visibilityThreshold)) {
      continue
    }

    const x = lm.x * width
    const y = lm.y * height
    const isKeyJoint = KEY_LANDMARK_INDICES.has(i)
    const radius = isKeyJoint ? opts.jointRadius * 1.25 : opts.jointRadius

    ctx.beginPath()
    ctx.arc(x, y, radius, 0, 2 * Math.PI)

    // Fill color
    ctx.fillStyle = isKeyJoint ? opts.keyJointColor : opts.jointColor
    ctx.fill()

    // Outer border stroke for joint contrast
    ctx.strokeStyle = '#090d16' // dark background contrast
    ctx.lineWidth = 1.5
    ctx.stroke()
  }

  ctx.restore()
}
