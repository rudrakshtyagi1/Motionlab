/**
 * SessionSummary.tsx — End-of-session performance report overlay modal.
 *
 * Displays transparent, empirical workout analytics:
 *  - VALID REPS, PARTIAL REPS, TOTAL ATTEMPTS
 *  - EST. CALORIES (~XX kcal) & MET Estimation Disclaimer
 *  - FORM SCORE, SESSION DURATION, & CONSISTENCY (%)
 *  - Form Breakdown (Depth, Knee Tracking, Torso Lean, Stability)
 *  - Primary Improvement Recommendation
 *  - Best & Weakest Rep comparison
 *  - Detailed completed & incomplete repetitions log
 *  - "Save Session" & "View Workout History" buttons
 */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { SessionSummary as SessionSummaryType } from '@/types/session'
import type { FormStatus } from '@/types/analysis'
import { createSession } from '@/services/apiClient'
import { useSessionHistoryStore } from '@/store/sessionHistoryStore'

interface SessionSummaryProps {
  summary: SessionSummaryType | null
  onRestart: () => void
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

function getFormBadgeClass(status?: FormStatus): string {
  switch (status) {
    case 'GOOD':
      return 'bg-good/20 border-good/40 text-good'
    case 'WARNING':
      return 'bg-warn/20 border-warn/40 text-warn'
    case 'POOR':
      return 'bg-danger/20 border-danger/40 text-danger font-bold'
    case 'UNAVAILABLE':
    default:
      return 'bg-surface-400/20 border-surface-400/40 text-muted'
  }
}

export default function SessionSummary({ summary, onRestart }: SessionSummaryProps) {
  const navigate = useNavigate()
  const [mounted, setMounted] = useState(false)
  const [optInLandmarks, setOptInLandmarks] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'IDLE' | 'SAVING' | 'SAVED' | 'FAILED'>('IDLE')
  const [isLocallySaved, setIsLocallySaved] = useState(false)

  const addSessionToHistory = useSessionHistoryStore(s => s.addSession)

  useEffect(() => {
    setMounted(true)

    if (summary) {
      // Non-blocking backend save
      if (summary.totalReps > 0 || summary.incompleteReps > 0) {
        setSaveStatus('SAVING')
        createSession(summary, false).then(res => {
          if (res) setSaveStatus('SAVED')
          else setSaveStatus('FAILED')
        })
      }
    }
  }, [summary])

  if (!summary) return null

  const isZeroReps = summary.totalReps === 0 && summary.incompleteReps === 0
  const durationStr = formatDuration(summary.durationSeconds)

  const handleManualSave = () => {
    if (summary && !isLocallySaved) {
      addSessionToHistory(summary)
      setIsLocallySaved(true)
    }
  }

  const handleToggleOptIn = (checked: boolean) => {
    setOptInLandmarks(checked)
    if (summary) {
      createSession(summary, checked).then(res => {
        if (res) setSaveStatus('SAVED')
      })
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface/90 backdrop-blur-md overflow-y-auto animate-fade-in">
      <div
        className={`w-full max-w-xl glass rounded-2xl p-6 sm:p-8 space-y-6 border border-accent/30 shadow-2xl transition-all duration-500 transform ${
          mounted ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
      >
        {/* ── 1. Header & Duration ────────────────────────────────────────── */}
        <div className="text-center space-y-1 border-b border-surface-400/30 pb-4">
          <div className="flex items-center justify-between">
            <span className="glass-accent px-3 py-1 rounded-full text-xs font-mono text-accent tracking-widest uppercase">
              WORKOUT SUMMARY
            </span>
            {isLocallySaved ? (
              <span className="text-[10px] font-mono text-good flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-good" />
                Saved to History
              </span>
            ) : saveStatus === 'SAVED' ? (
              <span className="text-[10px] font-mono text-good flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-good" />
                Saved online
              </span>
            ) : (
              <span className="text-[10px] font-mono text-muted flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-muted" />
                Local session
              </span>
            )}
          </div>
          <h2 className="text-3xl font-extrabold text-slate-100 tracking-tight mt-2">
            SESSION COMPLETE
          </h2>
          <p className="text-xs font-mono text-slate-400">
            Active Duration: <span className="text-accent font-bold">{durationStr}</span>
          </p>
        </div>

        {/* ── 2. Zero-Rep Empty State ─────────────────────────────────────── */}
        {isZeroReps ? (
          <div className="text-center py-6 space-y-4 glass rounded-xl p-6 border border-surface-400/40">
            <div className="w-14 h-14 rounded-full bg-warn/15 border border-warn/40 text-warn font-bold flex items-center justify-center mx-auto text-2xl">
              !
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-semibold text-slate-200">No completed reps detected</h3>
              <p className="text-xs text-muted max-w-sm mx-auto leading-relaxed font-mono">
                Try standing farther from the camera and make sure your full body is visible from head to feet.
              </p>
            </div>
            <button
              id="summary-try-again-btn"
              onClick={onRestart}
              className="btn-primary px-8 py-3 text-sm font-mono tracking-wider font-bold"
            >
              TRY AGAIN
            </button>
          </div>
        ) : (
          <>
            {/* ── 3. Key Summary Metrics Grid ─────────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 font-mono text-center">
              <div className="glass-accent rounded-xl p-3 flex flex-col items-center justify-center">
                <span className="text-[10px] uppercase text-muted tracking-wider">Valid Reps</span>
                <span className="text-2xl font-extrabold text-good">{summary.validReps}</span>
                <span className="text-[9px] text-muted">full depth</span>
              </div>

              <div className="glass-accent rounded-xl p-3 flex flex-col items-center justify-center">
                <span className="text-[10px] uppercase text-muted tracking-wider">Partial Reps</span>
                <span className={`text-2xl font-extrabold ${summary.partialReps > 0 ? 'text-warn' : 'text-slate-100'}`}>
                  {summary.partialReps}
                </span>
                <span className="text-[9px] text-muted">shallow attempts</span>
              </div>

              <div className="glass-accent rounded-xl p-3 flex flex-col items-center justify-center">
                <span className="text-[10px] uppercase text-muted tracking-wider">Total Attempts</span>
                <span className="text-2xl font-extrabold text-slate-100">{summary.totalAttempts}</span>
                <span className="text-[9px] text-muted">total squats</span>
              </div>

              <div className="glass-accent rounded-xl p-3 flex flex-col items-center justify-center">
                <span className="text-[10px] uppercase text-muted tracking-wider">Est. Calories</span>
                <span className="text-2xl font-extrabold text-accent">
                  {summary.caloriesBurned !== null ? `~${summary.caloriesBurned}` : '—'}
                </span>
                <span className="text-[9px] text-muted">kcal</span>
              </div>

              <div className="glass-accent rounded-xl p-3 flex flex-col items-center justify-center">
                <span className="text-[10px] uppercase text-muted tracking-wider">Form Score</span>
                <span className="text-2xl font-extrabold text-accent">{summary.avgFormScore}%</span>
                <span className="text-[9px] text-muted">rule-based score</span>
              </div>

              <div className="glass-accent rounded-xl p-3 flex flex-col items-center justify-center">
                <span className="text-[10px] uppercase text-muted tracking-wider">Consistency</span>
                <span className="text-2xl font-extrabold text-slate-100">
                  {summary.formConsistency !== null ? `${summary.formConsistency}%` : '—'}
                </span>
                <span className="text-[9px] text-muted">{summary.validReps >= 3 ? 'good quality' : '<3 reps'}</span>
              </div>
            </div>

            {/* Calorie Disclaimer */}
            <div className="text-[10px] font-mono text-muted text-center italic bg-surface-300/40 rounded-lg py-1 px-3 border border-surface-400/20">
              {summary.caloriesEstimate.disclaimer}
            </div>

            {/* ── 4. Form Breakdown Grid ─────────────────────────────────── */}
            <div className="glass rounded-xl p-4 space-y-3 border border-surface-400/30 font-mono">
              <div className="text-[10px] uppercase text-accent tracking-wider font-bold">
                Form Breakdown
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                <div className="glass rounded-lg p-2 flex flex-col items-center">
                  <span className="text-[9px] text-muted uppercase">Depth</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border mt-1 ${getFormBadgeClass(summary.formBreakdown.depth)}`}>
                    {summary.formBreakdown.depth}
                  </span>
                </div>
                <div className="glass rounded-lg p-2 flex flex-col items-center">
                  <span className="text-[9px] text-muted uppercase">Knees</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border mt-1 ${getFormBadgeClass(summary.formBreakdown.kneeAlignment)}`}>
                    {summary.formBreakdown.kneeAlignment}
                  </span>
                </div>
                <div className="glass rounded-lg p-2 flex flex-col items-center">
                  <span className="text-[9px] text-muted uppercase">Torso</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border mt-1 ${getFormBadgeClass(summary.formBreakdown.torsoLean)}`}>
                    {summary.formBreakdown.torsoLean}
                  </span>
                </div>
                <div className="glass rounded-lg p-2 flex flex-col items-center">
                  <span className="text-[9px] text-muted uppercase">Stability</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border mt-1 ${getFormBadgeClass(summary.formBreakdown.stability)}`}>
                    {summary.formBreakdown.stability}
                  </span>
                </div>
              </div>
            </div>

            {/* ── 5. Primary Improvement Card ────────────────────────────── */}
            {summary.primaryImprovement && (
              <div className="glass-accent rounded-xl p-4 space-y-1 border border-accent/30 font-mono">
                <span className="text-[10px] uppercase text-accent tracking-wider font-bold block">
                  Next Time Focus On
                </span>
                <p className="text-sm font-bold text-slate-100">
                  {summary.primaryImprovement}
                </p>
              </div>
            )}

            {/* ── 6. Best vs Weakest Rep Comparison ───────────────────────── */}
            {summary.totalReps >= 2 && summary.bestRep && summary.weakestRep && (
              <div className="grid grid-cols-2 gap-3 font-mono text-xs">
                <div className="glass rounded-xl p-3 border border-good/30 space-y-1">
                  <span className="text-[9px] uppercase text-good font-bold block">Best Rep</span>
                  <p className="text-slate-200 font-bold">Rep #{summary.bestRep.repNumber}</p>
                  <p className="text-muted text-[11px]">
                    {(summary.bestRep.durationMs / 1000).toFixed(1)}s · Knee Angle: {summary.bestRep.bottomKneeAngle}° ({summary.bestRep.depthClassification})
                  </p>
                </div>
                <div className="glass rounded-xl p-3 border border-warn/30 space-y-1">
                  <span className="text-[9px] uppercase text-warn font-bold block">Rep To Improve</span>
                  <p className="text-slate-200 font-bold">Rep #{summary.weakestRep.repNumber}</p>
                  <p className="text-muted text-[11px]">
                    {(summary.weakestRep.durationMs / 1000).toFixed(1)}s · Knee Angle: {summary.weakestRep.bottomKneeAngle}° ({summary.weakestRep.depthClassification})
                  </p>
                </div>
              </div>
            )}

            {/* ── 7. Detailed Rep Performance Log ────────────────────────── */}
            <div className="space-y-2 font-mono text-xs">
              <div className="flex items-center justify-between text-[10px] uppercase text-muted tracking-wider px-1">
                <span>Rep Performance Log</span>
                <span>{summary.reps.length} Total Attempts</span>
              </div>
              <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                {summary.reps.slice().reverse().map(rep => {
                  const classification = rep.depthClassification || (rep.isCompleted ? 'FULL' : 'PARTIAL')
                  const isFull = classification === 'FULL'

                  return (
                    <div
                      key={rep.repNumber}
                      className={`glass rounded-lg px-3 py-2 flex items-center justify-between border ${
                        isFull ? 'border-surface-400/30' : 'border-warn/30'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-200">Rep #{String(rep.repNumber).padStart(2, '0')}</span>
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                            isFull
                              ? 'bg-good/20 text-good border border-good/40'
                              : classification === 'PARTIAL'
                              ? 'bg-warn/20 text-warn border border-warn/40'
                              : 'bg-danger/20 text-danger border border-danger/40'
                          }`}
                        >
                          {classification}
                        </span>
                      </div>
                      <span className="text-slate-400">Angle: {rep.bottomKneeAngle}° ({rep.depthScore}%)</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* ── 8. Opt-In Anonymized Landmark Collection Toggle ───────── */}
            <div className="glass rounded-xl p-3.5 flex items-center justify-between font-mono text-xs border border-surface-400/30">
              <div>
                <span className="text-slate-300 font-medium block">Save anonymized movement data for research</span>
                <span className="text-[10px] text-muted block mt-0.5">No video or images are ever sent</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={optInLandmarks}
                  onChange={e => handleToggleOptIn(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-surface-400 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-accent"></div>
              </label>
            </div>

            {/* ── 9. Action Buttons ───────────────────────────────────────── */}
            <div className="pt-2 grid grid-cols-1 sm:grid-cols-3 gap-2.5 font-mono text-xs">
              <button
                onClick={handleManualSave}
                disabled={isLocallySaved}
                className={`py-3 rounded-xl border font-bold ${
                  isLocallySaved
                    ? 'bg-good/20 border-good/40 text-good cursor-default'
                    : 'glass-accent hover:bg-surface-300 text-accent border-accent/40'
                }`}
              >
                {isLocallySaved ? '✓ SAVED TO HISTORY' : 'SAVE SESSION'}
              </button>

              <button
                onClick={() => navigate('/history')}
                className="py-3 rounded-xl glass hover:bg-surface-300 text-slate-200 border border-surface-400/40 font-bold"
              >
                VIEW HISTORY
              </button>

              <button
                id="start-new-session-btn"
                onClick={onRestart}
                className="btn-primary py-3 text-xs tracking-wider font-bold"
              >
                START NEW SESSION
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
