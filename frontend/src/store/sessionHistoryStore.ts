/**
 * sessionHistoryStore.ts — Zustand store for local workout session history.
 *
 * Persists session items to localStorage under 'motionlab_sessions'.
 */

import { create } from 'zustand'
import type { WorkoutSessionHistoryItem } from '@/types/history'
import type { SessionSummary } from '@/types/session'

const SESSIONS_STORAGE_KEY = 'motionlab_sessions'

function loadHistoryFromStorage(): WorkoutSessionHistoryItem[] {
  try {
    const raw = localStorage.getItem(SESSIONS_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed
    }
  } catch (e) {
    console.warn('[sessionHistoryStore] Failed to load history from storage:', e)
  }
  return []
}

function saveHistoryToStorage(history: WorkoutSessionHistoryItem[]): void {
  try {
    localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(history))
  } catch (e) {
    console.warn('[sessionHistoryStore] Failed to save history to storage:', e)
  }
}

interface SessionHistoryState {
  history: WorkoutSessionHistoryItem[]
  addSession: (summary: SessionSummary) => void
  deleteSession: (id: string) => void
  clearHistory: () => void
}

export const useSessionHistoryStore = create<SessionHistoryState>((set, get) => ({
  history: loadHistoryFromStorage(),

  addSession: (summary) => {
    const item: WorkoutSessionHistoryItem = {
      id: `session_${summary.startedAt}_${Math.random().toString(36).substring(2, 6)}`,
      profileId: summary.profileId,
      timestamp: new Date(summary.startedAt).toISOString(),
      exercise: 'squat',
      durationSeconds: summary.durationSeconds,
      validReps: summary.validReps ?? summary.totalReps,
      partialReps: summary.partialReps ?? summary.incompleteReps,
      shallowReps: summary.shallowReps ?? 0,
      totalAttempts: summary.totalAttempts ?? (summary.totalReps + summary.incompleteReps),
      averageRepDuration: summary.averageRepDuration,
      averageDepth: summary.minKneeAngle,
      formScore: summary.avgFormScore,
      caloriesBurned: summary.caloriesBurned,
      bestRep: summary.bestRep,
      reps: summary.reps,
      summary,
    }

    const updated = [item, ...get().history]
    saveHistoryToStorage(updated)
    set({ history: updated })
  },

  deleteSession: (id) => {
    const updated = get().history.filter(item => item.id !== id)
    saveHistoryToStorage(updated)
    set({ history: updated })
  },

  clearHistory: () => {
    localStorage.removeItem(SESSIONS_STORAGE_KEY)
    set({ history: [] })
  },
}))
