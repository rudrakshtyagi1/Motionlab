/**
 * squatStateMachine.ts — Temporal state machine for squat movement phase recognition.
 *
 * ──────────────────────────────────────────────────────────────────────────────
 * ARCHITECTURAL RESPONSIBILITY
 * ──────────────────────────────────────────────────────────────────────────────
 * Given frame-by-frame biomechanical features from `featureExtractor.ts`, this
 * state machine determines the CURRENT MOVEMENT PHASE:
 *
 *   STANDING → DESCENDING → BOTTOM → ASCENDING → STANDING
 *
 * IMPORTANT DESIGN PRINCIPLE:
 *  - This state machine does NOT count repetitions.
 *  - Its ONLY job is movement phase recognition.
 *  - Repetition counting is handled separately in Step 7 by consuming
 *    the transition events emitted by this state machine.
 *
 * Threshold note:
 *  The threshold angles (e.g., 160° standing, 100° bottom depth) are heuristic
 *  defaults suited for webcam pose estimation, fully configurable via SquatConfig.
 * ──────────────────────────────────────────────────────────────────────────────
 */

import type {
  SquatFeatures,
  SquatState,
  MovementDirection,
  SquatStateResult,
  SquatStateTransition,
} from '@/types/analysis'

// ─── Configuration ────────────────────────────────────────────────────────────

export interface SquatConfig {
  /** Knee angle above which the user is considered standing extended (default 160°) */
  standingAngle: number
  /** Hysteresis margin subtracted from standingAngle for leaving standing state (default 5°) */
  standingHysteresis: number
  /** Knee angle threshold for reaching squat depth (default 100°) */
  bottomAngle: number
  /** Hysteresis margin added to bottomAngle for leaving bottom state (default 5°) */
  bottomHysteresis: number
  /** Minimum angle delta between frames to classify direction as DOWN or UP (default 1.5°) */
  movementThreshold: number
  /** Minimum consecutive frames a state condition must hold to commit transition (default 2) */
  minStateFrames: number
}

/** Default heuristic configuration */
export const DEFAULT_SQUAT_CONFIG: SquatConfig = {
  standingAngle: 160,
  standingHysteresis: 5,
  bottomAngle: 100,
  bottomHysteresis: 5,
  movementThreshold: 1.5,
  minStateFrames: 2,
}

// ─── State Machine Class ──────────────────────────────────────────────────────

export class SquatStateMachine {
  private config: SquatConfig
  private currentState: SquatState = 'STANDING'
  private previousState: SquatState = 'STANDING'
  private lastKneeAngle: number | null = null
  private pendingState: SquatState | null = null
  private pendingFrameCount = 0

  constructor(configOverrides?: Partial<SquatConfig>) {
    this.config = { ...DEFAULT_SQUAT_CONFIG, ...configOverrides }
  }

