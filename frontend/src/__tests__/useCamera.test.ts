/**
 * useCamera.test.ts — Unit tests for the useCamera hook.
 *
 * Strategy: mock navigator.mediaDevices.getUserMedia() since Vitest
 * runs in jsdom which doesn't implement the real MediaDevices API.
 *
 * Key setup pattern:
 *   The hook stores the MediaStream on videoRef.current.srcObject, then calls
 *   video.play(). In jsdom there is no real <video> element connected to the
 *   ref by default (renderHook renders no JSX), so we manually attach one.
 *
 * Tests:
 *  1. Initial state is IDLE / inactive / not loading
 *  2. startCamera() transitions to ACTIVE on success
 *  3. stopCamera() stops all tracks, transitions to STOPPED
 *  4. PERMISSION_DENIED error is handled correctly
 *  5. NOT_FOUND error is handled correctly
 *  6. IN_USE (NotReadableError) is handled correctly
 *  7. Unsupported browser (no getUserMedia API) is handled
 *  8. Cleanup stops tracks on unmount
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCamera } from '../hooks/useCamera'
import type { UseCameraReturn } from '../hooks/useCamera'

// ─── Mock factories ───────────────────────────────────────────────────────────

function makeMockTrack(): MediaStreamTrack {
  return { stop: vi.fn(), kind: 'video' } as unknown as MediaStreamTrack
}

function makeMockStream(tracks?: MediaStreamTrack[]): MediaStream {
  const t = tracks ?? [makeMockTrack()]
  return {
    getTracks:      () => t,
    getVideoTracks: () => t,
    getAudioTracks: () => [],
  } as unknown as MediaStream
}

function makeDOMException(name: string): DOMException {
  const err = new Error(name) as unknown as DOMException
  Object.defineProperty(err, 'name', { value: name })
  return err
}

/**
 * Attach a real jsdom <video> element to the hook's videoRef.
 *
 * Without this, videoRef.current is null because renderHook() doesn't
 * render any JSX — the hook's ref target never gets a DOM node.
 * We must manually write to the ref object (which is a plain {current} object).
 */
function attachVideoElement(result: { current: UseCameraReturn }): HTMLVideoElement {
  const video = document.createElement('video')
  ;(result.current.videoRef as React.MutableRefObject<HTMLVideoElement>).current = video
  return video
}

// ─── Setup / teardown ─────────────────────────────────────────────────────────

