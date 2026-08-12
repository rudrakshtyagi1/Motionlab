/**
 * ProfilePage.tsx — User Profile & Guest Mode entry point.
 *
 * Supports zero-auth Guest Mode and local User Profiles.
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProfileStore } from '@/store/profileStore'

export default function ProfilePage() {
  const navigate = useNavigate()
  const { profile, updateProfile, switchToGuest, deleteProfile } = useProfileStore()

  const [name, setName] = useState(profile.name ?? '')
  const [weightKg, setWeightKg] = useState(profile.weightKg ? String(profile.weightKg) : '')
  const [heightCm, setHeightCm] = useState(profile.heightCm ? String(profile.heightCm) : '')
  const [age, setAge] = useState(profile.age ? String(profile.age) : '')
  const [savedToast, setSavedToast] = useState(false)

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault()
    updateProfile({
      mode: 'profile',
      name: name.trim() || 'User',
      weightKg: weightKg ? parseFloat(weightKg) : null,
      heightCm: heightCm ? parseFloat(heightCm) : null,
      age: age ? parseInt(age, 10) : null,
    })
    setSavedToast(true)
    setTimeout(() => setSavedToast(false), 2500)
  }

  const handleSwitchGuest = () => {
    switchToGuest()
    setName('')
    setWeightKg('')
    setHeightCm('')
    setAge('')
  }

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
          <button onClick={() => navigate('/history')} className="text-muted hover:text-slate-100">
            History
          </button>
          <span className="text-accent font-bold">Profile</span>
        </div>
      </nav>

      <div className="max-w-xl mx-auto w-full p-6 space-y-6">
        {/* Header card */}
        <div className="glass rounded-2xl p-6 border border-surface-400/30 space-y-3 font-mono">
          <div className="flex items-center justify-between">
            <span className="text-xs text-accent uppercase tracking-widest font-bold">MODE STATUS</span>
            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${profile.mode === 'profile' ? 'bg-good/20 text-good border border-good/40' : 'bg-surface-400/20 text-muted border border-surface-400/40'}`}>
              {profile.mode === 'profile' ? `PROFILE: ${profile.name}` : 'GUEST MODE'}
            </span>
          </div>

          <p className="text-xs text-muted leading-relaxed">
            MotionLab works immediately without an account. Add your body weight for personalized MET-based calorie burn estimation.
          </p>

          {profile.mode === 'profile' ? (
            <button
              onClick={handleSwitchGuest}
              className="text-xs text-warn hover:underline font-mono"
            >
              Switch to Guest Mode
            </button>
          ) : (
            <span className="text-xs text-slate-400 block font-mono">
              Currently in Guest Mode. Complete sessions anonymously or create a local profile below.
            </span>
          )}
        </div>

        {/* Profile form */}
        <form onSubmit={handleSaveProfile} className="glass rounded-2xl p-6 border border-surface-400/30 space-y-4 font-mono">
          <h3 className="text-lg font-bold text-slate-100">
            {profile.mode === 'profile' ? 'Edit Local Profile' : 'Create Profile'}
          </h3>

          <div className="space-y-1.5">
            <label className="text-xs text-muted">Name</label>
            <input
              type="text"
              placeholder="e.g. Rudraksh"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-surface-200 border border-surface-400/50 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:border-accent outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs text-muted">Weight (kg)</label>
              <input
                type="number"
                step="0.5"
                placeholder="e.g. 72"
                value={weightKg}
                onChange={e => setWeightKg(e.target.value)}
                className="w-full bg-surface-200 border border-surface-400/50 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:border-accent outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted">Height (cm)</label>
              <input
                type="number"
                placeholder="e.g. 178"
                value={heightCm}
                onChange={e => setHeightCm(e.target.value)}
                className="w-full bg-surface-200 border border-surface-400/50 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:border-accent outline-none"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-muted">Age (years)</label>
            <input
              type="number"
              placeholder="e.g. 24"
              value={age}
              onChange={e => setAge(e.target.value)}
              className="w-full bg-surface-200 border border-surface-400/50 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:border-accent outline-none"
            />
          </div>

          {savedToast && (
            <div className="text-xs text-good font-mono bg-good/15 border border-good/40 rounded-lg py-2 px-3 text-center">
              ✓ Profile saved successfully!
            </div>
          )}

          <div className="pt-2 flex items-center justify-between gap-3">
            <button
              type="submit"
              className="btn-primary flex-1 py-3 text-sm tracking-wider font-bold"
            >
              SAVE PROFILE
            </button>
            {profile.mode === 'profile' && (
              <button
                type="button"
                onClick={deleteProfile}
                className="px-4 py-3 rounded-xl bg-danger/20 border border-danger/40 text-danger text-xs hover:bg-danger/30"
              >
                Delete
              </button>
            )}
          </div>
        </form>
      </div>
    </main>
  )
}
