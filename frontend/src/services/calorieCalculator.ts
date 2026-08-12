/**
 * calorieCalculator.ts — Standard MET-based calorie burn estimation service.
 *
 * Formula:
 *   Calories / minute = (MET × 3.5 × weightKg) / 200
 *   Total Calories   = Calories / minute × activeDurationMinutes
 *
 * Configurable MET value stored in CALORIE_CONFIG constant.
 * Disclaimer clearly states values are estimates based on active workout duration & body weight.
 */

export const CALORIE_CONFIG = {
  /** MET value for bodyweight squat resistance training */
  squatMET: 5.0,
}

export interface CalorieEstimateResult {
  caloriesBurned: number | null
  isGeneric: boolean
  displayString: string
  disclaimer: string
}

/**
 * calculateCalories — Computes estimated calorie burn based on active duration & body weight.
 *
 * @param durationSeconds Active workout duration in seconds
 * @param weightKg User body weight in kilograms (null if unavailable)
 */
export function calculateCalories(
  durationSeconds: number,
  weightKg: number | null
): CalorieEstimateResult {
  const disclaimer = 'Calorie estimate based on body weight, exercise intensity, and active duration.'

  if (durationSeconds <= 0) {
    return {
      caloriesBurned: null,
      isGeneric: false,
      displayString: '—',
      disclaimer,
    }
  }

  const activeMinutes = durationSeconds / 60
  const effectiveWeight = weightKg && weightKg > 0 ? weightKg : null

  if (!effectiveWeight) {
    return {
      caloriesBurned: null,
      isGeneric: true,
      displayString: 'Add weight for estimate',
      disclaimer: 'Add your weight in Profile for a personalized calorie burn estimate.',
    }
  }

  // Formula: Calories/min = (MET * 3.5 * weightKg) / 200
  const caloriesPerMinute = (CALORIE_CONFIG.squatMET * 3.5 * effectiveWeight) / 200
  const totalCalories = Math.round(caloriesPerMinute * activeMinutes * 10) / 10

  return {
    caloriesBurned: totalCalories,
    isGeneric: false,
    displayString: `~${totalCalories} kcal`,
    disclaimer,
  }
}
