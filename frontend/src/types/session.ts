/**
 * session.ts — Types for session state, repetition records, and post-session summaries.
 *
 * Updated for Multi-Feature Depth Analysis & Product Upgrade.
 */

import type { RepFormAnalysis, FormIssueType, FormStatus } from './analysis'
import type { DepthClassification } from '@/services/depthAnalyzer'
import type { CalorieEstimateResult } from '@/services/calorieEstimator'

/** Overall session status */
export type SessionStatus =
  | 'IDLE'        // Not started
  | 'RUNNING'     // Active analysis in progress
  | 'PAUSED'      // User paused (future feature)
  | 'COMPLETE'    // Session ended, summary available

/** Rep counter active progress state machine phase */
export type RepProgress = 'IDLE' | 'DESCENDING' | 'REACHED_BOTTOM' | 'ASCENDING'

/** Result output returned by RepCounter.update() */
export interface RepCounterResult {
  repCount:        number
  validCount:      number
  partialCount:    number
  shallowCount:    number
  totalAttempts:   number
  incompleteCount: number
  repCompleted:    boolean
  currentProgress: RepProgress
  latestRep:       RepRecord | null
  history:         RepRecord[]
}

/**
 * A single repetition record (valid, partial, or shallow).
 */
export interface RepRecord {
  /** 1-based repetition index */
  index:           number
  repNumber:       number
  startTime:       number
  bottomTime:      number
  endTime:         number
  durationMs:      number
  bottomKneeAngle: number
  depthScore:      number
  depthClassification: DepthClassification
  isCompleted:     boolean
  isFullValidDepth: boolean
  rejectionReason?: string
  formAnalysis?:   RepFormAnalysis
}

/**
 * Aggregated form breakdown status across all reps in a session.
 */
export interface FormBreakdown {
  depth:         FormStatus
  kneeAlignment: FormStatus
  torsoLean:     FormStatus
  stability:     FormStatus
}

/**
 * Post-session summary — generated when the user clicks "Stop Analysis".
 */
export interface SessionSummary {
  profileId:           string
  weightKgAtTime:      number | null
  totalReps:           number // valid completed reps
  validReps:           number
  partialReps:         number
  shallowReps:         number
  totalAttempts:       number
  incompleteReps:      number
  averageRepDuration:  number | null
  caloriesEstimate:    CalorieEstimateResult
  caloriesBurned:      number | null
  goodReps:            number
  warningReps:         number
  poorReps:            number
  formConsistency:     number | null
  formBreakdown:       FormBreakdown
  primaryImprovement:  string | null
  issueFrequency:      Record<FormIssueType, number>
  bestRep:             RepRecord | null
  weakestRep:          RepRecord | null
  reps:                RepRecord[]
  startedAt:           number
  endedAt:             number
  durationSeconds:     number
  durationMs:          number
  needsWorkReps:       number
  avgFormScore:        number
  minKneeAngle:        number
  avgKneeAngle:        number
  avgTorsoAngle:       number
  avgSymmetryScore:    number
}

/** Reactive session state held in Zustand store */
export interface SessionState {
  status:           SessionStatus
  startTime:        number | null
  repCount:         number
  validCount:       number
  partialCount:     number
  shallowCount:     number
  totalAttempts:    number
  incompleteCount:  number
  currentFormScore: number
  lastFeedback:     string
  reps:             RepRecord[]
  timeline:         TimelineEvent[]
  summary:          SessionSummary | null
}

export interface TimelineEvent {
  timestamp: number
  type: 'PHASE_CHANGE' | 'REP_COMPLETE' | 'INCOMPLETE_REP' | 'FORM_WARNING' | 'PAUSE' | 'RESUME'
  description: string
  metadata?: Record<string, any>
}
