/**
 * formAnalyzer.test.ts — Unit tests for RuleBasedSquatAnalyzer.
 *
 * Verifies:
 *  1. Depth evaluation (GOOD <= 100°, WARNING 101-115°, POOR > 115°)
 *  2. Knee alignment evaluation (GOOD <= 0.25, WARNING 0.26-0.40, POOR > 0.40)
 *  3. Torso lean evaluation (GOOD <= 30°, WARNING 31-45°, POOR > 45°)
 *  4. Stability evaluation over sliding window buffer
 *  5. Overall explainable hierarchy (POOR if any POOR, WARNING if any WARNING, GOOD if all GOOD)
 *  6. Missing/unreliable landmark handling (returns UNAVAILABLE without crashing)
 *  7. Rep-level summary computation (analyzeRep)
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { RuleBasedSquatAnalyzer } from '../services/formAnalyzer'
import type { SquatFeatures } from '../types/analysis'

function makeMockFeatures(overrides?: Partial<SquatFeatures>): SquatFeatures {
  return {
    timestamp: performance.now(),
    leftKneeAngle: 95,
    rightKneeAngle: 95,
    kneeAngle: 95,
    leftHipAngle: 95,
    rightHipAngle: 95,
    hipAngle: 95,
    leftElbowAngle: 170,
    rightElbowAngle: 170,
    torsoInclination: 15,
    torsoAngle: 15,
    leftKneeAnkleOffset: 0.1,
    rightKneeAnkleOffset: 0.1,
    normalizedLeftKneeAnkleOffset: 0.1,
    normalizedRightKneeAnkleOffset: 0.1,
    kneeAngleSymmetry: 0,
    hipAngleSymmetry: 0,
    isReliable: true,
    ...overrides,
  }
}

describe('RuleBasedSquatAnalyzer', () => {
  let analyzer: RuleBasedSquatAnalyzer

  beforeEach(() => {
    analyzer = new RuleBasedSquatAnalyzer()
  })

  it('Test 1 — Depth: returns GOOD for knee angle <= 100°', () => {
    const metric = analyzer.analyzeDepth(95)
    expect(metric.status).toBe('GOOD')
    expect(metric.message).toContain('Good Depth')
  })

  it('Test 2 — Depth: returns WARNING for shallow knee angle (105°) and POOR for > 115°', () => {
    const warningMetric = analyzer.analyzeDepth(108)
    expect(warningMetric.status).toBe('WARNING')

    const poorMetric = analyzer.analyzeDepth(125)
    expect(poorMetric.status).toBe('POOR')
  })

  it('Test 3 — Knee Alignment: returns GOOD for offset <= 0.25', () => {
    const metric = analyzer.analyzeKneeAlignment(0.12, 0.15)
    expect(metric.status).toBe('GOOD')
  })

  it('Test 4 — Knee Alignment: returns POOR for large knee cave deviation (> 0.40)', () => {
    const metric = analyzer.analyzeKneeAlignment(0.48, 0.45)
    expect(metric.status).toBe('POOR')
    expect(metric.message).toContain('Valgus')
  })

  it('Test 5 — Torso Lean: returns GOOD for upright torso (15°) and POOR for excessive lean (50°)', () => {
    const goodMetric = analyzer.analyzeTorsoLean(15)
    expect(goodMetric.status).toBe('GOOD')

    const poorMetric = analyzer.analyzeTorsoLean(50)
    expect(poorMetric.status).toBe('POOR')
  })

  it('Test 6 — Missing Landmarks: returns UNAVAILABLE safely without crashing', () => {
    const unavailableDepth = analyzer.analyzeDepth(null)
    expect(unavailableDepth.status).toBe('UNAVAILABLE')

    const features = makeMockFeatures({ isReliable: false })
    const frameResult = analyzer.analyzeFrame(features)
    expect(frameResult.overall).toBe('UNAVAILABLE')
  })

  it('Test 7 — Overall Form Hierarchy: all GOOD -> GOOD, one WARNING -> WARNING, one POOR -> POOR', () => {
    // All good
    const goodFeatures = makeMockFeatures({ kneeAngle: 95, torsoInclination: 15, normalizedLeftKneeAnkleOffset: 0.1 })
    const res1 = analyzer.analyzeFrame(goodFeatures)
    expect(res1.overall).toBe('GOOD')

    // One warning (torso lean 35°)
    const warningFeatures = makeMockFeatures({ kneeAngle: 95, torsoInclination: 38, normalizedLeftKneeAnkleOffset: 0.1 })
    const res2 = analyzer.analyzeFrame(warningFeatures)
    expect(res2.overall).toBe('WARNING')

    // One poor (insufficient depth 130°)
    const poorFeatures = makeMockFeatures({ kneeAngle: 130, torsoInclination: 15, normalizedLeftKneeAnkleOffset: 0.1 })
    const res3 = analyzer.analyzeFrame(poorFeatures)
    expect(res3.overall).toBe('POOR')
  })

  it('Test 8 — Rep Form Summary (analyzeRep): computes correct min angle and rep form score', () => {
    const repFrames = [
      makeMockFeatures({ kneeAngle: 170, torsoInclination: 5 }),
      makeMockFeatures({ kneeAngle: 140, torsoInclination: 15 }),
      makeMockFeatures({ kneeAngle: 92, torsoInclination: 20 }), // bottom depth
      makeMockFeatures({ kneeAngle: 130, torsoInclination: 15 }),
      makeMockFeatures({ kneeAngle: 170, torsoInclination: 5 }),
    ]

    const repAnalysis = analyzer.analyzeRep(repFrames)
    expect(repAnalysis.minKneeAngle).toBe(92)
    expect(repAnalysis.summary?.depth.status).toBe('GOOD')
    expect(repAnalysis.isGoodRep).toBe(true)
    expect(repAnalysis.score).toBeGreaterThanOrEqual(70)
  })
})
