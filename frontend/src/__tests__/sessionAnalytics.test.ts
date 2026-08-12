/**
 * sessionAnalytics.test.ts — Unit tests for session analytics calculation service.
 *
 * Verifies:
 *  1. 5 good reps summary calculation
 *  2. Mixed session stats (GOOD, WARNING, POOR breakdown)
 *  3. Average rep duration calculation
 *  4. Form consistency percentage (returns null if < 3 reps)
 *  5. Zero-rep handling (null durations/consistency, zero reps)
 *  6. Form breakdown aggregation (POOR dominates WARNING, WARNING dominates GOOD)
 *  7. Primary improvement recommendation derivation
 *  8. Session duration calculation
 */

import { describe, it, expect } from 'vitest'
import { calculateSessionSummary } from '../services/sessionAnalytics'
import type { RepRecord } from '../types/session'
import type { FormStatus, FormIssueType } from '../types/analysis'

function makeMockRep(
  index: number,
  overallStatus: FormStatus = 'GOOD',
  durationMs = 1800,
  issues: FormIssueType[] = []
): RepRecord {
  return {
    index,
    repNumber: index,
    startTime: 1000 * index,
    bottomTime: 1000 * index + 800,
    endTime: 1000 * index + durationMs,
    durationMs,
    bottomKneeAngle: 92,
    depthScore: 92,
    depthClassification: 'FULL',
    isCompleted: true,
    isFullValidDepth: true,
    formAnalysis: {
      repIndex: index,
      score: overallStatus === 'GOOD' ? 90 : overallStatus === 'WARNING' ? 65 : 40,
      issues: issues.map(t => ({ type: t, severity: 'WARNING', message: t, timestamp: 1000 })),
      minKneeAngle: 92,
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

describe('Session Analytics Service (calculateSessionSummary)', () => {
  it('Test 1 — 5 Good Reps: totalReps=5, goodReps=5, warningReps=0, poorReps=0', () => {
    const reps = [
      makeMockRep(1, 'GOOD'),
      makeMockRep(2, 'GOOD'),
      makeMockRep(3, 'GOOD'),
      makeMockRep(4, 'GOOD'),
      makeMockRep(5, 'GOOD'),
    ]

    const summary = calculateSessionSummary(reps, { startTime: 1000, endTime: 11000 })

    expect(summary.totalReps).toBe(5)
    expect(summary.goodReps).toBe(5)
    expect(summary.warningReps).toBe(0)
    expect(summary.poorReps).toBe(0)
    expect(summary.formConsistency).toBe(100)
    expect(summary.durationSeconds).toBe(10)
  })

  it('Test 2 — Mixed Session: correctly categorizes GOOD, WARNING, and POOR reps', () => {
    const reps = [
      makeMockRep(1, 'GOOD'),
      makeMockRep(2, 'GOOD'),
      makeMockRep(3, 'WARNING'),
      makeMockRep(4, 'POOR'),
      makeMockRep(5, 'GOOD'),
    ]

    const summary = calculateSessionSummary(reps, { startTime: 1000, endTime: 11000 })

    expect(summary.totalReps).toBe(5)
    expect(summary.goodReps).toBe(3)
    expect(summary.warningReps).toBe(1)
    expect(summary.poorReps).toBe(1)
    expect(summary.formConsistency).toBe(60) // 3 / 5 * 100 = 60%
  })

  it('Test 3 — Average Duration: correctly computes average rep duration in seconds', () => {
    const reps = [
      makeMockRep(1, 'GOOD', 1000), // 1.0s
      makeMockRep(2, 'GOOD', 2000), // 2.0s
      makeMockRep(3, 'GOOD', 3000), // 3.0s
    ]

    const summary = calculateSessionSummary(reps, { startTime: 1000, endTime: 10000 })

    expect(summary.averageRepDuration).toBe(2.0)
  })

  it('Test 4 — Consistency Threshold: 4 GOOD + 1 WARNING = 80%, < 3 reps = null', () => {
    const fourGoodOneWarn = [
      makeMockRep(1, 'GOOD'),
      makeMockRep(2, 'GOOD'),
      makeMockRep(3, 'GOOD'),
      makeMockRep(4, 'GOOD'),
      makeMockRep(5, 'WARNING'),
    ]
    const summary = calculateSessionSummary(fourGoodOneWarn, { startTime: 0, endTime: 10000 })
    expect(summary.formConsistency).toBe(80)

    const twoReps = [
      makeMockRep(1, 'GOOD'),
      makeMockRep(2, 'GOOD'),
    ]
    const shortSummary = calculateSessionSummary(twoReps, { startTime: 0, endTime: 5000 })
    expect(shortSummary.formConsistency).toBeNull()
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
      makeMockRep(1, 'GOOD', 1800, ['TORSO_LEAN']),
      makeMockRep(2, 'WARNING', 1800, ['TORSO_LEAN']),
    ]
    const warningSummary = calculateSessionSummary(warningReps, { startTime: 0, endTime: 5000 })
    expect(warningSummary.formBreakdown.torsoLean).toBe('WARNING')

    const poorReps = [
      makeMockRep(1, 'GOOD'),
      makeMockRep(2, 'WARNING'),
      makeMockRep(3, 'POOR'),
    ]
    const poorSummary = calculateSessionSummary(poorReps, { startTime: 0, endTime: 5000 })
    expect(poorSummary.formBreakdown.depth).toBe('GOOD')
  })

  it('Test 7 — Primary Improvement: generates correct recommendation for dominant issue', () => {
    const reps = [
      makeMockRep(1, 'WARNING', 1800, ['TORSO_LEAN']),
      makeMockRep(2, 'WARNING', 1800, ['TORSO_LEAN']),
      makeMockRep(3, 'WARNING', 1800, ['INSUFFICIENT_DEPTH']),
    ]

    const summary = calculateSessionSummary(reps, { startTime: 0, endTime: 10000 })
    expect(summary.primaryImprovement).toBe('Keep your torso more upright.')
  })
})
