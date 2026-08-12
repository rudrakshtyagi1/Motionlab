/**
 * camera.ts — Camera state and error type definitions.
 *
 * Centralizes all camera-related types so that the hook, component,
 * and any tests speak the same vocabulary.
 */

// ─── Error Classification ─────────────────────────────────────────────────────

/**
 * Structured camera error types.
 *
 * We map raw browser DOMException names/messages to this enum so that
 * the UI can display helpful, context-aware messages rather than raw
 * technical error strings.
 */
export type CameraErrorType =
  | 'PERMISSION_DENIED'   // User denied the permission prompt
  | 'NOT_FOUND'           // No camera hardware detected
  | 'IN_USE'              // Camera locked by another application
  | 'NOT_ALLOWED'         // Policy or secure-context restriction
  | 'UNSUPPORTED'         // getUserMedia API not available (old browser)
  | 'UNKNOWN'             // Anything else

/**
 * User-facing messages for each error type.
 * Imported by CameraView to display contextual help text.
 */
export const CAMERA_ERROR_MESSAGES: Record<CameraErrorType, { title: string; detail: string }> = {
  PERMISSION_DENIED: {
    title: 'Camera permission denied',
    detail: 'Allow camera access in your browser settings, then try again.',
  },
  NOT_FOUND: {
    title: 'No camera detected',
    detail: 'Connect a webcam and try again.',
  },
  IN_USE: {
    title: 'Camera already in use',
    detail: 'Another application is using your camera. Close it and try again.',
  },
  NOT_ALLOWED: {
    title: 'Camera access not allowed',
    detail: 'Camera access is restricted in this context. Ensure the page is served over HTTPS.',
  },
  UNSUPPORTED: {
    title: 'Browser not supported',
    detail: 'Your browser does not support camera access. Try Chrome 90+, Firefox 89+, or Safari 15+.',
  },
  UNKNOWN: {
    title: 'Camera error',
    detail: 'An unexpected camera error occurred. Please try again.',
  },
}

// ─── Camera State ─────────────────────────────────────────────────────────────

export type CameraStatus =
  | 'IDLE'        // Not yet started
  | 'REQUESTING'  // getUserMedia() in flight
  | 'ACTIVE'      // Stream live, video playing
  | 'STOPPED'     // Cleanly stopped by user
  | 'ERROR'       // Failed — see error field

export interface CameraError {
  type: CameraErrorType
  /** The original DOMException, preserved for debugging */
  raw?: unknown
}

/**
 * Full camera state — returned by the useCamera hook.
 */
export interface CameraState {
  status:    CameraStatus
  stream:    MediaStream | null
  error:     CameraError | null
  /** Convenience boolean — true only when status === 'ACTIVE' */
  isActive:  boolean
  /** Convenience boolean — true when status === 'REQUESTING' */
  isLoading: boolean
}
