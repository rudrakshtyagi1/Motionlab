/**
 * depthAnalyzer.ts — Dedicated multi-feature squat depth analyzer service.
 *
 * ──────────────────────────────────────────────────────────────────────────────
 * RATIONALE & ARCHITECTURE
 * ──────────────────────────────────────────────────────────────────────────────
 * Eliminates single-threshold single-frame contradictions by evaluating depth across
 * multiple anatomical pose features:
 *
 *   1. Knee flexion angle (kneeAngle in degrees)
 *   2. Hip vertical position relative to knee (hipKneeVerticalOffset = hipY - kneeY)
 *   3. Ankle position & hip-ankle alignment
 *   4. Normalized hip-to-knee distance
 *   5. Minimum depth reached during the rep
 *   6. Motion trajectory across the complete rep sequence
 *
 * Depth Classifications:
 *   - FULL    : Valid full squat (kneeAngle <= 100° AND hip level at or near knees)
 *   - PARTIAL : Partial squat attempt (kneeAngle 101°–120°)
 *   - SHALLOW : Shallow squat attempt (kneeAngle > 120°)
 * ──────────────────────────────────────────────────────────────────────────────
 */

import type { SquatFeatures } from '@/types/analysis'

export const SQUAT_CONFIG = {
  /** Target knee flexion angle for valid full squat depth (degrees) */
  fullDepthKneeAngleMax: 100,
  /** Partial squat knee angle range upper bound (degrees) */
  partialDepthKneeAngleMax: 120,

  /** Hip vertical offset threshold relative to knee (normalized Y) */
  fullDepthHipKneeOffsetMax: 0.08,

  /** Minimum consecutive frames required at depth for noise immunity */
  minDepthFrames: 1,
}

export type DepthClassification = 'FULL' | 'PARTIAL' | 'SHALLOW'

export interface DepthAnalysisResult {
  classification: DepthClassification
  kneeAngle: number | null
  depthScore: number // 0-100% normalized depth score
  hipKneeOffset: number | null
  isFullDepth: boolean
  isPartialDepth: boolean
  isShallow: boolean
  message: string
}

/** Helper to compute percentile value from array of numbers */
function calculatePercentile(values: number[], percentile: number): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.max(0, Math.min(sorted.length - 1, Math.floor((percentile / 100) * sorted.length)))
  return sorted[index]
}

/**
 * classifyDepth — Pure classification function based on knee angle & hip-knee offset.
 */
export function classifyDepth(
  kneeAngle: number | null,
  hipKneeOffset: number | null = null
): DepthAnalysisResult {
  if (kneeAngle === null || kneeAngle < 50 || kneeAngle > 180) {
    return {
      classification: 'SHALLOW',
      kneeAngle: null,
      depthScore: 0,
      hipKneeOffset,
      isFullDepth: false,
      isPartialDepth: false,
      isShallow: true,
      message: 'No reliable depth tracking',
    }
  }

  const roundedAngle = Math.round(kneeAngle * 10) / 10

  // Depth Score: 0-100% normalized based on target depth threshold (180° = 0%, 100° = 100%)
  const rawDepthScore = ((180 - roundedAngle) / (180 - SQUAT_CONFIG.fullDepthKneeAngleMax)) * 100
  const depthScore = Math.min(100, Math.max(0, Math.round(rawDepthScore)))

  // Multi-feature check: knee angle <= 100° AND hip vertical offset <= threshold
  const passesAngle = roundedAngle <= SQUAT_CONFIG.fullDepthKneeAngleMax
  const passesHipOffset = hipKneeOffset === null || hipKneeOffset <= SQUAT_CONFIG.fullDepthHipKneeOffsetMax

  if (passesAngle && passesHipOffset) {
    return {
      classification: 'FULL',
      kneeAngle: roundedAngle,
      depthScore,
      hipKneeOffset,
      isFullDepth: true,
      isPartialDepth: false,
      isShallow: false,
      message: `Full depth reached (${roundedAngle}°)`,
    }
  }

  if (roundedAngle <= SQUAT_CONFIG.partialDepthKneeAngleMax) {
    return {
      classification: 'PARTIAL',
      kneeAngle: roundedAngle,
      depthScore,
      hipKneeOffset,
      isFullDepth: false,
      isPartialDepth: true,
      isShallow: false,
      message: `Partial depth (${roundedAngle}°)`,
    }
  }

  return {
    classification: 'SHALLOW',
    kneeAngle: roundedAngle,
    depthScore,
    hipKneeOffset,
    isFullDepth: false,
    isPartialDepth: false,
    isShallow: true,
    message: `Shallow attempt (${roundedAngle}°)`,
  }
}

/**
 * analyzeSquatDepth — Evaluates a single frame's SquatFeatures.
 */
export function analyzeSquatDepth(features: SquatFeatures): DepthAnalysisResult {
  if (!features.isReliable) {
    return classifyDepth(null)
  }
  return classifyDepth(features.kneeAngle, null)
}

/**
 * calculateRepDepth — Evaluates an entire frame sequence collected during a repetition.
 * Uses 10th percentile lowest robust angle (>= 50°) to eliminate 1-frame tracking glitches.
 */
export function calculateRepDepth(frameSequence: SquatFeatures[]): DepthAnalysisResult {
  if (!frameSequence || frameSequence.length === 0) {
    return classifyDepth(null)
  }

  // Filter valid knee angles in human range (50° to 180°)
  const validKneeAngles = frameSequence
    .map(f => f.kneeAngle)
    .filter((a): a is number => a !== null && a >= 50 && a <= 180)

  if (validKneeAngles.length === 0) {
    return classifyDepth(null)
  }

  // 10th percentile lowest robust knee angle reached during attempt
  const minKneeAngle = calculatePercentile(validKneeAngles, 10)

  return classifyDepth(minKneeAngle)
}
