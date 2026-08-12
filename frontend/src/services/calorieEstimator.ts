/**
 * calorieEstimator.ts — MET-based calorie burn estimation service.
 *
 *RATIONALE:
 *  - Calorie expenditure is an ESTIMATE based on body weight, active workout duration,
 *    and standard Exercise Physiology MET (Metabolic Equivalent of Task) values.
 *  - It is NOT a medical measurement.
 */

export const CALORIE_CONFIG = {
  squatMET: 5.0, // MET for vigorous bodyweight resistance squats
  lightSquatMET: 3.5,
  vigorousSquatMET: 6.0,
}

export interface CalorieEstimateInput {
  weightKg: number | null | undefined
  durationSeconds: number
  exerciseType?: string
  intensity?: 'light' | 'moderate' | 'vigorous'
}

export interface CalorieEstimateResult {
  calories: number | null
  confidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'GENERIC'
  method: string
  displayString: string
  disclaimer: string
}

/**
 * estimateCalories — Computes estimated calorie expenditure from body weight & active duration.
 */
export function estimateCalories(input: CalorieEstimateInput): CalorieEstimateResult {
  const disclaimer = 'Calories are estimates based on active workout duration and body weight. Not a medical measurement.'
  const durationSeconds = Math.max(0, input.durationSeconds)

  if (durationSeconds <= 0) {
    return {
      calories: null,
      confidence: 'LOW',
      method: 'MET formula',
      displayString: '—',
      disclaimer,
    }
  }

  const weightKg = input.weightKg && input.weightKg > 0 ? input.weightKg : null

  if (!weightKg) {
    return {
      calories: null,
      confidence: 'GENERIC',
      method: 'Unweighted fallback',
      displayString: 'Add weight in Profile for estimate',
      disclaimer: 'Add your weight in Profile for a personalized calorie burn estimate.',
    }
  }

  // Select MET based on intensity
  let met = CALORIE_CONFIG.squatMET
  if (input.intensity === 'light') met = CALORIE_CONFIG.lightSquatMET
  else if (input.intensity === 'vigorous') met = CALORIE_CONFIG.vigorousSquatMET

  // MET Formula: Calories = MET * weightKg * (durationSeconds / 3600)
  const durationHours = durationSeconds / 3600
  const rawCalories = met * weightKg * durationHours
  const roundedCalories = Math.round(rawCalories * 10) / 10

  return {
    calories: roundedCalories,
    confidence: 'HIGH',
    method: 'MET formula (5.0 MET)',
    displayString: `~${roundedCalories} kcal`,
    disclaimer,
  }
}
