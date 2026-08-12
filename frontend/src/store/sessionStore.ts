/**
 * sessionStore.ts — Zustand global session state & analytics selector functions.
 *
 * Centralizes all mutable runtime state so that components can subscribe
 * only to the slices they care about, avoiding unnecessary re-renders.
 */

import { create } from 'zustand'
import type { SessionState, RepRecord, TimelineEvent, SessionSummary } from '@/types/session'
import { calculateSessionSummary, calculateSessionConsistency } from '@/services/sessionAnalytics'
import { useProfileStore } from '@/store/profileStore'

// ─── Initial State ────────────────────────────────────────────────────────────
const INITIAL_STATE: SessionState = {
  status:           'IDLE',
  startTime:        null,
  repCount:         0,
  validCount:       0,
  partialCount:     0,
  shallowCount:     0,
  totalAttempts:    0,
  incompleteCount:  0,
  currentFormScore: 0,
  lastFeedback:     '',
  reps:             [],
  timeline:         [],
  summary:          null,
}

// ─── Store Actions ────────────────────────────────────────────────────────────
interface SessionActions {
  startSession: () => void
  stopSession:  () => void
  resetSession: () => void

  addRepRecord:    (record: RepRecord) => void
  incrementRep:    (record: RepRecord) => void
  updateFormScore: (score: number) => void
  setFeedback:     (msg: string) => void
  addTimelineEvent:(event: TimelineEvent) => void
  setSummary:      (summary: SessionSummary) => void
}

// ─── Combined Store Type ──────────────────────────────────────────────────────
type SessionStore = SessionState & SessionActions

/**
 * useSessionStore — Zustand store for real-time session management.
 */
export const useSessionStore = create<SessionStore>((set, get) => ({
  ...INITIAL_STATE,

  startSession: () => {
    set({
      status:          'RUNNING',
      startTime:       Date.now(),
      repCount:        0,
      validCount:      0,
      partialCount:    0,
      shallowCount:    0,
      totalAttempts:   0,
      incompleteCount: 0,
      reps:            [],
      timeline:        [],
      summary:         null,
    })
  },

  stopSession: () => {
    const { startTime, reps } = get()
    const startedAt = startTime ?? Date.now()
    const endedAt = Date.now()

    const { profile } = useProfileStore.getState()

    // Calculate complete session summary via pure analytics service
    const summary = calculateSessionSummary(reps, {
      startTime: startedAt,
      endTime: endedAt,
      profileId: profile.id,
      weightKg: profile.weightKg,
    })

    set({ status: 'COMPLETE', summary })
  },

  resetSession: () => set(INITIAL_STATE),

  addRepRecord: (record) =>
    set(s => ({
      repCount: record.isCompleted ? s.repCount + 1 : s.repCount,
      validCount: record.isCompleted ? s.validCount + 1 : s.validCount,
      partialCount: record.depthClassification === 'PARTIAL' ? s.partialCount + 1 : s.partialCount,
      shallowCount: record.depthClassification === 'SHALLOW' ? s.shallowCount + 1 : s.shallowCount,
      totalAttempts: s.totalAttempts + 1,
      incompleteCount: !record.isCompleted ? s.incompleteCount + 1 : s.incompleteCount,
      reps: [...s.reps, record],
    })),

  incrementRep: (record) =>
    set(s => ({
      repCount: record.isCompleted ? s.repCount + 1 : s.repCount,
      validCount: record.isCompleted ? s.validCount + 1 : s.validCount,
      partialCount: record.depthClassification === 'PARTIAL' ? s.partialCount + 1 : s.partialCount,
      shallowCount: record.depthClassification === 'SHALLOW' ? s.shallowCount + 1 : s.shallowCount,
      totalAttempts: s.totalAttempts + 1,
      incompleteCount: !record.isCompleted ? s.incompleteCount + 1 : s.incompleteCount,
      reps: [...s.reps, record],
    })),

  updateFormScore: (score) =>
    set({ currentFormScore: score }),

  setFeedback: (msg) =>
    set({ lastFeedback: msg }),

  addTimelineEvent: (event) =>
    set(s => ({ timeline: [...s.timeline, event] })),

  setSummary: (summary) =>
    set({ summary }),
}))

// ─── Pure Selector Functions (derived analytics) ──────────────────────────────

/** Calculate number of good reps */
export function selectGoodRepsCount(reps: RepRecord[]): number {
  return reps.filter(r => r.isCompleted !== false && (r.formAnalysis ? r.formAnalysis.isGoodRep : true)).length
}

/** Calculate average rep duration in seconds */
export function selectAvgRepDurationSec(reps: RepRecord[]): number | null {
  const completed = reps.filter(r => r.isCompleted !== false)
  if (completed.length === 0) return null
  const totalMs = completed.reduce((sum, r) => sum + r.durationMs, 0)
  return Math.round((totalMs / completed.length / 1000) * 10) / 10
}

/**
 * Calculate Form Consistency percentage using Coefficient of Variation across depth, tempo, and form quality.
 * Returns null if fewer than 2 valid completed reps exist (displays '—').
 */
export function selectFormConsistencyPercent(reps: RepRecord[]): number | null {
  return calculateSessionConsistency(reps)
}
