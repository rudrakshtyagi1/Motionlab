/**
 * useCamera.ts — Browser webcam access hook.
 *
 * Responsibilities:
 *  1. Request camera permission via navigator.mediaDevices.getUserMedia()
 *  2. Attach the MediaStream to a <video> element via srcObject
 *  3. Sync srcObject & play state on DOM element mount / state changes
 *  4. Expose reactive state: status, isActive, isLoading, error
 *  5. Cleanly stop all MediaStream tracks on stopCamera() or unmount
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import type { CameraErrorType, CameraState } from '@/types/camera'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function classifyError(err: unknown): CameraErrorType {
  if (!(err instanceof Error)) return 'UNKNOWN'

  const name = (err as DOMException).name ?? ''

  switch (name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
      return 'PERMISSION_DENIED'

    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return 'NOT_FOUND'

    case 'NotReadableError':
    case 'TrackStartError':
      return 'IN_USE'

    case 'SecurityError':
      return 'NOT_ALLOWED'

    default:
      return 'UNKNOWN'
  }
}

function stopAllTracks(stream: MediaStream | null): void {
  if (!stream) return
  stream.getTracks().forEach((track) => track.stop())
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface UseCameraReturn {
  videoRef:    React.RefObject<HTMLVideoElement>
  state:       CameraState
  startCamera: () => Promise<void>
  stopCamera:  () => void
}

export function useCamera(): UseCameraReturn {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [state, setState] = useState<CameraState>({
    status:    'IDLE',
    stream:    null,
    error:     null,
    isActive:  false,
    isLoading: false,
  })

  // ── Sync effect: guarantees srcObject & play() on the current <video> element ──
  useEffect(() => {
    const video = videoRef.current
    const stream = streamRef.current

    if (video && stream && state.status === 'ACTIVE') {
      if (video.srcObject !== stream) {
        video.srcObject = stream
      }
      if (video.paused) {
        video.play().catch(err => {
          if (import.meta.env.DEV) {
            console.warn('[useCamera] play error on sync:', err)
          }
        })
      }
    }
  }, [state.status, state.stream])

  // ── Start ────────────────────────────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    if (state.status === 'ACTIVE' || state.status === 'REQUESTING') return

    if (!navigator?.mediaDevices?.getUserMedia) {
      setState({
        status: 'ERROR',
        stream: null,
        error:  { type: 'UNSUPPORTED' },
        isActive:  false,
        isLoading: false,
      })
      return
    }

    setState(s => ({ ...s, status: 'REQUESTING', error: null, isLoading: true }))

    let stream: MediaStream

    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width:  { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
        audio: false,
      })
    } catch (err) {
      const errorType = classifyError(err)
      setState({
        status: 'ERROR',
        stream: null,
        error:  { type: errorType, raw: err },
        isActive:  false,
        isLoading: false,
      })
      return
    }

    streamRef.current = stream

    // Assign srcObject to video element if available
    const video = videoRef.current
    if (video) {
      video.srcObject = stream
      try {
        await video.play()
      } catch (err) {
        if (import.meta.env.DEV) {
          console.warn('[useCamera] video.play() initial call error:', err)
        }
      }
    }

    setState({
      status:    'ACTIVE',
      stream,
      error:     null,
      isActive:  true,
      isLoading: false,
    })
  }, [state.status])

  // ── Stop ─────────────────────────────────────────────────────────────────────
  const stopCamera = useCallback(() => {
    stopAllTracks(streamRef.current)
    streamRef.current = null

    if (videoRef.current) {
      videoRef.current.srcObject = null
    }

    setState({
      status:    'STOPPED',
      stream:    null,
      error:     null,
      isActive:  false,
      isLoading: false,
    })
  }, [])

  // ── Cleanup on unmount ────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      stopAllTracks(streamRef.current)
      streamRef.current = null
    }
  }, [])

  return { videoRef, state, startCamera, stopCamera }
}
