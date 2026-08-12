/**
 * History.tsx — Workout History & Session Analytics Page.
 *
 * Visualizes total workouts, total valid reps, total calories burned, and average form score.
 */

import { useNavigate } from 'react-router-dom'
import { useSessionHistoryStore } from '@/store/sessionHistoryStore'
import { useProfileStore } from '@/store/profileStore'

export default function HistoryPage() {
  const navigate = useNavigate()
  const history = useSessionHistoryStore(s => s.history)
  const clearHistory = useSessionHistoryStore(s => s.clearHistory)
  const deleteSession = useSessionHistoryStore(s => s.deleteSession)
  const profile = useProfileStore(s => s.profile)

  // Compute aggregated stats
  const totalWorkouts = history.length
  const totalReps = history.reduce((sum, s) => sum + (s.validReps ?? 0), 0)
  const totalCalories = Math.round(history.reduce((sum, s) => sum + (s.caloriesBurned ?? 0), 0))
  const avgFormScore = totalWorkouts > 0
    ? Math.round(history.reduce((sum, s) => sum + (s.formScore ?? 80), 0) / totalWorkouts)
    : 0

  return (
    <main className="min-h-screen bg-surface text-slate-100 flex flex-col font-sans">
      {/* Top nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-surface-400/30">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 text-muted hover:text-accent transition-colors text-sm"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Home
          </button>
          <span className="text-surface-400">·</span>
          <span className="font-mono font-bold text-base tracking-[0.2em] text-accent">
            MOTION<span className="text-slate-100">LAB</span>
          </span>
        </div>
        <div className="flex items-center gap-4 text-sm font-mono">
          <button onClick={() => navigate('/analysis')} className="text-muted hover:text-slate-100">
            Workout
          </button>
          <span className="text-accent font-bold">History</span>
          <button onClick={() => navigate('/profile')} className="text-muted hover:text-slate-100">
            {profile.mode === 'profile' ? `👤 ${profile.name}` : 'Guest Mode'}
          </button>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto w-full p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between font-mono">
          <div>
            <h1 className="text-2xl font-bold text-slate-100">WORKOUT HISTORY</h1>
            <p className="text-xs text-muted">
              Local session logs & progress overview ({totalWorkouts} sessions logged)
            </p>
          </div>
          {totalWorkouts > 0 && (
            <button
              onClick={clearHistory}
              className="text-xs text-muted hover:text-danger font-mono"
            >
              Clear History
            </button>
          )}
        </div>

        {/* ── 4 Summary Hero Cards ────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-center">
          <div className="glass rounded-xl p-4 border border-surface-400/30">
            <span className="text-[10px] text-muted uppercase tracking-wider block">Total Workouts</span>
            <span className="text-2xl font-extrabold text-slate-100">{totalWorkouts}</span>
          </div>

          <div className="glass rounded-xl p-4 border border-surface-400/30">
            <span className="text-[10px] text-muted uppercase tracking-wider block">Total Reps</span>
            <span className="text-2xl font-extrabold text-good">{totalReps}</span>
          </div>

          <div className="glass rounded-xl p-4 border border-surface-400/30">
            <span className="text-[10px] text-muted uppercase tracking-wider block">Total Calories</span>
            <span className="text-2xl font-extrabold text-accent">
              {totalCalories > 0 ? `~${totalCalories}` : '—'} <span className="text-xs text-muted">kcal</span>
            </span>
          </div>

          <div className="glass rounded-xl p-4 border border-surface-400/30">
            <span className="text-[10px] text-muted uppercase tracking-wider block">Avg Form Score</span>
            <span className="text-2xl font-extrabold text-slate-100">{avgFormScore}%</span>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="text-[10px] font-mono text-muted text-center italic bg-surface-300/40 rounded-lg py-1 px-3 border border-surface-400/20">
          Your camera feed stays on your device. MotionLab does not upload or store video. Calories are estimates based on duration & body weight.
        </div>

        {/* ── Recent Sessions List ──────────────────────────────────────── */}
        {totalWorkouts === 0 ? (
          <div className="glass rounded-2xl p-10 text-center space-y-4 border border-surface-400/30 font-mono">
            <div className="w-12 h-12 rounded-full glass-accent flex items-center justify-center mx-auto text-accent text-xl">
              📊
            </div>
            <div className="space-y-1">
              <p className="text-slate-200 font-semibold">No workout sessions logged yet</p>
              <p className="text-xs text-muted max-w-xs mx-auto">
                Complete a workout analysis session to view history, calories burned, and consistency metrics.
              </p>
            </div>
            <button
              onClick={() => navigate('/analysis')}
              className="btn-primary px-8 py-3 text-xs tracking-wider font-bold"
            >
              START WORKOUT
            </button>
          </div>
        ) : (
          <div className="space-y-3 font-mono">
            <h3 className="text-xs uppercase text-accent font-bold tracking-wider">Recent Sessions</h3>
            {history.map(item => {
              const dateStr = new Date(item.timestamp).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })
              const validReps = item.validReps ?? 0
              const partialReps = item.partialReps ?? 0

              return (
                <div
                  key={item.id}
                  className="glass rounded-xl p-4 border border-surface-400/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-accent font-bold uppercase">{item.exercise}</span>
                      <span className="text-xs text-muted">· {dateStr}</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-300">
                      <span><strong className="text-good">{validReps}</strong> valid</span>
                      {partialReps > 0 && (
                        <span className="text-warn"><strong className="text-warn">{partialReps}</strong> partial</span>
                      )}
                      <span>Duration: <strong className="text-slate-100">{item.durationSeconds}s</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs">
                    <div className="text-right">
                      <span className="text-[10px] text-muted uppercase block">Est. Calories</span>
                      <span className="font-bold text-accent">
                        {item.caloriesBurned !== undefined && item.caloriesBurned !== null ? `~${item.caloriesBurned} kcal` : '—'}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-muted uppercase block">Form Score</span>
                      <span className="font-bold text-slate-200">
                        {item.formScore}%
                      </span>
                    </div>

                    <button
                      onClick={() => deleteSession(item.id)}
                      className="text-muted hover:text-danger text-xs p-1"
                      title="Delete session"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
