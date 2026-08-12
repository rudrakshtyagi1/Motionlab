/**
 * PoseSkeleton.tsx — Canvas overlay component for real-time skeleton rendering.
 *
 * ──────────────────────────────────────────────────────────────────────────────
 * ARCHITECTURE
 * ──────────────────────────────────────────────────────────────────────────────
 *  - Positioned absolutely over the <video> element.
 *  - Matches the video's CSS transform (scaleX(-1)) for 1:1 mirror alignment.
 *  - Dynamically resizes internal canvas pixel dimensions (width/height) to match
 *    the active video's intrinsic resolution (e.g., 1280x720).
 *  - Executes a dedicated requestAnimationFrame render loop when camera is active.
 *  - Invokes poseRenderer.renderPose() with zero latency.
 *  - Cleans up and clears canvas on unmount or camera stop.
 * ──────────────────────────────────────────────────────────────────────────────
 */

import { useEffect, useRef } from 'react'
import type { PoseLandmarks } from '@/types/landmarks'
import { renderPose, type PoseRenderOptions } from '@/services/poseRenderer'

export interface PoseSkeletonProps {
  /** Ref to the latest detected pose landmarks (~30-60 FPS) */
  landmarksRef: React.RefObject<PoseLandmarks | null>
  /** Ref to the active webcam <video> element */
  videoRef: React.RefObject<HTMLVideoElement>
  /** Whether camera and pose tracking are currently active */
  isActive: boolean
  /** Optional visual style overrides */
  options?: PoseRenderOptions
}

export default function PoseSkeleton({
  landmarksRef,
  videoRef,
  isActive,
  options,
}: PoseSkeletonProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animFrameRef = useRef<number | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // If not active, clear canvas and cancel loop
    if (!isActive) {
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
      }
      return
    }

    /**
     * renderLoop — per-frame canvas draw function.
     * Synchronized with browser display refresh rate via requestAnimationFrame.
     */
    function renderLoop(): void {
      const video = videoRef.current
      const currentCanvas = canvasRef.current

      if (video && currentCanvas && video.readyState >= 2) {
        // Dynamically align canvas buffer resolution to video stream resolution
        const vWidth = video.videoWidth || 640
        const vHeight = video.videoHeight || 480

        if (currentCanvas.width !== vWidth || currentCanvas.height !== vHeight) {
          currentCanvas.width = vWidth
          currentCanvas.height = vHeight
        }

        const ctx = currentCanvas.getContext('2d')
        if (ctx) {
          renderPose(
            ctx,
            landmarksRef.current,
            currentCanvas.width,
            currentCanvas.height,
            options
          )
        }
      }

      animFrameRef.current = requestAnimationFrame(renderLoop)
    }

    animFrameRef.current = requestAnimationFrame(renderLoop)

    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current)
        animFrameRef.current = null
      }
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
      }
    }
  }, [isActive, landmarksRef, videoRef, options])

  return (
    <canvas
      ref={canvasRef}
      id="motionlab-skeleton-canvas"
      className="absolute inset-0 w-full h-full object-cover pointer-events-none rounded-2xl z-10"
      style={{ transform: 'scaleX(-1)' }}
    />
  )
}