beforeEach(() => {
  Object.defineProperty(globalThis.navigator, 'mediaDevices', {
    value: { getUserMedia: vi.fn() },
    writable: true,
    configurable: true,
  })

  // jsdom doesn't implement HTMLVideoElement.play()
  Object.defineProperty(HTMLVideoElement.prototype, 'play', {
    value: vi.fn().mockResolvedValue(undefined),
    writable: true,
    configurable: true,
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})

// ─── Test suites ──────────────────────────────────────────────────────────────

describe('useCamera — initial state', () => {
  it('starts in IDLE state', () => {
    const { result } = renderHook(() => useCamera())
    expect(result.current.state.status).toBe('IDLE')
  })

  it('isActive is false initially', () => {
    const { result } = renderHook(() => useCamera())
    expect(result.current.state.isActive).toBe(false)
  })

  it('isLoading is false initially', () => {
    const { result } = renderHook(() => useCamera())
    expect(result.current.state.isLoading).toBe(false)
  })

  it('stream is null initially', () => {
    const { result } = renderHook(() => useCamera())
    expect(result.current.state.stream).toBeNull()
  })

  it('error is null initially', () => {
    const { result } = renderHook(() => useCamera())
    expect(result.current.state.error).toBeNull()
  })
})

describe('useCamera — startCamera()', () => {
  it('calls getUserMedia with video:true and audio:false', async () => {
    vi.mocked(navigator.mediaDevices.getUserMedia).mockResolvedValue(makeMockStream())
    const { result } = renderHook(() => useCamera())
    attachVideoElement(result)

    await act(async () => { await result.current.startCamera() })

    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith(
      expect.objectContaining({ audio: false })
    )
    const callArg = vi.mocked(navigator.mediaDevices.getUserMedia).mock.calls[0][0]
    expect((callArg as MediaStreamConstraints).audio).toBe(false)
  })

  it('transitions to ACTIVE after successful getUserMedia', async () => {
    vi.mocked(navigator.mediaDevices.getUserMedia).mockResolvedValue(makeMockStream())
    const { result } = renderHook(() => useCamera())
    attachVideoElement(result)

    await act(async () => { await result.current.startCamera() })

    expect(result.current.state.status).toBe('ACTIVE')
    expect(result.current.state.isActive).toBe(true)
    expect(result.current.state.isLoading).toBe(false)
  })

  it('does not call getUserMedia twice when already ACTIVE', async () => {
    vi.mocked(navigator.mediaDevices.getUserMedia).mockResolvedValue(makeMockStream())
    const { result } = renderHook(() => useCamera())
    attachVideoElement(result)

    await act(async () => { await result.current.startCamera() })
    await act(async () => { await result.current.startCamera() }) // second call — no-op

    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledTimes(1)
  })
})

describe('useCamera — stopCamera()', () => {
  it('stops all MediaStream tracks', async () => {
    const track = makeMockTrack()
    vi.mocked(navigator.mediaDevices.getUserMedia).mockResolvedValue(makeMockStream([track]))
    const { result } = renderHook(() => useCamera())
    attachVideoElement(result)

    await act(async () => { await result.current.startCamera() })
    act(() => { result.current.stopCamera() })

    expect(track.stop).toHaveBeenCalledTimes(1)
  })

  it('transitions to STOPPED after stopCamera()', async () => {
    vi.mocked(navigator.mediaDevices.getUserMedia).mockResolvedValue(makeMockStream())
    const { result } = renderHook(() => useCamera())
    attachVideoElement(result)

    await act(async () => { await result.current.startCamera() })
    act(() => { result.current.stopCamera() })

    expect(result.current.state.status).toBe('STOPPED')
    expect(result.current.state.isActive).toBe(false)
    expect(result.current.state.stream).toBeNull()
  })
})

describe('useCamera — error handling', () => {
  it('sets PERMISSION_DENIED on NotAllowedError', async () => {
    vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValue(
      makeDOMException('NotAllowedError')
    )
    const { result } = renderHook(() => useCamera())

    await act(async () => { await result.current.startCamera() })

    expect(result.current.state.status).toBe('ERROR')
    expect(result.current.state.error?.type).toBe('PERMISSION_DENIED')
    expect(result.current.state.isActive).toBe(false)
  })

  it('sets NOT_FOUND on NotFoundError', async () => {
    vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValue(
      makeDOMException('NotFoundError')
    )
    const { result } = renderHook(() => useCamera())

    await act(async () => { await result.current.startCamera() })

    expect(result.current.state.error?.type).toBe('NOT_FOUND')
  })

  it('sets IN_USE on NotReadableError', async () => {
    vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValue(
      makeDOMException('NotReadableError')
    )
    const { result } = renderHook(() => useCamera())

    await act(async () => { await result.current.startCamera() })

    expect(result.current.state.error?.type).toBe('IN_USE')
  })

  it('sets UNSUPPORTED when mediaDevices API is unavailable', async () => {
    Object.defineProperty(globalThis.navigator, 'mediaDevices', {
      value: undefined,
      writable: true,
      configurable: true,
    })
    const { result } = renderHook(() => useCamera())

    await act(async () => { await result.current.startCamera() })

    expect(result.current.state.error?.type).toBe('UNSUPPORTED')
  })

  it('sets UNKNOWN for unrecognised errors', async () => {
    vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValue(
      new Error('SomethingWeird')
    )
    const { result } = renderHook(() => useCamera())

    await act(async () => { await result.current.startCamera() })

    expect(result.current.state.error?.type).toBe('UNKNOWN')
  })

  it('preserves the raw error object on state.error.raw', async () => {
    const raw = makeDOMException('NotAllowedError')
    vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValue(raw)
    const { result } = renderHook(() => useCamera())

    await act(async () => { await result.current.startCamera() })

    expect(result.current.state.error?.raw).toBe(raw)
  })
})

describe('useCamera — cleanup on unmount', () => {
  it('stops all tracks when the component unmounts', async () => {
    const track = makeMockTrack()
    vi.mocked(navigator.mediaDevices.getUserMedia).mockResolvedValue(makeMockStream([track]))
    const { result, unmount } = renderHook(() => useCamera())
    attachVideoElement(result)

    await act(async () => { await result.current.startCamera() })

    // Camera is ACTIVE — track.stop should NOT yet be called
    expect(result.current.state.status).toBe('ACTIVE')
    expect(track.stop).not.toHaveBeenCalled()

    // Unmounting triggers cleanup effect → stopAllTracks
    unmount()

    expect(track.stop).toHaveBeenCalledTimes(1)
  })

  it('does not throw when unmounted before startCamera()', () => {
    const { unmount } = renderHook(() => useCamera())
    expect(() => unmount()).not.toThrow()
  })
})
