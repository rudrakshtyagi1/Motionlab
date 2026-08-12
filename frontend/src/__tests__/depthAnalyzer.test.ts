/**
 * depthAnalyzer.test.ts — Unit tests for multi-feature depth classification & calorie estimation.
 *
 * Verifies:
 *  1. Full squat classification (FULL, valid)
 *  2. Partial squat classification (PARTIAL, partial)
 *  3. Very shallow movement classification (SHALLOW)
 *  4. Descending without returning to standing (incomplete)
 *  5. Full squat -> exactly 1 valid rep
 *  6. Partial squat -> 0 valid reps, 1 partial attempt
 *  7. Calorie estimation with weight
 *  8. Calorie estimation without weight
 *  9. Profile store persistence
 * 10. Session history store persistence
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { classifyDepth } from '../services/depthAnalyzer'
import { estimateCalories } from '../services/calorieEstimator'
import { RepCounter } from '../services/repCounter'
import { useProfileStore } from '../store/profileStore'
import { useSessionHistoryStore } from '../store/sessionHistoryStore'
import type { SquatStateResult } from '../types/analysis'

function makeStateResult(
  state: SquatStateResult['state'],
  kneeAngle: number | null,
  fromState?: SquatStateResult['state']
): SquatStateResult {
  return {
    state,
    previousState: fromState || 'STANDING',
    kneeAngle,
    direction: state === 'DESCENDING' ? 'DOWN' : state === 'ASCENDING' ? 'UP' : 'NONE',
    changed: true,
    transition: fromState ? { from: fromState, to: state, timestamp: Date.now() } : undefined,
  }
}

describe('Squat Depth Analyzer & Product Upgrade Tests', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('1. Full Squat Classification — returns FULL', () => {
    const res = classifyDepth(90)
    expect(res.classification).toBe('FULL')
    expect(res.isFullDepth).toBe(true)
    expect(res.depthScore).toBe(100)
  })

  it('2. Partial Squat Classification — returns PARTIAL', () => {
    const res = classifyDepth(112)
    expect(res.classification).toBe('PARTIAL')
    expect(res.isPartialDepth).toBe(true)
    expect(res.depthScore).toBeLessThan(100)
    expect(res.depthScore).toBeGreaterThan(0)
  })

  it('3. Very Shallow Movement — returns SHALLOW', () => {
    const res = classifyDepth(140)
    expect(res.classification).toBe('SHALLOW')
    expect(res.isShallow).toBe(true)
  })

  it('4. Descending Without Returning to Standing — incomplete attempt', () => {
    const counter = new RepCounter()
    counter.update(makeStateResult('STANDING', 175))
    counter.update(makeStateResult('DESCENDING', 130, 'STANDING'))
    const result = counter.update(makeStateResult('BOTTOM', 90, 'DESCENDING'))

    // Returned to standing has not occurred yet
    expect(result.validCount).toBe(0)
    expect(result.totalAttempts).toBe(0)
    expect(result.currentProgress).toBe('REACHED_BOTTOM')
  })

  it('5. Full Squat — exactly 1 valid rep', () => {
    const counter = new RepCounter({ minDepthFrames: 1 })
    counter.update(makeStateResult('STANDING', 175))
    counter.update(makeStateResult('DESCENDING', 130, 'STANDING'))
    counter.update(makeStateResult('BOTTOM', 90, 'DESCENDING'))
    counter.update(makeStateResult('ASCENDING', 140, 'BOTTOM'))
    const result = counter.update(makeStateResult('STANDING', 175, 'ASCENDING'))

    expect(result.validCount).toBe(1)
    expect(result.partialCount).toBe(0)
    expect(result.latestRep?.depthClassification).toBe('FULL')
    expect(result.latestRep?.isCompleted).toBe(true)
  })

  it('6. Partial Squat — 0 valid reps, 1 partial attempt', () => {
    const counter = new RepCounter()
    counter.update(makeStateResult('STANDING', 175))
    counter.update(makeStateResult('DESCENDING', 140, 'STANDING'))
    counter.update(makeStateResult('DESCENDING', 115, 'DESCENDING')) // Partial depth
    counter.update(makeStateResult('ASCENDING', 145, 'DESCENDING'))
    const result = counter.update(makeStateResult('STANDING', 175, 'ASCENDING'))

    expect(result.validCount).toBe(0)
    expect(result.partialCount).toBe(1)
    expect(result.latestRep?.depthClassification).toBe('PARTIAL')
    expect(result.latestRep?.isCompleted).toBe(false)
  })

  it('7. Calorie Estimation with Weight — returns calorie count', () => {
    const res = estimateCalories({ weightKg: 75, durationSeconds: 300 })
    expect(res.calories).toBeGreaterThan(0)
    expect(res.confidence).toBe('HIGH')
    expect(res.displayString).toContain('kcal')
  })

  it('8. Calorie Estimation without Weight — graceful prompt', () => {
    const res = estimateCalories({ weightKg: null, durationSeconds: 300 })
    expect(res.calories).toBeNull()
    expect(res.confidence).toBe('GENERIC')
    expect(res.displayString).toBe('Add weight in Profile for estimate')
  })

  it('9. Profile Persistence — updates localStorage and Zustand state', () => {
    const store = useProfileStore.getState()
    store.updateProfile({ name: 'Rudraksh', weightKg: 75, mode: 'profile' })

    const updated = useProfileStore.getState().profile
    expect(updated.name).toBe('Rudraksh')
    expect(updated.weightKg).toBe(75)
    expect(updated.mode).toBe('profile')

    const rawStored = localStorage.getItem('motionlab_profile')
    expect(rawStored).toContain('Rudraksh')
  })

  it('10. Session History Persistence — saves completed session summary', () => {
    const historyStore = useSessionHistoryStore.getState()
    historyStore.addSession({
      profileId: 'test_user',
      weightKgAtTime: 75,
      totalReps: 5,
      validReps: 5,
      partialReps: 1,
      shallowReps: 0,
      totalAttempts: 6,
      incompleteReps: 1,
      averageRepDuration: 1.8,
      caloriesEstimate: {
        calories: 25,
        confidence: 'HIGH',
        method: 'MET',
        displayString: '~25 kcal',
        disclaimer: 'Estimate',
      },
      caloriesBurned: 25,
      goodReps: 5,
      warningReps: 0,
      poorReps: 0,
      formConsistency: 100,
      formBreakdown: { depth: 'GOOD', kneeAlignment: 'GOOD', torsoLean: 'GOOD', stability: 'GOOD' },
      primaryImprovement: 'Great job!',
      issueFrequency: { INSUFFICIENT_DEPTH: 0, KNEE_ALIGNMENT: 0, TORSO_LEAN: 0, INSTABILITY: 0, ASYMMETRY: 0 },
      bestRep: null,
      weakestRep: null,
      reps: [],
      startedAt: 10000,
      endedAt: 70000,
      durationSeconds: 60,
      durationMs: 60000,
      needsWorkReps: 0,
      avgFormScore: 92,
      minKneeAngle: 88,
      avgKneeAngle: 90,
      avgTorsoAngle: 12,
      avgSymmetryScore: 0,
    })

    const history = useSessionHistoryStore.getState().history
    expect(history).toHaveLength(1)
    expect(history[0].validReps).toBe(5)
    expect(history[0].caloriesBurned).toBe(25)

    const rawHistory = localStorage.getItem('motionlab_sessions')
    expect(rawHistory).toContain('test_user')
  })
})