  /**
   * update — Process a new frame's features and return updated squat state.
   *
   * @param features - SquatFeatures object from featureExtractor.ts
   * @returns SquatStateResult with current state, direction, and transition data
   */
  update(features: SquatFeatures): SquatStateResult {
    const timestamp = features.timestamp ?? performance.now()

    // Representative knee angle: use average, or fallback to single side
    const kneeAngle = features.kneeAngle ?? features.leftKneeAngle ?? features.rightKneeAngle

    // If landmarks are missing or unreliable, transition to UNAVAILABLE
    if (kneeAngle === null || !features.isReliable) {
      const changed = this.currentState !== 'UNAVAILABLE'
      const prevState = this.currentState
      if (changed) {
        this.previousState = this.currentState
        this.currentState = 'UNAVAILABLE'
      }
      this.lastKneeAngle = null
      this.pendingState = null
      this.pendingFrameCount = 0

      return {
        state: 'UNAVAILABLE',
        previousState: prevState,
        kneeAngle: null,
        direction: 'NONE',
        changed,
        transition: changed
          ? { from: prevState, to: 'UNAVAILABLE', timestamp }
          : undefined,
      }
    }

    // ── 1. Calculate movement direction & delta ─────────────────────────────
    let direction: MovementDirection = 'NONE'
    if (this.lastKneeAngle !== null) {
      const delta = kneeAngle - this.lastKneeAngle
      if (delta < -this.config.movementThreshold) {
        direction = 'DOWN' // Knee flexing (angle decreasing)
      } else if (delta > this.config.movementThreshold) {
        direction = 'UP' // Knee extending (angle increasing)
      } else {
        direction = 'HOLD' // Static / noise within deadband
      }
    } else {
      direction = kneeAngle >= this.config.standingAngle ? 'NONE' : 'HOLD'
    }

    // ── 2. Determine target next state based on current state & rules ───────
    let targetState = this.currentState

    // Recovering from UNAVAILABLE
    if (this.currentState === 'UNAVAILABLE') {
      if (kneeAngle >= this.config.standingAngle - this.config.standingHysteresis) {
        targetState = 'STANDING'
      } else if (kneeAngle <= this.config.bottomAngle) {
        targetState = 'BOTTOM'
      } else {
        targetState = direction === 'UP' ? 'ASCENDING' : 'DESCENDING'
      }
    } else {
      switch (this.currentState) {
        case 'STANDING':
          // Transition to DESCENDING when knee angle drops below (standingAngle - hysteresis) AND direction is DOWN
          if (
            kneeAngle < (this.config.standingAngle - this.config.standingHysteresis) &&
            (direction === 'DOWN' || direction === 'HOLD')
          ) {
            targetState = 'DESCENDING'
          }
          break

        case 'DESCENDING':
          // Transition to BOTTOM when reaching deep squat threshold
          if (kneeAngle <= this.config.bottomAngle) {
            targetState = 'BOTTOM'
          }
          // Transition to ASCENDING if user starts moving back UP before reaching bottom (incomplete squat)
          else if (direction === 'UP' && this.lastKneeAngle !== null && (kneeAngle - this.lastKneeAngle) >= this.config.movementThreshold) {
            targetState = 'ASCENDING'
          }
          // Return to STANDING if fully extended
          else if (kneeAngle >= this.config.standingAngle) {
            targetState = 'STANDING'
          }
          break

        case 'BOTTOM':
          // Transition to ASCENDING when knee angle rises above (bottomAngle + hysteresis) AND direction is UP
          if (
            kneeAngle > (this.config.bottomAngle + this.config.bottomHysteresis) &&
            (direction === 'UP' || direction === 'HOLD')
          ) {
            targetState = 'ASCENDING'
          }
          break

        case 'ASCENDING':
          // Transition to STANDING when fully extended (kneeAngle >= standingAngle)
          if (kneeAngle >= this.config.standingAngle) {
            targetState = 'STANDING'
          }
          // Transition back to DESCENDING if user drops back down mid-ascent
          else if (direction === 'DOWN' && this.lastKneeAngle !== null && (this.lastKneeAngle - kneeAngle) >= this.config.movementThreshold) {
            targetState = 'DESCENDING'
          }
          break
      }
    }

    // ── 3. Apply min-frame debouncing to prevent single-frame noise jumps ─────
    let committedState = this.currentState
    let stateChanged = false

    if (targetState !== this.currentState) {
      if (this.pendingState === targetState) {
        this.pendingFrameCount++
      } else {
        this.pendingState = targetState
        this.pendingFrameCount = 1
      }

      if (this.pendingFrameCount >= this.config.minStateFrames) {
        committedState = targetState
        stateChanged = true
        this.pendingState = null
        this.pendingFrameCount = 0
      }
    } else {
      this.pendingState = null
      this.pendingFrameCount = 0
    }

    const prevState = this.currentState
    if (stateChanged) {
      this.previousState = this.currentState
      this.currentState = committedState
    }

    this.lastKneeAngle = kneeAngle

    let transition: SquatStateTransition | undefined
    if (stateChanged) {
      transition = {
        from: prevState,
        to: committedState,
        timestamp,
      }
    }

    return {
      state: this.currentState,
      previousState: prevState,
      kneeAngle,
      direction,
      changed: stateChanged,
      transition,
    }
  }

  /** Current state getter */
  getState(): SquatState {
    return this.currentState
  }

  /** Previous state getter */
  getPreviousState(): SquatState {
    return this.previousState
  }

  /** Active config getter */
  getConfig(): SquatConfig {
    return { ...this.config }
  }

  /** Reset state machine to clean initial state */
  reset(): void {
    this.currentState = 'STANDING'
    this.previousState = 'STANDING'
    this.lastKneeAngle = null
    this.pendingState = null
    this.pendingFrameCount = 0
  }
}
