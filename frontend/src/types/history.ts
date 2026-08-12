/**
 * history.ts — Data model types for persistent workout session history.
 */

import type { RepRecord, SessionSummary } from './session'

export interface WorkoutSessionHistoryItem {
  id: string
  profileId: string
  timestamp: string // ISO string date
  exercise: 'squat'
  durationSeconds: number
  validReps: number
  partialReps: number
  shallowReps: number
  totalAttempts: number
  averageRepDuration: number | null
  averageDepth: number
  formScore: number
  caloriesBurned?: number | null
  bestRep?: RepRecord | null
  reps: RepRecord[]
  summary?: SessionSummary
}
