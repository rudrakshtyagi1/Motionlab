/**
 * formAnalyzer.ts — Deterministic rule-based squat form analysis service.
 *
 * Implements MovementAnalyzer interface.
 * Evaluates:
 *   1. Squat Depth (Knee flexion angle at bottom phase)
 *   2. Knee Tracking / Alignment (Lateral knee-ankle offset ratio)
 *   3. Torso Lean (Inclination angle from vertical)
 *   4. Movement Stability (Sliding-window variance of body position)
 *
 * Provides real-time coaching cues with anti-flicker debouncing and per-rep summaries
 * using robust percentile aggregation across movement frames to ignore 1-frame tracking noise spikes.
 */

import type {
  MovementAnalyzer,
  SquatFeatures,
  FormAnalysis,
  FormMetric,
  FormIssue,
  FormStatus,
  RepFormAnalysis,
  RepFormSummary,
} from '@/types/analysis'

// ─── Threshold Constants ──────────────────────────────────────────────────────

export const DEFAULT_FORM_CONFIG = {
  // Depth thresholds (knee angle at bottom)
  depthGoodMax: 100, // <= 100° = GOOD depth (thighs parallel or below)
  depthWarningMax: 115, // 101-115° = WARNING (shallow squat)

  // Knee tracking thresholds (offset / hip width ratio)
  kneeOffsetGoodMax: 0.25, // <= 0.25 = GOOD tracking
  kneeOffsetWarningMax: 0.40, // 0.26-0.40 = WARNING (valgus/cave)

  // Torso lean thresholds (inclination from vertical)
  torsoGoodMax: 30, // <= 30° = GOOD upright torso
  torsoWarningMax: 45, // 31-45° = WARNING (excessive forward lean)

  // Stability variance threshold
  stabilityGoodMax: 0.0015,
  stabilityWarningMax: 0.0040,

  // Debouncing duration (ms)
  minFeedbackDurationMs: 1500,
}

/** Helper to calculate percentile from array of numbers */
function calculatePercentile(values: number[], percentile: number): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.max(0, Math.min(sorted.length - 1, Math.floor((percentile / 100) * sorted.length)))
  return sorted[index]
}

export class RuleBasedSquatAnalyzer implements MovementAnalyzer {
  private config = DEFAULT_FORM_CONFIG
  private positionBuffer: { x: number; y: number }[] = []
  private activePrimaryMessage = '✓ GOOD FORM'
  private lastMessageChangeTime = 0

  // ── 1. Single Metric Evaluators ────────────────────────────────────────────

  public analyzeDepth(kneeAngle: number | null): FormMetric {
    if (kneeAngle === null) {
      return {
        name: 'Depth',
        value: 0,
        unit: '°',
        status: 'UNAVAILABLE',
        message: 'No knee tracking',
      }
    }

    const value = Math.round(kneeAngle * 10) / 10

    if (value <= this.config.depthGoodMax) {
      return {
        name: 'Depth',
        value,
        unit: '°',
        status: 'GOOD',
        message: `Good Depth (${value}°)`,
      }
    }
    if (value <= this.config.depthWarningMax) {
      return {
        name: 'Depth',
        value,
        unit: '°',
        status: 'WARNING',
        message: `Go deeper (${value}°)`,
      }
    }
    return {
      name: 'Depth',
      value,
      unit: '°',
      status: 'POOR',
      message: `Insufficient depth (${value}°)`,
    }
  }

  public analyzeKneeAlignment(
    leftOffset: number | null,
    rightOffset: number | null
  ): FormMetric {
    const leftVal = leftOffset !== null ? Math.abs(leftOffset) : null
    const rightVal = rightOffset !== null ? Math.abs(rightOffset) : null

    if (leftVal === null && rightVal === null) {
      return {
        name: 'Knee Alignment',
        value: 0,
        unit: 'ratio',
        status: 'UNAVAILABLE',
        message: 'No knee/ankle tracking',
      }
    }

    const maxOffset = Math.max(leftVal ?? 0, rightVal ?? 0)
    const value = Math.round(maxOffset * 100) / 100

    if (value <= this.config.kneeOffsetGoodMax) {
      return {
        name: 'Knee Alignment',
        value,
        unit: 'ratio',
        status: 'GOOD',
        message: 'Knees aligned with toes',
      }
    }
    if (value <= this.config.kneeOffsetWarningMax) {
      return {
        name: 'Knee Alignment',
        value,
        unit: 'ratio',
        status: 'WARNING',
        message: 'Slight knee cave detected',
      }
    }
    return {
      name: 'Knee Alignment',
      value,
      unit: 'ratio',
      status: 'POOR',
      message: 'Knees caving inward (Valgus)',
    }
  }

