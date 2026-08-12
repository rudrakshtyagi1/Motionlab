/**
 * repCounter.ts — MotionLab repetition counter & depth classification validator.
 *
 * Uses depthAnalyzer.ts to classify reps into FULL, PARTIAL, or SHALLOW attempts.
 *
 * Sequence Validation:
 *   STANDING → DESCENDING → DEPTH_CHECK → ASCENDING → STANDING
 *
 * Rules:
 *   - FULL depth (kneeAngle <= 100°) -> validReps++, repCount++ (Valid Rep)
 *   - PARTIAL depth (kneeAngle 101°–120°) -> partialReps++, incompleteCount++ (Partial Rep)
 *   - SHALLOW depth (kneeAngle > 120°) -> shallowReps++, incompleteCount++ (Shallow Rep)
 */

import type { SquatStateResult } from '@/types/analysis'
import type { RepRecord, RepProgress, RepCounterResult } from '@/types/session'
import { classifyDepth, SQUAT_CONFIG } from '@/services/depthAnalyzer'

export class RepCounter {
  private config = SQUAT_CONFIG
  private repCount = 0 // valid full reps count
  private validCount = 0
  private partialCount = 0
  private shallowCount = 0
  private totalAttempts = 0
  private incompleteCount = 0

  private progress: RepProgress = 'IDLE'
  private history: RepRecord[] = []

  // Active rep tracking state
  private repStartTime = 0
  private repBottomTime: number | null = null
  private minKneeAngle = 180
  private depthHitFrameCount = 0

  constructor(customConfig?: Partial<typeof SQUAT_CONFIG>) {
    if (customConfig) {
      this.config = { ...SQUAT_CONFIG, ...customConfig }
    }
  }

