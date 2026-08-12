/**
 * squatStateMachine.test.ts — Unit tests for squat movement phase state machine.
 *
 * Verifies:
 *  1. Standing detection (extended knee angle >= 160°)
 *  2. Descent phase detection (decreasing knee angle)
 *  3. Bottom phase detection (knee angle <= 100°)
 *  4. Full squat cycle: STANDING → DESCENDING → BOTTOM → ASCENDING → STANDING
 *  5. Incomplete squat: STANDING → DESCENDING → ASCENDING → STANDING (no BOTTOM state)
 *  6. Noise deadband tolerance (fluctuations within 1.5° do not trigger rapid state switching)
 *  7. Missing/unreliable landmark handling (transitions to UNAVAILABLE without crashing)
 *  8. Reset functionality
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { SquatStateMachine } from '../services/squatStateMachine'
import type { SquatFeatures } from '../types/analysis'

function makeMockFeatures(kneeAngle: number | null, isReliable = true): SquatFeatures {
  return {
    timestamp: performance.now(),
    leftKneeAngle: kneeAngle,
    rightKneeAngle: kneeAngle,
    kneeAngle,
    leftHipAngle: 170,
    rightHipAngle: 170,
    hipAngle: 170,
    leftElbowAngle: 170,
    rightElbowAngle: 170,
    torsoInclination: 5,
    torsoAngle: 5,
    leftKneeAnkleOffset: 0,
    rightKneeAnkleOffset: 0,
    normalizedLeftKneeAnkleOffset: 0,
    normalizedRightKneeAnkleOffset: 0,
    kneeAngleSymmetry: 0,
    hipAngleSymmetry: 0,
    isReliable,
  }
}

describe('SquatStateMachine', () => {
  let sm: SquatStateMachine

  beforeEach(() => {
    sm = new SquatStateMachine({
      minStateFrames: 1, // minStateFrames=1 for deterministic step-by-step test evaluation
    })
  })

  it('starts in STANDING state', () => {
    expect(sm.getState()).toBe('STANDING')
  })

  it('Test 1 — Standing: remains in STANDING for extended knee angles', () => {
    const angles = [170, 168, 172, 169]
    for (const angle of angles) {
      const res = sm.update(makeMockFeatures(angle))
      expect(res.state).toBe('STANDING')
    }
  })

  it('Test 2 — Descent: transitions to DESCENDING when knees flex downward', () => {
    const angles = [170, 165, 155, 145, 130]
    const states: string[] = []

    for (const angle of angles) {
      const res = sm.update(makeMockFeatures(angle))
      states.push(res.state)
    }

    expect(states[0]).toBe('STANDING')
    expect(states[states.length - 1]).toBe('DESCENDING')
  })

  it('Test 3 — Bottom: transitions to BOTTOM when knee angle reaches depth threshold (<= 100°)', () => {
    const angles = [170, 140, 120, 105, 95]
    const states: string[] = []

    for (const angle of angles) {
      const res = sm.update(makeMockFeatures(angle))
      states.push(res.state)
    }

    expect(states[states.length - 1]).toBe('BOTTOM')
  })

  it('Test 4 — Full movement cycle: STANDING → DESCENDING → BOTTOM → ASCENDING → STANDING', () => {
    const sequence = [170, 160, 150, 130, 110, 95, 110, 130, 150, 165, 170]
    const states: string[] = []
    const transitions: string[] = []

    for (const angle of sequence) {
      const res = sm.update(makeMockFeatures(angle))
      states.push(res.state)
      if (res.changed && res.transition) {
        transitions.push(`${res.transition.from} -> ${res.transition.to}`)
      }
    }

    expect(transitions).toContain('STANDING -> DESCENDING')
    expect(transitions).toContain('DESCENDING -> BOTTOM')
    expect(transitions).toContain('BOTTOM -> ASCENDING')
    expect(transitions).toContain('ASCENDING -> STANDING')
    expect(sm.getState()).toBe('STANDING')
  })

  it('Test 5 — Incomplete squat: DESCENDING → ASCENDING → STANDING without reaching BOTTOM', () => {
    const sequence = [170, 155, 145, 155, 170]
    const states: string[] = []

    for (const angle of sequence) {
      const res = sm.update(makeMockFeatures(angle))
      states.push(res.state)
    }

    expect(states).not.toContain('BOTTOM')
    expect(states).toContain('DESCENDING')
    expect(states).toContain('ASCENDING')
    expect(sm.getState()).toBe('STANDING')
  })

  it('Test 6 — Noise tolerance: tiny fluctuations do not trigger unstable state changes', () => {
    // Start in DESCENDING at 150°
    sm.update(makeMockFeatures(170))
    sm.update(makeMockFeatures(150))
    expect(sm.getState()).toBe('DESCENDING')

    // Feed tiny fluctuations around 150° (deadband = 1.5°)
    const noise = [149.8, 150.2, 149.9, 150.1]
    for (const angle of noise) {
      const res = sm.update(makeMockFeatures(angle))
      expect(res.state).toBe('DESCENDING')
    }
  })

  it('Test 7 — Invalid landmarks: transitions to UNAVAILABLE safely without crashing', () => {
    sm.update(makeMockFeatures(170))
    expect(sm.getState()).toBe('STANDING')

    const res = sm.update(makeMockFeatures(null, false))
    expect(res.state).toBe('UNAVAILABLE')

    // Recover when valid landmarks return
    const res2 = sm.update(makeMockFeatures(170, true))
    expect(res2.state).toBe('STANDING')
  })

  it('Test 8 — Reset: returns state machine to STANDING initial state', () => {
    sm.update(makeMockFeatures(170))
    sm.update(makeMockFeatures(140)) // DESCENDING
    sm.update(makeMockFeatures(95))  // BOTTOM
    expect(sm.getState()).toBe('BOTTOM')

    sm.reset()

    expect(sm.getState()).toBe('STANDING')
  })
})
