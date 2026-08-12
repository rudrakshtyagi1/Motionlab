import { useNavigate } from 'react-router-dom'

/**
 * Landing — MotionLab home screen.
 *
 * Step 1: Premium scaffold with navigation to the (placeholder) Analysis page.
 * Steps 3–12 will add exercise cards, privacy notice, and real analytics data.
 */
export default function Landing() {
  const navigate = useNavigate()

  return (
    <main className="relative min-h-screen bg-surface text-slate-100 overflow-hidden flex flex-col">

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
      {/* Top-center radial glow — primary accent */}
      <div
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] opacity-20"
        aria-hidden="true"
        style={{
          background: 'radial-gradient(ellipse at center top, #00d4ff 0%, transparent 70%)',
        }}
      />
      {/* Bottom-right violet glow */}
      <div
        className="pointer-events-none absolute bottom-0 right-0 w-[600px] h-[400px] opacity-10"
        aria-hidden="true"
        style={{
          background: 'radial-gradient(ellipse at bottom right, #7c3aed 0%, transparent 70%)',
        }}
      />

      {/* ── Top nav bar ────────────────────────────────────────────────────── */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-5 border-b border-surface-400/30">
        <div className="flex items-center gap-3">
          {/* Wordmark */}
          <span className="font-mono font-bold text-lg tracking-[0.2em] text-accent">
            MOTION<span className="text-slate-100">LAB</span>
          </span>
          {/* Build badge */}
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-surface-300 border border-surface-400 text-xs font-mono text-muted">
            <span className="status-dot bg-warn animate-pulse-slow" />
            v0.1 · SCAFFOLD
          </span>
        </div>

        <div className="flex items-center gap-4 text-sm text-muted">
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-accent transition-colors"
          >
            GitHub
          </a>
          <a href="/docs" className="hover:text-accent transition-colors">
            Docs
          </a>
        </div>
      </nav>

      {/* ── Hero section ───────────────────────────────────────────────────── */}
      <section className="relative z-10 flex flex-col items-center justify-center flex-1 px-6 pt-20 pb-32 text-center">

        {/* Eyebrow label */}
        <div className="inline-flex items-center gap-2 mb-6 px-4 py-1.5 rounded-full glass border border-accent/20 text-xs font-mono tracking-widest text-accent uppercase">
          <span className="status-dot bg-accent animate-pulse-slow" />
          Real-time Computer Vision
        </div>

        {/* Main heading */}
        <h1 className="text-7xl sm:text-8xl font-black tracking-tight mb-5 leading-none">
          <span className="text-gradient">MOTION</span>
          <span className="text-slate-100">LAB</span>
        </h1>

        {/* Sub-heading */}
        <p className="text-xl sm:text-2xl text-slate-400 font-light mb-4 max-w-xl leading-relaxed">
          Real-time human movement intelligence.
        </p>
        <p className="text-sm text-muted max-w-md leading-relaxed mb-12">
          Webcam-based pose estimation · Joint angle analysis · Rep counting ·
          Rule-based form coaching · Designed for ML extensibility
        </p>

        {/* Primary CTA */}
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <button
            id="start-analysis-btn"
            onClick={() => navigate('/analysis')}
            className="btn-primary group"
          >
            <span className="relative z-10 flex items-center gap-2">
              <svg
                width="16" height="16" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" strokeWidth="2.5"
                className="group-hover:translate-x-0.5 transition-transform"
              >
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              Start Analysis
            </span>
          </button>

          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-ghost"
          >
            View Architecture
          </a>
        </div>

        {/* Supported movements */}
        <div className="mt-12 flex flex-col items-center gap-3">
          <p className="label-mono text-muted/60">Supported movements</p>
          <div className="flex gap-3">
            <span className="glass-accent px-4 py-1.5 rounded-full text-xs font-mono text-accent tracking-wider">
              SQUAT
            </span>
            <span className="glass px-4 py-1.5 rounded-full text-xs font-mono text-muted tracking-wider opacity-40">
              DEADLIFT · SOON
            </span>
            <span className="glass px-4 py-1.5 rounded-full text-xs font-mono text-muted tracking-wider opacity-40">
              LUNGE · SOON
            </span>
          </div>
        </div>
      </section>

      {/* ── Feature strip ──────────────────────────────────────────────────── */}
      <section className="relative z-10 border-t border-surface-400/30 px-8 py-10">
        <div className="max-w-5xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-6">
          {FEATURES.map((f) => (
            <div key={f.label} className="glass rounded-xl p-5 flex flex-col gap-2 group hover:border-accent/30 transition-colors">
              <span className="text-2xl">{f.icon}</span>
              <p className="text-sm font-semibold text-slate-200">{f.label}</p>
              <p className="text-xs text-muted leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Privacy notice ─────────────────────────────────────────────────── */}
      <footer className="relative z-10 px-8 py-5 border-t border-surface-400/20 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted">
        <p>
          🔒 Your camera feed is processed{' '}
          <strong className="text-slate-400">locally in your browser</strong>. No
          video is uploaded or stored by default.
        </p>
        <p className="font-mono">© 2025 MotionLab</p>
      </footer>
    </main>
  )
}

/* ── Static data ─────────────────────────────────────────────────────────────── */
const FEATURES = [
  {
    icon: '🎯',
    label: 'Pose Estimation',
    desc: 'MediaPipe BlazePose — 33 body landmarks at 30+ FPS, entirely in-browser.',
  },
  {
    icon: '📐',
    label: 'Angle Analysis',
    desc: 'Precise geometric calculation of knee, hip, and torso joint angles.',
  },
  {
    icon: '🔁',
    label: 'Rep Counting',
    desc: 'State-machine–based counting requiring a complete valid movement cycle.',
  },
  {
    icon: '🧠',
    label: 'Form Coaching',
    desc: 'Rule-based feedback now. Designed for custom ML classifier integration.',
  },
]
