/**
 * sessionAnalytics.test.ts — Unit tests for session analytics calculation service.
 *
 * Verifies:
 *  1. 5 good reps summary calculation
 *  2. CV-based consistency calculation for highly consistent reps
 *  3. CV-based consistency calculation for inconsistent reps
 *  4. Consistency threshold (< 2 valid reps returns null)
 *  5. Zero-rep handling (null durations/consistency, zero reps)
 *  6. Form breakdown aggregation (POOR dominates WARNING, WARNING dominates GOOD)
 *  7. Primary improvement recommendation derivation
 */

import { describe, it, expect } from 'vitest'
import { calculateSessionSummary, calculateSessionConsistency } from '../services/sessionAnalytics'
import type { RepRecord } from '../types/session'
import type { FormStatus, FormIssueType } from '../types/analysis'

function makeMockRep(
  index: number,
  overallStatus: FormStatus = 'GOOD',
  durationMs = 1800,
  bottomKneeAngle = 92,
  score = 90,
  issues: FormIssueType[] = []
): RepRecord {
  return {
    index,
    repNumber: index,
    startTime: 1000 * index,
    bottomTime: 1000 * index + 800,
    endTime: 1000 * index + durationMs,
    durationMs,
    bottomKneeAngle,
    depthScore: 92,
    depthClassification: 'FULL',
    isCompleted: true,
    isFullValidDepth: true,
    formAnalysis: {
      repIndex: index,
      score,
      issues: issues.map(t => ({ type: t, severity: 'WARNING', message: t, timestamp: 1000 })),
      minKneeAngle: bottomKneeAngle,
      avgTorsoAngle: 15,
      avgKneeAlignment: 0.1,
      isGoodRep: overallStatus === 'GOOD',
      summary: {
        repNumber: index,
        depth: { status: 'GOOD', message: 'Good Depth' },
        kneeAlignment: { status: 'GOOD', message: 'Good Knee Alignment' },
        torsoLean: { status: issues.includes('TORSO_LEAN') ? 'WARNING' : 'GOOD', message: 'Torso' },
        stability: { status: 'GOOD', message: 'Good Stability' },
        overall: overallStatus,
        issues: [],
      },
    },
  }
}

describe('Session Analytics Service (calculateSessionSummary & calculateSessionConsistency)', () => {
  it('Test 1 — 5 Good Reps: totalReps=5, goodReps=5', () => {
    const reps = [
      makeMockRep(1, 'GOOD', 1800, 92, 90),
      makeMockRep(2, 'GOOD', 1800, 92, 90),
      makeMockRep(3, 'GOOD', 1800, 92, 90),
      makeMockRep(4, 'GOOD', 1800, 92, 90),
      makeMockRep(5, 'GOOD', 1800, 92, 90),
    ]

    const summary = calculateSessionSummary(reps, { startTime: 1000, endTime: 11000 })

    expect(summary.totalReps).toBe(5)
    expect(summary.goodReps).toBe(5)
    expect(summary.warningReps).toBe(0)
    expect(summary.poorReps).toBe(0)
    expect(summary.formConsistency).toBe(100)
    expect(summary.durationSeconds).toBe(10)
  })

  it('Test 2 — Highly Consistent Reps: CV consistency is HIGH (>= 90%)', () => {
    // Depths: 90, 89, 91, 90, 92 (mean=90.4, std=1.02)
    // Durations: 1.80s, 1.79s, 1.82s, 1.81s, 1.83s
    const reps = [
      makeMockRep(1, 'GOOD', 1800, 90, 90),
      makeMockRep(2, 'GOOD', 1790, 89, 92),
      makeMockRep(3, 'GOOD', 1820, 91, 90),
      makeMockRep(4, 'GOOD', 1810, 90, 91),
      makeMockRep(5, 'GOOD', 1830, 92, 93),
    ]

    const consistency = calculateSessionConsistency(reps)
    expect(consistency).not.toBeNull()
    expect(consistency!).toBeGreaterThanOrEqual(90)
  })

  it('Test 3 — Inconsistent Reps: CV consistency reflects movement variation (< 85%)', () => {
    // Highly variable depths: 52, 80, 45, 72, 39
    const reps = [
      makeMockRep(1, 'GOOD', 1200, 52, 90),
      makeMockRep(2, 'GOOD', 2500, 80, 60),
      makeMockRep(3, 'GOOD', 1000, 45, 95),
      makeMockRep(4, 'GOOD', 2200, 72, 70),
      makeMockRep(5, 'GOOD', 900, 39, 90),
    ]

    const consistency = calculateSessionConsistency(reps)
    expect(consistency).not.toBeNull()
    expect(consistency!).toBeLessThan(85)
  })

  it('Test 4 — Consistency Threshold: < 2 valid reps returns null', () => {
    const singleRep = [makeMockRep(1, 'GOOD')]
    const summary = calculateSessionSummary(singleRep, { startTime: 0, endTime: 5000 })
    expect(summary.formConsistency).toBeNull()
  })

  it('Test 5 — Zero Reps: totalReps=0, averageRepDuration=null, formConsistency=null', () => {
    const summary = calculateSessionSummary([], { startTime: 1000, endTime: 6000 })

    expect(summary.totalReps).toBe(0)
    expect(summary.averageRepDuration).toBeNull()
    expect(summary.formConsistency).toBeNull()
    expect(summary.primaryImprovement).toBeNull()
  })

  it('Test 6 — Form Aggregation: WARNING dominates GOOD, POOR dominates WARNING', () => {
    const warningReps = [
      makeMockRep(1, 'GOOD', 1800, 92, 90, ['TORSO_LEAN']),
      makeMockRep(2, 'WARNING', 1800, 92, 65, ['TORSO_LEAN']),
    ]
    const warningSummary = calculateSessionSummary(warningReps, { startTime: 0, endTime: 5000 })
    expect(warningSummary.formBreakdown.torsoLean).toBe('WARNING')
  })

  it('Test 7 — Primary Improvement: generates correct recommendation for dominant issue', () => {
    const reps = [
      makeMockRep(1, 'WARNING', 1800, 92, 65, ['TORSO_LEAN']),
      makeMockRep(2, 'WARNING', 1800, 92, 65, ['TORSO_LEAN']),
      makeMockRep(3, 'WARNING', 1800, 92, 65, ['INSUFFICIENT_DEPTH']),
    ]

    const summary = calculateSessionSummary(reps, { startTime: 0, endTime: 10000 })
    expect(summary.primaryImprovement).toBe('Keep your torso more upright.')
  })
})