  public analyzeTorsoLean(torsoAngle: number | null): FormMetric {
    if (torsoAngle === null) {
      return {
        name: 'Torso Lean',
        value: 0,
        unit: '°',
        status: 'UNAVAILABLE',
        message: 'No torso tracking',
      }
    }

    const value = Math.round(torsoAngle * 10) / 10

    if (value <= this.config.torsoGoodMax) {
      return {
        name: 'Torso Lean',
        value,
        unit: '°',
        status: 'GOOD',
        message: `Upright torso (${value}°)`,
      }
    }
    if (value <= this.config.torsoWarningMax) {
      return {
        name: 'Torso Lean',
        value,
        unit: '°',
        status: 'WARNING',
        message: `Forward torso lean (${value}°)`,
      }
    }
    return {
      name: 'Torso Lean',
      value,
      unit: '°',
      status: 'POOR',
      message: `Excessive forward lean (${value}°)`,
    }
  }

  public analyzeStability(features: SquatFeatures): FormMetric {
    if (
      features.leftKneeAnkleOffset !== null &&
      features.rightKneeAnkleOffset !== null
    ) {
      this.positionBuffer.push({
        x: (features.leftKneeAnkleOffset + features.rightKneeAnkleOffset) / 2,
        y: features.kneeAngle ?? 0,
      })
      if (this.positionBuffer.length > 30) this.positionBuffer.shift()
    }

    if (this.positionBuffer.length < 5) {
      return {
        name: 'Stability',
        value: 0,
        unit: 'var',
        status: 'UNAVAILABLE',
        message: 'Calculating stability…',
      }
    }

    const xs = this.positionBuffer.map(p => p.x)
    const meanX = xs.reduce((a, b) => a + b, 0) / xs.length
    const varianceX = xs.reduce((a, b) => a + Math.pow(b - meanX, 2), 0) / xs.length
    const value = Math.round(varianceX * 10000) / 10000

    if (value <= this.config.stabilityGoodMax) {
      return {
        name: 'Stability',
        value,
        unit: 'var',
        status: 'GOOD',
        message: 'Stable balance',
      }
    }
    if (value <= this.config.stabilityWarningMax) {
      return {
        name: 'Stability',
        value,
        unit: 'var',
        status: 'WARNING',
        message: 'Slight lateral sway',
      }
    }
    return {
      name: 'Stability',
      value,
      unit: 'var',
      status: 'POOR',
      message: 'Unstable movement',
    }
  }

  // ── Per-Frame Analysis ─────────────────────────────────────────────────────

