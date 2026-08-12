/**
 * historyStore.ts — Local session history storage manager.
 *
 * Persists session summaries to localStorage under 'motionlab_sessions'.
 */

import { create } from 'zustand'
import type { SessionSummary } from '@/types/session'

const HISTORY_STORAGE_KEY = 'motionlab_sessions'

export interface SessionHistoryItem {
  id: string
  profileId: string
  exercise: string
  startedAt: number
  endedAt: number
  durationSeconds: number
  totalReps: number
  incompleteReps: number
  caloriesBurned: number | null
  weightKgAtTime: number | null
  averageRepDuration: number | null
  formConsistency: number | null
  avgFormScore: number
  primaryImprovement: string | null
  createdIso: string
  summary: SessionSummary
}

function loadHistoryFromStorage(): SessionHistoryItem[] {
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed
    }
  } catch (e) {
    console.warn('[historyStore] Failed to load history from localStorage:', e)
  }
  return []
}

function saveHistoryToStorage(history: SessionHistoryItem[]): void {
  try {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history))
  } catch (e) {
    console.warn('[historyStore] Failed to save history to localStorage:', e)
  }
}

interface HistoryState {
  history: SessionHistoryItem[]
  addSession: (summary: SessionSummary) => void
  deleteSession: (id: string) => void
  clearHistory: () => void
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  history: loadHistoryFromStorage(),

  addSession: (summary) => {
    const item: SessionHistoryItem = {
      id: `hist_${summary.startedAt}_${Math.random().toString(36).substring(2, 6)}`,
      profileId: summary.profileId,
      exercise: 'squat',
      startedAt: summary.startedAt,
      endedAt: summary.endedAt,
      durationSeconds: summary.durationSeconds,
      totalReps: summary.totalReps,
      incompleteReps: summary.incompleteReps,
      caloriesBurned: summary.caloriesBurned,
      weightKgAtTime: summary.weightKgAtTime,
      averageRepDuration: summary.averageRepDuration,
      formConsistency: summary.formConsistency,
      avgFormScore: summary.avgFormScore,
      primaryImprovement: summary.primaryImprovement,
      createdIso: new Date(summary.startedAt).toISOString(),
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
    localStorage.removeItem(HISTORY_STORAGE_KEY)
    set({ history: [] })
  },
}))