  /**
   * update — Process a state machine result and update repetition counts.
   */
  update(stateResult: SquatStateResult, timestamp = performance.now()): RepCounterResult {
    let repCompleted = false

    const knee = stateResult.kneeAngle

    // 1. Track minimum knee angle & depth hit count during active attempt
    if (knee !== null && knee >= 50 && knee <= 180 && this.progress !== 'IDLE') {
      if (knee < this.minKneeAngle) {
        this.minKneeAngle = knee
      }
      if (knee <= this.config.fullDepthKneeAngleMax) {
        this.depthHitFrameCount++
      }
    }

    const { state, transition } = stateResult

    // Handle UNAVAILABLE (pose tracking lost mid-rep)
    if (state === 'UNAVAILABLE') {
      if (this.progress !== 'IDLE') {
        this.resetAttemptState()
      }
      return this.getResult(false)
    }

    // ── 2. State Transition Consumption ────────────────────────────────────

    // Start of descent
    if (
      this.progress === 'IDLE' &&
      (state === 'DESCENDING' || (transition && transition.to === 'DESCENDING'))
    ) {
      this.progress = 'DESCENDING'
      this.repStartTime = timestamp
      const validKnee = knee !== null && knee >= 50 && knee <= 180
      this.minKneeAngle = validKnee ? knee! : 180
      this.depthHitFrameCount = (validKnee && knee! <= this.config.fullDepthKneeAngleMax) ? 1 : 0
    }

    // Reaching bottom / deep squat zone
    if (
      (this.progress === 'DESCENDING' || this.progress === 'IDLE') &&
      (state === 'BOTTOM' || (transition && transition.to === 'BOTTOM'))
    ) {
      if (this.progress === 'IDLE') {
        this.repStartTime = timestamp
      }
      this.progress = 'REACHED_BOTTOM'
      this.repBottomTime = timestamp
    }

    // Ascending from descent / bottom
    if (
      (this.progress === 'REACHED_BOTTOM' || this.progress === 'DESCENDING' || this.progress === 'ASCENDING') &&
      (state === 'ASCENDING' || (transition && transition.to === 'ASCENDING'))
    ) {
      this.progress = 'ASCENDING'
    }

    // ── 3. Rep Completion / Rejection Evaluation ────────────────────────────
    // User returned to STANDING after descending
    if (
      this.progress !== 'IDLE' &&
      (state === 'STANDING' || (transition && transition.to === 'STANDING'))
    ) {
      const endTime = timestamp
      const durationMs = Math.max(0, endTime - this.repStartTime)
      const bottomKneeAngle = Math.round(this.minKneeAngle * 10) / 10

      // Classify depth via dedicated depthAnalyzer module
      const depthEval = classifyDepth(bottomKneeAngle)

      // Require full depth AND at least minDepthFrames for noise immunity
      const isFullValid = depthEval.classification === 'FULL' && this.depthHitFrameCount >= this.config.minDepthFrames

      this.totalAttempts++

      if (isFullValid) {
        // VALID FULL SQUAT
        this.repCount++
        this.validCount++
        repCompleted = true

        const record: RepRecord = {
          index:               this.repCount,
          repNumber:           this.repCount,
          startTime:           this.repStartTime,
          bottomTime:          this.repBottomTime || (this.repStartTime + durationMs / 2),
          endTime,
          durationMs,
          bottomKneeAngle,
          depthScore:          depthEval.depthScore,
          depthClassification: 'FULL',
          isCompleted:         true,
          isFullValidDepth:    true,
        }

        this.history.push(record)
      } else {
        // INCOMPLETE / PARTIAL / SHALLOW SQUAT ATTEMPT
        this.incompleteCount++

        const classification: 'PARTIAL' | 'SHALLOW' =
          bottomKneeAngle <= this.config.partialDepthKneeAngleMax ? 'PARTIAL' : 'SHALLOW'

        if (classification === 'PARTIAL') this.partialCount++
        else this.shallowCount++

        const record: RepRecord = {
          index:               this.totalAttempts,
          repNumber:           this.history.length + 1,
          startTime:           this.repStartTime,
          bottomTime:          this.repBottomTime || (this.repStartTime + durationMs / 2),
          endTime,
          durationMs,
          bottomKneeAngle,
          depthScore:          depthEval.depthScore,
          depthClassification: classification,
          isCompleted:         false,
          isFullValidDepth:    false,
          rejectionReason:     `${classification === 'PARTIAL' ? 'Partial squat depth' : 'Shallow attempt'} (${bottomKneeAngle}°)`,
        }

        this.history.push(record)
      }

      this.resetAttemptState()
    }

    return this.getResult(repCompleted)
  }

  private resetAttemptState(): void {
    this.progress = 'IDLE'
    this.repStartTime = 0
    this.repBottomTime = null
    this.minKneeAngle = 180
    this.depthHitFrameCount = 0
  }

  private getResult(repCompleted: boolean): RepCounterResult {
    return {
      repCount:        this.repCount,
      validCount:      this.validCount,
      partialCount:    this.partialCount,
      shallowCount:    this.shallowCount,
      totalAttempts:   this.totalAttempts,
      incompleteCount: this.incompleteCount,
      repCompleted,
      currentProgress: this.progress,
      latestRep:       this.history.length > 0 ? this.history[this.history.length - 1] : null,
      history:         [...this.history],
    }
  }

  public getRepCount(): number {
    return this.repCount
  }

  public getValidCount(): number {
    return this.validCount
  }

  public getPartialCount(): number {
    return this.partialCount
  }

  public getShallowCount(): number {
    return this.shallowCount
  }

  public getTotalAttempts(): number {
    return this.totalAttempts
  }

  public getIncompleteCount(): number {
    return this.incompleteCount
  }

  public getHistory(): RepRecord[] {
    return [...this.history]
  }

  public getLatestRep(): RepRecord | null {
    return this.history.length > 0 ? this.history[this.history.length - 1] : null
  }

  public getProgress(): RepProgress {
    return this.progress
  }

  public reset(): void {
    this.repCount = 0
    this.validCount = 0
    this.partialCount = 0
    this.shallowCount = 0
    this.totalAttempts = 0
    this.incompleteCount = 0
    this.resetAttemptState()
    this.history = []
  }
}
