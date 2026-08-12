import { useNavigate } from 'react-router-dom'
import { useProfileStore } from '@/store/profileStore'

/**
 * Landing.tsx — MotionLab home screen.
 *
 * Communicates core capabilities, local privacy architecture, and navigation CTAs.
 */
export default function Landing() {
  const navigate = useNavigate()
  const profile = useProfileStore(s => s.profile)

  return (
    <main className="relative min-h-screen bg-surface text-slate-100 overflow-hidden flex flex-col font-sans">

      {/* ── Background grid & radial glow ──────────────────────────────────── */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0,212,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,212,255,0.03) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />
      {/* Top-center radial glow */}
      <div
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] opacity-20"
        aria-hidden="true"
        style={{
          background: 'radial-gradient(ellipse at center top, #00d4ff 0%, transparent 70%)',
        }}
      />

      {/* ── Top nav bar ────────────────────────────────────────────────────── */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-5 border-b border-surface-400/30">
        <div className="flex items-center gap-3">
          <span className="font-mono font-bold text-lg tracking-[0.2em] text-accent">
            MOTION<span className="text-slate-100">LAB</span>
          </span>
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-surface-300 border border-surface-400 text-xs font-mono text-good">
            <span className="w-1.5 h-1.5 rounded-full bg-good animate-pulse-slow" />
            LIVE CV v1.0
          </span>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <button
            onClick={() => navigate('/history')}
            className="text-muted hover:text-accent transition-colors"
          >
            History
          </button>
          <button
            onClick={() => navigate('/profile')}
            className="glass-accent px-3 py-1 rounded-full text-accent font-bold hover:bg-surface-300 transition-colors"
          >
            {profile.mode === 'profile' ? `👤 ${profile.name}` : 'Guest Mode'}
          </button>
        </div>
      </nav>

      {/* ── Hero section ───────────────────────────────────────────────────── */}
      <section className="relative z-10 flex flex-col items-center justify-center flex-1 px-6 pt-16 pb-24 text-center">

        {/* Eyebrow label */}
        <div className="inline-flex items-center gap-2 mb-6 px-4 py-1.5 rounded-full glass border border-accent/20 text-xs font-mono tracking-widest text-accent uppercase">
          <span className="w-2 h-2 rounded-full bg-accent animate-pulse-slow" />
          Real-time Computer Vision Engine
        </div>

        {/* Main heading */}
        <h1 className="text-5xl sm:text-7xl font-black tracking-tight mb-4 leading-none">
          <span className="text-gradient">MOTION</span>
          <span className="text-slate-100">LAB</span>
        </h1>

        {/* Subtitle */}
        <p className="text-lg sm:text-2xl text-slate-300 font-medium mb-3 max-w-2xl leading-relaxed">
          REAL-TIME MOVEMENT INTELLIGENCE
        </p>
        <p className="text-sm text-muted max-w-lg leading-relaxed mb-10 font-mono">
          Computer vision powered movement analysis that runs directly in your browser.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <button
            id="start-analysis-btn"
            onClick={() => navigate('/analysis')}
            className="btn-primary px-8 py-3.5 text-sm tracking-wider font-mono font-bold group"
          >
            <span className="relative z-10 flex items-center gap-2">
              <svg
                width="16" height="16" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" strokeWidth="2.5"
                className="group-hover:translate-x-0.5 transition-transform"
              >
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              START ANALYSIS
            </span>
          </button>

          <button
            onClick={() => navigate('/history')}
            className="btn-ghost px-6 py-3.5 text-sm font-mono text-slate-300 hover:text-slate-100"
          >
            VIEW HISTORY
          </button>
        </div>

        {/* Supported movements */}
        <div className="mt-10 flex flex-col items-center gap-2">
          <p className="text-[10px] font-mono uppercase text-muted tracking-wider">Supported movement</p>
          <div className="flex gap-2 font-mono">
            <span className="glass-accent px-4 py-1.5 rounded-full text-xs font-bold text-accent tracking-wider">
              SQUAT ANALYSIS
            </span>
          </div>
        </div>
      </section>

      {/* ── 3 Core Capabilities Grid ───────────────────────────────────────── */}
      <section className="relative z-10 border-t border-surface-400/30 px-8 py-10 font-mono">
        <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-5">
          {CAPABILITIES.map((c) => (
            <div key={c.label} className="glass rounded-xl p-5 space-y-2 border border-surface-400/30 hover:border-accent/40 transition-colors">
              <span className="text-2xl">{c.icon}</span>
              <h3 className="text-xs font-bold text-accent tracking-wider uppercase">{c.label}</h3>
              <p className="text-xs text-muted leading-relaxed font-sans">{c.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Privacy Statement Footer ────────────────────────────────────────── */}
      <footer className="relative z-10 px-8 py-5 border-t border-surface-400/20 text-center font-mono text-xs text-muted space-y-1">
        <p>
          🔒 Your camera feed stays on your device. Pose detection runs locally in your browser. MotionLab does not upload or store your video.
        </p>
        <p className="text-[10px] text-muted/60">
          © 2026 MotionLab · Computer Vision Biomechanical Fitness Analysis
        </p>
      </footer>
    </main>
  )
}

const CAPABILITIES = [
  {
    icon: '🎯',
    label: 'REAL-TIME POSE ANALYSIS',
    desc: '33 2D pose landmarks computed in browser at 30+ FPS with zero video uploaded.',
  },
  {
    icon: '📐',
    label: 'FORM FEEDBACK',
    desc: 'Transparent rule-based form evaluation for depth, knee tracking, torso lean, & balance stability.',
  },
  {
    icon: '📊',
    label: 'WORKOUT ANALYTICS',
    desc: 'Rep phase tracking, full/partial squat validation, MET calorie estimates, and local history.',
  },
]
