/**
 * productUpgrade.test.ts — Unit tests for Pre-Step 11 Product Upgrade features.
 *
 * Verifies:
 *  - Test 1: Full squat (1 completed rep)
 *  - Test 2: Half squat (0 completed reps, 1 incomplete attempt)
 *  - Test 3: Full + half + full (2 completed reps, 1 incomplete attempt)
 *  - Test 4: No movement (0 completed reps)
 *  - Test 5: Single-frame noise spike crossing depth threshold (0 completed reps)
 *  - Test 6: Calorie calculation for profile with weight
 *  - Test 7: Calorie calculation for guest without weight (graceful fallback prompt)
 *  - Test 8: Form consistency for 10 valid reps (> 0%)
 */

import { describe, it, expect } from 'vitest'
import { RepCounter } from '../services/repCounter'
import { calculateCalories } from '../services/calorieCalculator'
import { calculateSessionSummary } from '../services/sessionAnalytics'
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

describe('Pre-Step 11 Product Upgrade Unit Tests', () => {
  it('TEST 1 — Full Squat: 1 completed rep', () => {
    const counter = new RepCounter()

    counter.update(makeStateResult('STANDING', 175))
    counter.update(makeStateResult('DESCENDING', 140, 'STANDING'))
    counter.update(makeStateResult('BOTTOM', 90, 'DESCENDING'))
    counter.update(makeStateResult('BOTTOM', 88, 'BOTTOM')) // 2nd frame at depth
    counter.update(makeStateResult('ASCENDING', 130, 'BOTTOM'))
    const result = counter.update(makeStateResult('STANDING', 175, 'ASCENDING'))

    expect(result.repCount).toBe(1)
    expect(result.incompleteCount).toBe(0)
    expect(result.latestRep?.isCompleted).toBe(true)
    expect(result.latestRep?.bottomKneeAngle).toBe(88)
  })

  it('TEST 2 — Half Squat: 0 completed reps, 1 incomplete attempt', () => {
    const counter = new RepCounter()

    counter.update(makeStateResult('STANDING', 175))
    counter.update(makeStateResult('DESCENDING', 140, 'STANDING'))
    counter.update(makeStateResult('DESCENDING', 118, 'DESCENDING')) // Shallow depth (118° > 100°)
    counter.update(makeStateResult('ASCENDING', 140, 'DESCENDING'))
    const result = counter.update(makeStateResult('STANDING', 175, 'ASCENDING'))

    expect(result.repCount).toBe(0)
    expect(result.incompleteCount).toBe(1)
    expect(result.latestRep?.isCompleted).toBe(false)
    expect(result.latestRep?.rejectionReason).toMatch(/depth/i)
  })

  it('TEST 3 — Full + Half + Full: 2 completed reps, 1 incomplete attempt', () => {
    const counter = new RepCounter()

    // Rep 1: Full
    counter.update(makeStateResult('STANDING', 175))
    counter.update(makeStateResult('DESCENDING', 130, 'STANDING'))
    counter.update(makeStateResult('BOTTOM', 90, 'DESCENDING'))
    counter.update(makeStateResult('BOTTOM', 90, 'BOTTOM'))
    counter.update(makeStateResult('ASCENDING', 140, 'BOTTOM'))
    counter.update(makeStateResult('STANDING', 175, 'ASCENDING'))

    // Rep 2: Half
    counter.update(makeStateResult('DESCENDING', 140, 'STANDING'))
    counter.update(makeStateResult('DESCENDING', 120, 'DESCENDING'))
    counter.update(makeStateResult('ASCENDING', 145, 'DESCENDING'))
    counter.update(makeStateResult('STANDING', 175, 'ASCENDING'))

    // Rep 3: Full
    counter.update(makeStateResult('DESCENDING', 130, 'STANDING'))
    counter.update(makeStateResult('BOTTOM', 85, 'DESCENDING'))
    counter.update(makeStateResult('BOTTOM', 85, 'BOTTOM'))
    counter.update(makeStateResult('ASCENDING', 140, 'BOTTOM'))
    const finalResult = counter.update(makeStateResult('STANDING', 175, 'ASCENDING'))

    expect(finalResult.repCount).toBe(2)
    expect(finalResult.incompleteCount).toBe(1)
    expect(counter.getHistory()).toHaveLength(3)
  })

  it('TEST 4 — No Movement: 0 completed reps', () => {
    const counter = new RepCounter()

    counter.update(makeStateResult('STANDING', 175))
    counter.update(makeStateResult('STANDING', 176))
    const result = counter.update(makeStateResult('STANDING', 174))

    expect(result.repCount).toBe(0)
    expect(result.incompleteCount).toBe(0)
  })

  it('TEST 5 — Noisy Single-Frame Glitch: 0 completed reps', () => {
    const counter = new RepCounter({ minDepthFrames: 2 })

    counter.update(makeStateResult('STANDING', 175))
    counter.update(makeStateResult('DESCENDING', 140, 'STANDING'))
    counter.update(makeStateResult('DESCENDING', 95, 'DESCENDING')) // Single noisy frame at 95°
    counter.update(makeStateResult('DESCENDING', 120, 'DESCENDING')) // Back to shallow
    counter.update(makeStateResult('ASCENDING', 150, 'DESCENDING'))
    const result = counter.update(makeStateResult('STANDING', 175, 'ASCENDING'))

    // Single frame hit minDepthFrames=2 check -> rejected as incomplete attempt
    expect(result.repCount).toBe(0)
    expect(result.incompleteCount).toBe(1)
  })

  it('TEST 6 — Calorie Calculation with Weight: returns estimated kcal', () => {
    const result = calculateCalories(120, 70) // 2 active minutes @ 70kg
    expect(result.isGeneric).toBe(false)
    expect(result.caloriesBurned).toBeGreaterThan(0)
    expect(result.displayString).toContain('kcal')
  })

  it('TEST 7 — Calorie Calculation without Weight: graceful prompt', () => {
    const result = calculateCalories(120, null)
    expect(result.isGeneric).toBe(true)
    expect(result.caloriesBurned).toBeNull()
    expect(result.displayString).toBe('Add weight for estimate')
  })

  it('TEST 8 — 10 Valid Reps: consistency > 0%', () => {
    const counter = new RepCounter()
    for (let i = 1; i <= 10; i++) {
      counter.update(makeStateResult('STANDING', 175))
      counter.update(makeStateResult('DESCENDING', 130, 'STANDING'))
      counter.update(makeStateResult('BOTTOM', 90, 'DESCENDING'))
      counter.update(makeStateResult('BOTTOM', 90, 'BOTTOM'))
      counter.update(makeStateResult('ASCENDING', 140, 'BOTTOM'))
      counter.update(makeStateResult('STANDING', 175, 'ASCENDING'))
    }

    const reps = counter.getHistory()
    const summary = calculateSessionSummary(reps, { startTime: 1000, endTime: 61000, weightKg: 70 })

    expect(summary.totalReps).toBe(10)
    expect(summary.formConsistency).toBeGreaterThan(0)
  })
})