  public analyzeFrame(features: SquatFeatures): FormAnalysis {
    const timestamp = features.timestamp

    if (!features.isReliable) {
      return {
        depth: { name: 'Depth', value: 0, unit: '°', status: 'UNAVAILABLE', message: 'No tracking' },
        kneeAlignment: { name: 'Knee Alignment', value: 0, unit: 'ratio', status: 'UNAVAILABLE', message: 'No tracking' },
        torsoLean: { name: 'Torso Lean', value: 0, unit: '°', status: 'UNAVAILABLE', message: 'No tracking' },
        stability: { name: 'Stability', value: 0, unit: 'var', status: 'UNAVAILABLE', message: 'No tracking' },
        overall: 'UNAVAILABLE',
        feedback: [],
        primaryMessage: 'Move into full view of camera',
        formScore: 0,
      }
    }

    const depth = this.analyzeDepth(features.kneeAngle)
    const kneeAlignment = this.analyzeKneeAlignment(
      features.normalizedLeftKneeAnkleOffset,
      features.normalizedRightKneeAnkleOffset
    )
    const torsoLean = this.analyzeTorsoLean(features.torsoInclination)
    const stability = this.analyzeStability(features)

    const metrics: FormMetric[] = [depth, kneeAlignment, torsoLean, stability]

    let overall: FormStatus = 'GOOD'
    if (metrics.some(m => m.status === 'POOR')) {
      overall = 'POOR'
    } else if (metrics.some(m => m.status === 'WARNING')) {
      overall = 'WARNING'
    } else if (metrics.every(m => m.status === 'UNAVAILABLE')) {
      overall = 'UNAVAILABLE'
    }

    const issues: FormIssue[] = []
    if (depth.status === 'WARNING' || depth.status === 'POOR') {
      issues.push({ type: 'INSUFFICIENT_DEPTH', severity: depth.status === 'POOR' ? 'CRITICAL' : 'WARNING', message: depth.message, timestamp })
    }
    if (kneeAlignment.status === 'WARNING' || kneeAlignment.status === 'POOR') {
      issues.push({ type: 'KNEE_ALIGNMENT', severity: kneeAlignment.status === 'POOR' ? 'CRITICAL' : 'WARNING', message: kneeAlignment.message, timestamp })
    }
    if (torsoLean.status === 'WARNING' || torsoLean.status === 'POOR') {
      issues.push({ type: 'TORSO_LEAN', severity: torsoLean.status === 'POOR' ? 'CRITICAL' : 'WARNING', message: torsoLean.message, timestamp })
    }
    if (stability.status === 'WARNING' || stability.status === 'POOR') {
      issues.push({ type: 'INSTABILITY', severity: stability.status === 'POOR' ? 'CRITICAL' : 'WARNING', message: stability.message, timestamp })
    }

    let targetMessage = '✓ GOOD FORM'
    if (depth.status === 'WARNING' || depth.status === 'POOR') {
      targetMessage = '↓ GO A LITTLE DEEPER'
    } else if (kneeAlignment.status === 'WARNING' || kneeAlignment.status === 'POOR') {
      targetMessage = '⚠ WATCH YOUR KNEE ALIGNMENT'
    } else if (torsoLean.status === 'WARNING' || torsoLean.status === 'POOR') {
      targetMessage = '↑ KEEP YOUR TORSO MORE UPRIGHT'
    } else if (stability.status === 'WARNING' || stability.status === 'POOR') {
      targetMessage = '⚓ MAINTAIN BALANCE & STABILITY'
    }

    if (targetMessage !== this.activePrimaryMessage) {
      const elapsed = timestamp - this.lastMessageChangeTime
      if (elapsed >= this.config.minFeedbackDurationMs || this.lastMessageChangeTime === 0) {
        this.activePrimaryMessage = targetMessage
        this.lastMessageChangeTime = timestamp
      }
    }

    let deductions = 0
    if (depth.status === 'POOR') deductions += 25
    else if (depth.status === 'WARNING') deductions += 10

    if (kneeAlignment.status === 'POOR') deductions += 25
    else if (kneeAlignment.status === 'WARNING') deductions += 10

    if (torsoLean.status === 'POOR') deductions += 25
    else if (torsoLean.status === 'WARNING') deductions += 10

    if (stability.status === 'POOR') deductions += 25
    else if (stability.status === 'WARNING') deductions += 10

    const formScore = Math.max(0, 100 - deductions)

    return {
      depth,
      kneeAlignment,
      torsoLean,
      stability,
      overall,
      feedback: issues,
      primaryMessage: this.activePrimaryMessage,
      formScore,
    }
  }

  // ── Rep-Level Robust Aggregation ──────────────────────────────────────────

