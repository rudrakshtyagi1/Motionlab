import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// Augment Vite config type to include vitest's `test` field
/// <reference types="vitest" />

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    // Proxy API calls to FastAPI backend during development.
    // This avoids CORS issues in dev — in production, a reverse proxy (nginx/Cloudflare) does the same.
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  // MediaPipe WASM assets are large — increase the warning limit so Vite
  // doesn't incorrectly flag them as performance issues.
  build: {
    chunkSizeWarningLimit: 2000,
  },
  // Allow Vite to serve the MediaPipe .wasm and .task model files correctly.
  assetsInclude: ['**/*.task'],
  optimizeDeps: {
    exclude: ['@mediapipe/tasks-vision'],
  },
  // ── Vitest configuration ────────────────────────────────────────────────────
  test: {
    // Use jsdom to simulate the browser DOM environment.
    // This lets us test hooks and components that rely on browser APIs
    // (e.g. navigator.mediaDevices) with appropriate mocks.
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      reporter: ['text', 'json'],
      include:  ['src/**/*.{ts,tsx}'],
      exclude:  ['src/**/*.d.ts', 'src/main.tsx'],
    },
  },
})
