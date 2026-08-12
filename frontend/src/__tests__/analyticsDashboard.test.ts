/**
 * analyticsDashboard.test.ts — Unit tests for live analytics dashboard selectors & data handling.
 *
 * Verifies:
 *  1. selectGoodRepsCount computes correct good reps count
 *  2. selectAvgRepDurationSec computes average rep duration or returns null when 0 reps
 *  3. selectFormConsistencyPercent returns null when reps < 3, and correct percentage when >= 3
 *  4. Graceful handling of null/empty data in dashboard metrics
 */

import { describe, it, expect } from 'vitest'
import {
  selectGoodRepsCount,
  selectAvgRepDurationSec,
  selectFormConsistencyPercent,
} from '../store/sessionStore'
import type { RepRecord } from '../types/session'

function makeMockRep(index: number, isGoodRep: boolean, durationMs = 1800): RepRecord {
  return {
    index,
    repNumber: index,
    startTime: 1000 * index,
    bottomTime: 1000 * index + 800,
    endTime: 1000 * index + durationMs,
    durationMs,
    bottomKneeAngle: isGoodRep ? 92 : 110,
    depthScore: isGoodRep ? 92 : 75,
    depthClassification: 'FULL',
    isCompleted: true,
    isFullValidDepth: true,
    formAnalysis: {
      repIndex: index,
      score: isGoodRep ? 90 : 50,
      issues: [],
      minKneeAngle: isGoodRep ? 92 : 110,
      avgTorsoAngle: 15,
      avgKneeAlignment: 0.1,
      isGoodRep,
      summary: {
        repNumber: index,
        depth: { status: isGoodRep ? 'GOOD' : 'WARNING', message: 'Depth' },
        kneeAlignment: { status: 'GOOD', message: 'Knees' },
        torsoLean: { status: 'GOOD', message: 'Torso' },
        stability: { status: 'GOOD', message: 'Stability' },
        overall: isGoodRep ? 'GOOD' : 'WARNING',
        issues: [],
      },
    },
  }
}

describe('Analytics Dashboard Selectors', () => {
  it('selectGoodRepsCount returns correct number of good reps', () => {
    const reps: RepRecord[] = [
      makeMockRep(1, true),
      makeMockRep(2, true),
      makeMockRep(3, false),
    ]
    expect(selectGoodRepsCount(reps)).toBe(2)
  })

  it('selectAvgRepDurationSec calculates average duration in seconds', () => {
    expect(selectAvgRepDurationSec([])).toBeNull()

    const reps: RepRecord[] = [
      makeMockRep(1, true, 2000), // 2.0s
      makeMockRep(2, true, 1600), // 1.6s
    ]
    expect(selectAvgRepDurationSec(reps)).toBe(1.8)
  })

  it('selectFormConsistencyPercent returns null when reps < 3', () => {
    const twoReps: RepRecord[] = [
      makeMockRep(1, true),
      makeMockRep(2, true),
    ]
    // Requirement 11: If fewer than 3 completed reps exist, return null so UI shows "—"
    expect(selectFormConsistencyPercent(twoReps)).toBeNull()
  })

  it('selectFormConsistencyPercent calculates percentage when reps >= 3', () => {
    const fourReps: RepRecord[] = [
      makeMockRep(1, true),
      makeMockRep(2, true),
      makeMockRep(3, true),
      makeMockRep(4, false), // 3 good out of 4 = 75%
    ]
    expect(selectFormConsistencyPercent(fourReps)).toBe(75)
  })
})
