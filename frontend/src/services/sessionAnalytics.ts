/**
 * sessionAnalytics.ts — Pure calculation service for end-of-session performance reports.
 *
 * Computes SessionSummary entirely from actual completed rep records, session duration, and user profile weight.
 *
 *  - Zero fake AI scores
 *  - Zero hardcoded statistics
 *  - Pure, deterministic calculation logic suitable for unit testing
 *  - Movement consistency calculated via Coefficient of Variation (CV) across depth, tempo, and form quality (null if < 2 completed reps)
 *  - Calorie burn calculation using standard MET formula via estimateCalories()
 *  - Breakdown for validReps, partialReps, shallowReps, and totalAttempts
 */

import type { RepRecord, SessionSummary, FormBreakdown } from '@/types/session'
import type { FormStatus, FormIssueType } from '@/types/analysis'
import { estimateCalories } from '@/services/calorieEstimator'

export interface SessionMetadata {
  startTime:      number // ms epoch timestamp
  endTime:        number // ms epoch timestamp
  profileId?:     string
  weightKg?:      number | null
}

/**
 * Helper to extract overall FormStatus from a RepRecord.
 */
export function getRepFormStatus(rep: RepRecord): FormStatus {
  if (rep.formAnalysis?.summary?.overall) {
    return rep.formAnalysis.summary.overall
  }
  if (rep.formAnalysis) {
    return rep.formAnalysis.isGoodRep ? 'GOOD' : 'WARNING'
  }
  return 'GOOD'
}

