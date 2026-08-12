/**
 * sessionRecorder.ts — Optional opt-in landmark sequence recorder.
 *
 * When enabled by the user, saves anonymized numerical landmark data
 * (never raw video) to the backend for future ML training.
 *
 * Data format: JSONL with { timestamp, landmarks, metadata }
 * Stored under: backend/data/squat/good/ or backend/data/squat/bad/
 *
 * Recording is OFF by default. The user must explicitly enable it.
 *
 * IMPLEMENTED IN STEP 10 / STEP 11.
 */

// Placeholder export so TypeScript resolves imports during Steps 1–9.
export {}
