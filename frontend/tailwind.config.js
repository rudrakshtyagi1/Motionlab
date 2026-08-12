/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      // ── Color System ──────────────────────────────────────────────────────────
      colors: {
        // Base dark background palette
        surface: {
          DEFAULT: '#080c14',  // deepest background
          100: '#0d1322',      // card backgrounds
          200: '#111827',      // slightly lighter surface
          300: '#1a2234',      // hover / interactive surfaces
          400: '#22304a',      // borders, dividers
        },
        // Primary accent — electric cyan (CV/AI feel)
        accent: {
          DEFAULT: '#00d4ff',
          dim: '#0099bb',
          glow: 'rgba(0, 212, 255, 0.15)',
        },
        // Secondary accent — violet
        violet: {
          DEFAULT: '#7c3aed',
          light: '#a78bfa',
          glow: 'rgba(124, 58, 237, 0.15)',
        },
        // Status colors
        good: '#22c55e',
        warn: '#f59e0b',
        danger: '#ef4444',
        muted: '#64748b',
      },

      // ── Typography ────────────────────────────────────────────────────────────
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        display: ['Inter', 'system-ui', 'sans-serif'],
      },

      // ── Background Images ─────────────────────────────────────────────────────
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'grid-pattern': 'linear-gradient(rgba(0,212,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.03) 1px, transparent 1px)',
      },

      // ── Animations ────────────────────────────────────────────────────────────
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.5s ease-out forwards',
        'slide-up': 'slideUp 0.5s ease-out forwards',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 5px rgba(0,212,255,0.3)' },
          '50%': { boxShadow: '0 0 20px rgba(0,212,255,0.6)' },
        },
      },

      // ── Box Shadows ───────────────────────────────────────────────────────────
      boxShadow: {
        'glow-accent': '0 0 20px rgba(0, 212, 255, 0.3)',
        'glow-violet': '0 0 20px rgba(124, 58, 237, 0.3)',
        'glass': '0 4px 30px rgba(0, 0, 0, 0.4)',
      },

      // ── Border Radius ─────────────────────────────────────────────────────────
      borderRadius: {
        'xl': '12px',
        '2xl': '16px',
        '3xl': '24px',
      },
    },
  },
  plugins: [],
}
