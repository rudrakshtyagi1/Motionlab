/**
 * apiClient.ts — Axios API client for MotionLab FastAPI backend.
 *
 * Responsibilities:
 *  - Communicate with backend session persistence API
 *  - Handles optional opt-in anonymized landmark sequence transmission
 *  - Gracefully handles offline backend (client-side analysis experience never breaks)
 */

import axios from 'axios'
import type { SessionSummary } from '@/types/session'

// Configurable API base URL (defaults to http://localhost:8001/api or port 8000)
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001/api'

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json',
  },
})

export interface SaveSessionResponse {
  id: string
  exercise: string
  total_reps: number
  created_at?: string
}

/**
 * checkHealth — Verify if FastAPI backend is reachable.
 */
export async function checkHealth(): Promise<boolean> {
  try {
    const res = await api.get('/health')
    return res.data?.status === 'ok'
  } catch {
    return false
  }
}

/**
 * createSession — Submits completed workout session to backend SQLite persistence.
 *
 * @param summary SessionSummary object calculated by sessionAnalytics.ts
 * @param saveLandmarks Anonymized landmark sequence opt-in flag (default FALSE)
 */
export async function createSession(
  summary: SessionSummary,
  saveLandmarks = false
): Promise<SaveSessionResponse | null> {
  try {
    const payload = {
      id: `session_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      exercise: 'squat',
      started_at: summary.startedAt,
      ended_at: summary.endedAt,
      total_reps: summary.totalReps,
      good_reps: summary.goodReps,
      warning_reps: summary.warningReps,
      poor_reps: summary.poorReps,
      form_consistency: summary.formConsistency,
      primary_improvement: summary.primaryImprovement,
      reps: summary.reps.map(r => ({
        rep_number: r.repNumber,
        duration_ms: r.durationMs,
        minimum_knee_angle: r.bottomKneeAngle,
        depth_status: r.formAnalysis?.summary?.depth.status ?? 'GOOD',
        knee_alignment_status: r.formAnalysis?.summary?.kneeAlignment.status ?? 'GOOD',
        torso_status: r.formAnalysis?.summary?.torsoLean.status ?? 'GOOD',
        stability_status: r.formAnalysis?.summary?.stability.status ?? 'GOOD',
        overall_status: r.formAnalysis?.summary?.overall ?? (r.formAnalysis?.isGoodRep ? 'GOOD' : 'WARNING'),
        score: r.formAnalysis?.score ?? 100,
      })),
      landmarks: saveLandmarks ? [] : null,
    }

    const res = await api.post('/sessions', payload)
    return res.data
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn('[apiClient] Session save to backend failed (offline or server error):', err)
    }
    return null
  }
}

/**
 * getSession — Retrieves a persisted session by ID.
 */
export async function getSession(sessionId: string): Promise<any | null> {
  try {
    const res = await api.get(`/sessions/${sessionId}`)
    return res.data
  } catch {
    return null
  }
}

/**
 * getSessions — Retrieves recent persisted sessions.
 */
export async function getSessions(limit = 20): Promise<any[]> {
  try {
    const res = await api.get(`/sessions?limit=${limit}`)
    return res.data ?? []
  } catch {
    return []
  }
}
