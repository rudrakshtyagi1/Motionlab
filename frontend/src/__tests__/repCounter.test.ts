/**
 * repCounter.test.ts — Unit tests for robust squat repetition counter.
 *
 * Verifies:
 *  1. One complete squat sequence (STANDING → DESCENDING → BOTTOM → ASCENDING → STANDING) = repCount 1
 *  2. Two complete squats = repCount 2
 *  3. Partial squat without reaching BOTTOM depth = repCount 0
 *  4. Noisy standing frames = repCount 0
 *  5. Repeated standing frames after completion = repCount 1 (no double counting)
 *  6. Incomplete movement followed by valid movement = repCount 1
 *  7. Reset clears count, history, and trackers
 *  8. RepRecord timing and minimum knee angle calculation
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { RepCounter } from '../services/repCounter'
import type { SquatStateResult, SquatState } from '../types/analysis'

function makeMockStateResult(
  state: SquatState,
  kneeAngle: number | null = 170,
  changed = false,
  previousState: SquatState = 'STANDING'
): SquatStateResult {
  return {
    state,
    previousState,
    kneeAngle,
    direction: state === 'DESCENDING' ? 'DOWN' : state === 'ASCENDING' ? 'UP' : 'HOLD',
    changed,
  }
}

describe('RepCounter', () => {
  let counter: RepCounter

  beforeEach(() => {
    counter = new RepCounter()
  })

  it('starts with repCount 0 and empty history', () => {
    expect(counter.getRepCount()).toBe(0)
    expect(counter.getHistory()).toHaveLength(0)
    expect(counter.getLatestRep()).toBeNull()
  })

  it('Test 1 — One complete squat increments repCount to 1', () => {
    let res = counter.update(makeMockStateResult('STANDING', 170), 1000)
    expect(res.repCount).toBe(0)

    res = counter.update(makeMockStateResult('DESCENDING', 150), 1100)
    expect(res.repCount).toBe(0)
    expect(res.currentProgress).toBe('DESCENDING')

    res = counter.update(makeMockStateResult('BOTTOM', 95), 1500)
    expect(res.repCount).toBe(0)
    expect(res.currentProgress).toBe('REACHED_BOTTOM')

    res = counter.update(makeMockStateResult('ASCENDING', 130), 1800)
    expect(res.repCount).toBe(0)
    expect(res.currentProgress).toBe('ASCENDING')

    res = counter.update(makeMockStateResult('STANDING', 170), 2200)
    expect(res.repCount).toBe(1)
    expect(res.repCompleted).toBe(true)
    expect(res.currentProgress).toBe('IDLE')

    const latest = res.latestRep!
    expect(latest.repNumber).toBe(1)
    expect(latest.startTime).toBe(1100)
    expect(latest.bottomTime).toBe(1500)
    expect(latest.endTime).toBe(2200)
    expect(latest.durationMs).toBe(1100)
    expect(latest.bottomKneeAngle).toBe(95)
  })

  it('Test 2 — Two complete squats increment repCount to 2', () => {
    // First rep
    counter.update(makeMockStateResult('STANDING', 170), 1000)
    counter.update(makeMockStateResult('DESCENDING', 140), 1100)
    counter.update(makeMockStateResult('BOTTOM', 90), 1400)
    counter.update(makeMockStateResult('ASCENDING', 130), 1700)
    counter.update(makeMockStateResult('STANDING', 170), 2000)

    expect(counter.getRepCount()).toBe(1)

    // Second rep
    counter.update(makeMockStateResult('DESCENDING', 140), 2200)
    counter.update(makeMockStateResult('BOTTOM', 85), 2500)
    counter.update(makeMockStateResult('ASCENDING', 130), 2800)
    const res2 = counter.update(makeMockStateResult('STANDING', 170), 3100)

    expect(res2.repCount).toBe(2)
    expect(counter.getHistory()).toHaveLength(2)
    expect(res2.latestRep?.bottomKneeAngle).toBe(85)
  })

  it('Test 3 — Partial squat (without bottom depth) does NOT count as a rep', () => {
    counter.update(makeMockStateResult('STANDING', 170), 1000)
    counter.update(makeMockStateResult('DESCENDING', 135), 1200) // descended but not bottom
    counter.update(makeMockStateResult('ASCENDING', 150), 1400)
    const res = counter.update(makeMockStateResult('STANDING', 170), 1600)

    expect(res.repCount).toBe(0)
    expect(res.repCompleted).toBe(false)
    expect(res.currentProgress).toBe('IDLE')
  })

  it('Test 4 — Noisy standing frames produce repCount 0', () => {
    for (let i = 0; i < 10; i++) {
      const res = counter.update(makeMockStateResult('STANDING', 170 + (i % 2)), 1000 + i * 100)
      expect(res.repCount).toBe(0)
      expect(res.repCompleted).toBe(false)
    }
  })

  it('Test 5 — Repeated standing frames after completion do NOT double count', () => {
    counter.update(makeMockStateResult('DESCENDING', 140), 1000)
    counter.update(makeMockStateResult('BOTTOM', 90), 1200)
    counter.update(makeMockStateResult('ASCENDING', 140), 1400)
    const completedRes = counter.update(makeMockStateResult('STANDING', 170), 1600)

    expect(completedRes.repCount).toBe(1)
    expect(completedRes.repCompleted).toBe(true)

    // Repeated STANDING frames
    for (let i = 1; i <= 5; i++) {
      const res = counter.update(makeMockStateResult('STANDING', 170), 1600 + i * 100)
      expect(res.repCount).toBe(1)
      expect(res.repCompleted).toBe(false)
    }
  })

  it('Test 6 — Incomplete movement followed by valid movement counts exactly 1 rep', () => {
    // Incomplete attempt
    counter.update(makeMockStateResult('STANDING', 170), 1000)
    counter.update(makeMockStateResult('DESCENDING', 130), 1200)
    counter.update(makeMockStateResult('ASCENDING', 150), 1400)
    counter.update(makeMockStateResult('STANDING', 170), 1600)
    expect(counter.getRepCount()).toBe(0)

    // Valid complete attempt
    counter.update(makeMockStateResult('DESCENDING', 130), 1800)
    counter.update(makeMockStateResult('BOTTOM', 90), 2000)
    counter.update(makeMockStateResult('ASCENDING', 140), 2200)
    const res = counter.update(makeMockStateResult('STANDING', 170), 2400)

    expect(res.repCount).toBe(1)
    expect(res.repCompleted).toBe(true)
  })

  it('Test 7 — Reset clears count, active progress, and history', () => {
    // Do 1 valid rep
    counter.update(makeMockStateResult('DESCENDING', 130), 1000)
    counter.update(makeMockStateResult('BOTTOM', 90), 1200)
    counter.update(makeMockStateResult('ASCENDING', 140), 1400)
    counter.update(makeMockStateResult('STANDING', 170), 1600)
    expect(counter.getRepCount()).toBe(1)

    counter.reset()

    expect(counter.getRepCount()).toBe(0)
    expect(counter.getHistory()).toHaveLength(0)
    expect(counter.getLatestRep()).toBeNull()
  })

  it('aborts active rep attempt if state becomes UNAVAILABLE', () => {
    counter.update(makeMockStateResult('DESCENDING', 130), 1000)
    counter.update(makeMockStateResult('BOTTOM', 90), 1200)

    const res = counter.update(makeMockStateResult('UNAVAILABLE', null), 1300)
    expect(res.currentProgress).toBe('IDLE')
    expect(res.repCount).toBe(0)
  })
})
