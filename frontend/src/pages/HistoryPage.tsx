/**
 * HistoryPage.tsx — Workout Session History & Personal Records view.
 *
 * Reads stored session summaries from useHistoryStore (localStorage: 'motionlab_sessions').
 */

import { useNavigate } from 'react-router-dom'
import { useHistoryStore } from '@/store/historyStore'
import { useProfileStore } from '@/store/profileStore'

export default function HistoryPage() {
  const navigate = useNavigate()
  const history = useHistoryStore(s => s.history)
  const clearHistory = useHistoryStore(s => s.clearHistory)
  const deleteSession = useHistoryStore(s => s.deleteSession)
  const profile = useProfileStore(s => s.profile)

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
            {profile.mode === 'profile' ? profile.name : 'Guest'}
          </button>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto w-full p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between font-mono">
          <div>
            <h1 className="text-2xl font-bold text-slate-100">WORKOUT HISTORY</h1>
            <p className="text-xs text-muted">
              Local session logs ({history.length} sessions stored)
            </p>
          </div>
          {history.length > 0 && (
            <button
              onClick={clearHistory}
              className="text-xs text-muted hover:text-danger font-mono"
            >
              Clear History
            </button>
          )}
        </div>

        {/* Empty State */}
        {history.length === 0 ? (
          <div className="glass rounded-2xl p-10 text-center space-y-4 border border-surface-400/30 font-mono">
            <div className="w-12 h-12 rounded-full glass-accent flex items-center justify-center mx-auto text-accent">
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
            {history.map(item => {
              const dateStr = new Date(item.startedAt).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })
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
                      <span><strong className="text-slate-100">{item.totalReps}</strong> valid reps</span>
                      {item.incompleteReps > 0 && (
                        <span className="text-warn"><strong className="text-warn">{item.incompleteReps}</strong> incomplete</span>
                      )}
                      <span>Duration: <strong className="text-slate-100">{item.durationSeconds}s</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs">
                    <div className="text-right">
                      <span className="text-[10px] text-muted uppercase block">Est. Calories</span>
                      <span className="font-bold text-accent">
                        {item.caloriesBurned !== null ? `~${item.caloriesBurned} kcal` : '—'}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-muted uppercase block">Consistency</span>
                      <span className="font-bold text-slate-200">
                        {item.formConsistency !== null ? `${item.formConsistency}%` : '—'}
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