  /**
   * analyzeRep — Evaluates all frames collected during a completed rep to produce
   * robust representative metrics (10th percentile for knee angle, 75th percentile for lean/valgus)
   * ignoring single-frame noise spikes.
   */
  public analyzeRep(repFeatures: SquatFeatures[]): RepFormAnalysis {
    if (!repFeatures || repFeatures.length === 0) {
      const summary: RepFormSummary = {
        repNumber: 1,
        depth: { status: 'UNAVAILABLE', message: 'No data' },
        kneeAlignment: { status: 'UNAVAILABLE', message: 'No data' },
        torsoLean: { status: 'UNAVAILABLE', message: 'No data' },
        stability: { status: 'UNAVAILABLE', message: 'No data' },
        overall: 'UNAVAILABLE',
        issues: [],
      }
      return {
        repIndex: 1,
        score: 0,
        issues: [],
        minKneeAngle: 180,
        avgTorsoAngle: 0,
        avgKneeAlignment: 0,
        isGoodRep: false,
        summary,
      }
    }

    // 1. Robust Min Knee Angle (Anatomically valid human knee range 50°–180°)
    const validKneeAngles = repFeatures
      .map(f => f.kneeAngle)
      .filter((a): a is number => a !== null && a >= 50 && a <= 180)

    const minKneeAngle = validKneeAngles.length > 0
      ? Math.round(calculatePercentile(validKneeAngles, 10) * 10) / 10 // 10th percentile lowest robust angle
      : 180

    // 2. Robust Torso Lean (75th percentile of inclinations)
    const validTorsoAngles = repFeatures
      .map(f => f.torsoInclination)
      .filter((a): a is number => a !== null)

    const representativeTorsoAngle = validTorsoAngles.length > 0
      ? Math.round(calculatePercentile(validTorsoAngles, 75) * 10) / 10
      : 0

    // 3. Robust Knee Alignment Offset (75th percentile of normalized lateral offsets)
    const validKneeOffsets = repFeatures
      .map(f => Math.max(
        Math.abs(f.normalizedLeftKneeAnkleOffset ?? 0),
        Math.abs(f.normalizedRightKneeAnkleOffset ?? 0)
      ))
      .filter(val => val > 0)

    const representativeKneeOffset = validKneeOffsets.length > 0
      ? Math.round(calculatePercentile(validKneeOffsets, 75) * 100) / 100
      : 0

    const depth = this.analyzeDepth(minKneeAngle)
    const kneeAlignment = this.analyzeKneeAlignment(representativeKneeOffset, representativeKneeOffset)
    const torsoLean = this.analyzeTorsoLean(representativeTorsoAngle)
    const stability = this.analyzeStability(repFeatures[repFeatures.length - 1])

    const metrics = [depth, kneeAlignment, torsoLean, stability]
    let overall: FormStatus = 'GOOD'
    if (metrics.some(m => m.status === 'POOR')) overall = 'POOR'
    else if (metrics.some(m => m.status === 'WARNING')) overall = 'WARNING'

    let deductions = 0
    if (depth.status === 'POOR') deductions += 25
    else if (depth.status === 'WARNING') deductions += 10

    if (kneeAlignment.status === 'POOR') deductions += 25
    else if (kneeAlignment.status === 'WARNING') deductions += 10

    if (torsoLean.status === 'POOR') deductions += 25
    else if (torsoLean.status === 'WARNING') deductions += 10

    const score = Math.max(0, 100 - deductions)

    const issues: FormIssue[] = []
    const timestamp = repFeatures[repFeatures.length - 1].timestamp

    if (depth.status !== 'GOOD') {
      issues.push({ type: 'INSUFFICIENT_DEPTH', severity: depth.status === 'POOR' ? 'CRITICAL' : 'WARNING', message: depth.message, timestamp })
    }
    if (kneeAlignment.status !== 'GOOD') {
      issues.push({ type: 'KNEE_ALIGNMENT', severity: kneeAlignment.status === 'POOR' ? 'CRITICAL' : 'WARNING', message: kneeAlignment.message, timestamp })
    }
    if (torsoLean.status !== 'GOOD') {
      issues.push({ type: 'TORSO_LEAN', severity: torsoLean.status === 'POOR' ? 'CRITICAL' : 'WARNING', message: torsoLean.message, timestamp })
    }

    const summary: RepFormSummary = {
      repNumber: 1,
      depth,
      kneeAlignment,
      torsoLean,
      stability,
      overall,
      issues,
    }

    return {
      repIndex: 1,
      score,
      issues,
      minKneeAngle,
      avgTorsoAngle: representativeTorsoAngle,
      avgKneeAlignment: representativeKneeOffset,
      isGoodRep: overall === 'GOOD' || score >= 75,
      summary,
    }
  }

  public reset(): void {
    this.positionBuffer = []
    this.activePrimaryMessage = '✓ GOOD FORM'
    this.lastMessageChangeTime = 0
  }
}
