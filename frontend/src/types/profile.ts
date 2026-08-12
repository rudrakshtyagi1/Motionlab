/**
 * profile.ts — User profile and guest mode types.
 */

export type ProfileMode = 'guest' | 'profile'

export interface UserProfile {
  id: string
  mode: ProfileMode
  name: string | null
  weightKg: number | null
  heightCm: number | null
  age: number | null
  gender?: 'male' | 'female' | 'other' | null
  createdAt: string
  updatedAt: string
}