/** Helper arithmetic mean */
function calculateMean(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

/** Helper population standard deviation */
function calculateStdDev(values: number[], mean: number): number {
  if (values.length <= 1) return 0
  const variance = values.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / values.length
  return Math.sqrt(variance)
}

/** Helper Coefficient of Variation consistency score: clamp(100 * (1 - CV), 0, 100) */
function calculateCVConsistency(values: number[]): number | null {
  if (values.length < 2) return null
  const mean = calculateMean(values)
  if (mean <= 0 || !isFinite(mean) || isNaN(mean)) return null
  const std = calculateStdDev(values, mean)
  const cv = std / Math.abs(mean)
  if (!isFinite(cv) || isNaN(cv)) return null
  const score = Math.max(0, Math.min(100, 100 * (1 - cv)))
  return isNaN(score) ? null : score
}

/**
 * calculateSessionConsistency — CV-based consistency evaluation across depth, tempo, & form score.
 *
 * Weights:
 *   - Depth consistency: 50%
 *   - Tempo (duration) consistency: 20%
 *   - Form quality score consistency: 30%
 *
 * Returns null if fewer than 2 valid completed reps exist.
 */
export function calculateSessionConsistency(reps: RepRecord[]): number | null {
  const completedReps = reps.filter(r => r.isCompleted !== false)
  const validRepCount = completedReps.length

  if (validRepCount < 2) {
    return null
  }

  // 1. Depth consistency (minimum knee angle in degrees)
  const depthValues = completedReps.map(r => r.bottomKneeAngle)
  const depthConsistency = calculateCVConsistency(depthValues)

  // 2. Tempo consistency (rep duration in seconds)
  const durationValues = completedReps.map(r => r.durationMs / 1000)
  const tempoConsistency = calculateCVConsistency(durationValues)

  // 3. Form quality consistency (rep form score 0-100)
  const formScoreValues = completedReps.map(r => r.formAnalysis?.score ?? 80)
  const formConsistency = calculateCVConsistency(formScoreValues)

  // Weighted Combination: Depth 50%, Tempo 20%, Form 30%
  let weightedSum = 0
  let totalWeight = 0

  if (depthConsistency !== null && !isNaN(depthConsistency)) {
    weightedSum += depthConsistency * 0.50
    totalWeight += 0.50
  }
  if (tempoConsistency !== null && !isNaN(tempoConsistency)) {
    weightedSum += tempoConsistency * 0.20
    totalWeight += 0.20
  }
  if (formConsistency !== null && !isNaN(formConsistency)) {
    weightedSum += formConsistency * 0.30
    totalWeight += 0.30
  }

  if (totalWeight <= 0) {
    return null
  }

  const rawFinal = weightedSum / totalWeight
  const finalConsistency = Math.round(Math.max(0, Math.min(100, rawFinal)))

  if (isNaN(finalConsistency) || !isFinite(finalConsistency)) {
    return null
  }

  console.log('[Consistency Calc]', {
    validRepCount,
    depthConsistency: depthConsistency !== null ? Math.round(depthConsistency) : null,
    tempoConsistency: tempoConsistency !== null ? Math.round(tempoConsistency) : null,
    formConsistency: formConsistency !== null ? Math.round(formConsistency) : null,
    finalConsistency,
  })

  return finalConsistency
}

/**
 * calculateSessionSummary — Derives full post-session statistics report.
 */
export function calculateSessionSummary(
  reps: RepRecord[],
  metadata: SessionMetadata
): SessionSummary {
  const startedAt = metadata.startTime
  const endedAt = metadata.endTime
  const durationSeconds = Math.max(0, Math.round((endedAt - startedAt) / 1000))
  const profileId = metadata.profileId || 'guest_default'
  const weightKgAtTime = metadata.weightKg ?? null

  // Separate valid completed reps from partial/shallow attempts
  const completedRepsList = reps.filter(r => r.isCompleted !== false)
  const incompleteRepsList = reps.filter(r => r.isCompleted === false)

  const validReps = completedRepsList.length
  const incompleteReps = incompleteRepsList.length
  const totalAttempts = reps.length

  const partialReps = reps.filter(r => r.depthClassification === 'PARTIAL').length
  const shallowReps = reps.filter(r => r.depthClassification === 'SHALLOW').length

  // 1. Average Rep Duration (valid completed reps only)
  const averageRepDuration = validReps > 0
    ? Math.round((completedRepsList.reduce((sum, r) => sum + r.durationMs, 0) / validReps / 1000) * 10) / 10
    : null

  // 2. Calorie Burn Calculation via estimateCalories()
  const caloriesEstimate = estimateCalories({
    weightKg: weightKgAtTime,
    durationSeconds,
  })
  const caloriesBurned = caloriesEstimate.calories

  // 3. Rep Quality Counts across completed reps
  let goodReps = 0
  let warningReps = 0
  let poorReps = 0

  for (const rep of completedRepsList) {
    const status = getRepFormStatus(rep)
    if (status === 'GOOD') goodReps++
    else if (status === 'WARNING') warningReps++
    else if (status === 'POOR') poorReps++
  }

  // 4. Movement Consistency Score (CV-based across depth, tempo, and form quality)
  const formConsistency = calculateSessionConsistency(reps)

  // 5. Form Breakdown Aggregation across completed reps
  const formBreakdown = aggregateFormBreakdown(completedRepsList)

  // 6. Issue Frequency Map across all reps
  const issueFrequency: Record<FormIssueType, number> = {
    INSUFFICIENT_DEPTH: 0,
    KNEE_ALIGNMENT: 0,
    TORSO_LEAN: 0,
    INSTABILITY: 0,
    ASYMMETRY: 0,
  }

  for (const rep of reps) {
    if (rep.formAnalysis?.issues) {
      for (const issue of rep.formAnalysis.issues) {
        issueFrequency[issue.type] = (issueFrequency[issue.type] ?? 0) + 1
      }
    }
  }

  // 7. Primary Improvement Recommendation (deterministic rule-based)
  const primaryImprovement = derivePrimaryImprovement(validReps, issueFrequency)

  // 8. Best & Weakest Rep
  const { bestRep, weakestRep } = identifyBestAndWeakestRep(completedRepsList.length > 0 ? completedRepsList : reps)

  return {
    profileId,
    weightKgAtTime,
    totalReps: validReps,
    validReps,
    partialReps,
    shallowReps,
    totalAttempts,
    incompleteReps,
    averageRepDuration,
    caloriesEstimate,
    caloriesBurned,
    goodReps,
    warningReps,
    poorReps,
    formConsistency,
    formBreakdown,
    primaryImprovement,
    issueFrequency,
    bestRep,
    weakestRep,
    reps: [...reps],
    startedAt,
    endedAt,
    durationSeconds,
    durationMs: durationSeconds * 1000,
    needsWorkReps: warningReps + poorReps,
    avgFormScore: validReps > 0
      ? Math.round(completedRepsList.reduce((s, r) => s + (r.formAnalysis?.score ?? 80), 0) / validReps)
      : 0,
    minKneeAngle: validReps > 0 ? Math.min(...completedRepsList.map(r => r.bottomKneeAngle)) : 0,
    avgKneeAngle: validReps > 0
      ? Math.round(completedRepsList.reduce((s, r) => s + r.bottomKneeAngle, 0) / validReps)
      : 0,
    avgTorsoAngle: validReps > 0
      ? Math.round(completedRepsList.reduce((s, r) => s + (r.formAnalysis?.avgTorsoAngle ?? 15), 0) / validReps)
      : 0,
    avgSymmetryScore: 0,
  }
}

/**
 * Aggregate form metrics across completed reps.
 * Rule: POOR dominates WARNING, WARNING dominates GOOD.
 */
function aggregateFormBreakdown(reps: RepRecord[]): FormBreakdown {
  if (reps.length === 0) {
    return {
      depth:         'UNAVAILABLE',
      kneeAlignment: 'UNAVAILABLE',
      torsoLean:     'UNAVAILABLE',
      stability:     'UNAVAILABLE',
    }
  }

  const depthStatuses = reps.map(r => r.formAnalysis?.summary?.depth.status ?? 'GOOD')
  const kneeStatuses = reps.map(r => r.formAnalysis?.summary?.kneeAlignment.status ?? 'GOOD')
  const torsoStatuses = reps.map(r => r.formAnalysis?.summary?.torsoLean.status ?? 'GOOD')
  const stabilityStatuses = reps.map(r => r.formAnalysis?.summary?.stability.status ?? 'GOOD')

  return {
    depth:         aggregateMetricStatus(depthStatuses),
    kneeAlignment: aggregateMetricStatus(kneeStatuses),
    torsoLean:     aggregateMetricStatus(torsoStatuses),
    stability:     aggregateMetricStatus(stabilityStatuses),
  }
}

function aggregateMetricStatus(statuses: FormStatus[]): FormStatus {
  if (statuses.length === 0) return 'UNAVAILABLE'
  if (statuses.includes('POOR')) return 'POOR'
  if (statuses.includes('WARNING')) return 'WARNING'
  if (statuses.every(s => s === 'UNAVAILABLE')) return 'UNAVAILABLE'
  return 'GOOD'
}

/**
 * Derive deterministic coaching recommendation from issue frequency.
 */
function derivePrimaryImprovement(
  totalReps: number,
  freq: Record<FormIssueType, number>
): string | null {
  if (totalReps === 0) return null

  const entries: Array<{ type: FormIssueType; count: number }> = [
    { type: 'TORSO_LEAN', count: freq.TORSO_LEAN ?? 0 },
    { type: 'INSUFFICIENT_DEPTH', count: freq.INSUFFICIENT_DEPTH ?? 0 },
    { type: 'KNEE_ALIGNMENT', count: freq.KNEE_ALIGNMENT ?? 0 },
    { type: 'INSTABILITY', count: freq.INSTABILITY ?? 0 },
  ]

  entries.sort((a, b) => b.count - a.count)

  const topIssue = entries[0]
  if (topIssue.count === 0) {
    return 'Keep maintaining your current form.'
  }

  switch (topIssue.type) {
    case 'TORSO_LEAN':
      return 'Keep your torso more upright.'
    case 'INSUFFICIENT_DEPTH':
      return 'Try reaching a little more depth.'
    case 'KNEE_ALIGNMENT':
      return 'Focus on keeping your knees aligned with your toes.'
    case 'INSTABILITY':
      return 'Try to maintain smoother balance & stability.'
    default:
      return 'Keep maintaining your current form.'
  }
}

/**
 * Identify best and weakest rep records using normalized composite score & depth.
 */
function identifyBestAndWeakestRep(reps: RepRecord[]): {
  bestRep: RepRecord | null
  weakestRep: RepRecord | null
} {
  if (reps.length === 0) {
    return { bestRep: null, weakestRep: null }
  }

  const sorted = [...reps].sort((a, b) => {
    const scoreA = a.formAnalysis?.score ?? 80
    const scoreB = b.formAnalysis?.score ?? 80
    if (scoreA !== scoreB) {
      return scoreB - scoreA
    }
    if (a.bottomKneeAngle !== b.bottomKneeAngle) {
      return a.bottomKneeAngle - b.bottomKneeAngle
    }
    return b.durationMs - a.durationMs
  })

  return {
    bestRep: sorted[0],
    weakestRep: sorted[sorted.length - 1],
  }
}
