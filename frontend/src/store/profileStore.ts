/**
 * profileStore.ts — Zustand store for local profile & guest mode management.
 *
 * Persists to localStorage under 'motionlab_profile'.
 * Supports zero-auth Guest Mode and optional local User Profiles.
 */

import { create } from 'zustand'
import type { UserProfile } from '@/types/profile'

const STORAGE_KEY = 'motionlab_profile'

function createDefaultGuestProfile(): UserProfile {
  const guestId = `guest_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`
  return {
    id: guestId,
    mode: 'guest',
    name: null,
    weightKg: null,
    heightCm: null,
    age: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

function loadProfileFromStorage(): UserProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed.id === 'string' && (parsed.mode === 'guest' || parsed.mode === 'profile')) {
        return parsed
      }
    }
  } catch (e) {
    console.warn('[profileStore] Failed to parse local profile:', e)
  }
  const defaultGuest = createDefaultGuestProfile()
  saveProfileToStorage(defaultGuest)
  return defaultGuest
}

function saveProfileToStorage(profile: UserProfile): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile))
  } catch (e) {
    console.warn('[profileStore] Failed to save profile to localStorage:', e)
  }
}

interface ProfileState {
  profile: UserProfile
  setProfile: (profile: UserProfile) => void
  updateProfile: (updates: Partial<UserProfile>) => void
  switchToGuest: () => void
  deleteProfile: () => void
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  profile: loadProfileFromStorage(),

  setProfile: (profile) => {
    saveProfileToStorage(profile)
    set({ profile })
  },

  updateProfile: (updates) => {
    const current = get().profile
    const updated: UserProfile = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString(),
    }
    saveProfileToStorage(updated)
    set({ profile: updated })
  },

  switchToGuest: () => {
    const current = get().profile
    const guest: UserProfile = {
      id: current.mode === 'guest' ? current.id : `guest_${Date.now()}`,
      mode: 'guest',
      name: null,
      weightKg: null,
      heightCm: null,
      age: null,
      createdAt: current.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    saveProfileToStorage(guest)
    set({ profile: guest })
  },

  deleteProfile: () => {
    localStorage.removeItem(STORAGE_KEY)
    const guest = createDefaultGuestProfile()
    saveProfileToStorage(guest)
    set({ profile: guest })
  },
}))
