/**
 * setup.ts — Vitest global test setup.
 *
 * Runs before every test file.
 * Extends vitest's expect with @testing-library/jest-dom matchers
 * (e.g. toBeInTheDocument, toHaveClass, etc.).
 */
import '@testing-library/jest-dom'
