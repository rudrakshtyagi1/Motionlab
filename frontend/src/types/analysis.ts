/**
 * analysis.ts — TypeScript interfaces and types for biomechanical analysis,
 * feature extraction, squat state machine, rep counter, and form analysis.
 */

/** ── Step 5: Feature Extraction ─────────────────────────────────────────────── */

export interface SquatFeatures {
  timestamp: number
  leftKneeAngle: number | null
  rightKneeAngle: number | null
  kneeAngle: number | null
  leftHipAngle: number | null
  rightHipAngle: number | null
  hipAngle: number | null
  leftElbowAngle?: number | null
  rightElbowAngle?: number | null
  torsoInclination: number | null
  torsoAngle?: number | null
  leftKneeAnkleOffset: number | null
  rightKneeAnkleOffset: number | null
  normalizedLeftKneeAnkleOffset: number | null
  normalizedRightKneeAnkleOffset: number | null
  kneeAngleSymmetry: number | null
  hipAngleSymmetry: number | null
  isReliable: boolean
}

/** ── Step 6: Squat State Machine ────────────────────────────────────────────── */

export type SquatState =
  | 'STANDING'
  | 'DESCENDING'
  | 'BOTTOM'
  | 'ASCENDING'
  | 'UNAVAILABLE'

export type MovementDirection = 'DOWN' | 'UP' | 'HOLD' | 'NONE'

export interface SquatStateTransition {
  from: SquatState
  to: SquatState
  timestamp: number
}

export interface SquatStateResult {
  state: SquatState
  previousState: SquatState
  kneeAngle: number | null
  direction: MovementDirection
  changed: boolean
  transition?: SquatStateTransition
}

/** ── Step 8: Form Analysis ──────────────────────────────────────────────────── */

export type FormStatus = 'GOOD' | 'WARNING' | 'POOR' | 'UNAVAILABLE'

export interface FormMetric {
  name?: string
  status: FormStatus
  value?: number | null
  unit?: string
  message: string
}

export type FormIssueType =
  | 'INSUFFICIENT_DEPTH'
  | 'KNEE_ALIGNMENT'
  | 'TORSO_LEAN'
  | 'INSTABILITY'
  | 'ASYMMETRY'

export type FormIssueSeverity = 'INFO' | 'WARNING' | 'CRITICAL'

export interface FormIssue {
  type: FormIssueType
  severity: FormIssueSeverity
  message: string
  timestamp: number
}

export interface FormAnalysis {
  depth: FormMetric
  kneeAlignment: FormMetric
  torsoLean: FormMetric
  stability: FormMetric
  overall: FormStatus
  feedback: FormIssue[]
  primaryMessage: string
  formScore?: number
}

/** Alias for live coaching feedback */
export type LiveFormFeedback = FormAnalysis

export interface RepFormSummary {
  repNumber: number
  depth: FormMetric
  kneeAlignment: FormMetric
  torsoLean: FormMetric
  stability: FormMetric
  overall: FormStatus
  issues: FormIssue[]
}

export interface RepFormAnalysis {
  repIndex: number
  score: number
  issues: FormIssue[]
  minKneeAngle: number
  avgTorsoAngle: number
  avgKneeAlignment: number
  isGoodRep: boolean
  summary: RepFormSummary
}

export interface MovementAnalyzer {
  analyzeFrame(features: SquatFeatures): FormAnalysis
  analyzeRep(repFeatures: SquatFeatures[]): RepFormAnalysis
  reset(): void
}
