// LocalStorageSync: localStorage implementation of SyncAdapter.
// Reads/writes user state to a single localStorage key.
// Swap to SupabaseSync in the future by providing the same interface.

import type { SyncAdapter, UserState } from '../types/sync'
import { DEFAULT_USER_STATE } from '../types/sync'

const STORAGE_KEY = 'crystalsay-user'

export const localStorageSync: SyncAdapter = {
  async load(): Promise<UserState> {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return { ...DEFAULT_USER_STATE }
      const parsed = JSON.parse(raw)
      return {
        progress: parsed.progress || {},
        practiceCounts: parsed.practiceCounts || {},
        archive: parsed.archive || [],
        plantedBlooms: parsed.plantedBlooms || [],
        spentFragments: parsed.spentFragments ?? 0,
      }
    } catch {
      return { ...DEFAULT_USER_STATE }
    }
  },

  async save(state: UserState): Promise<void> {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // localStorage full or unavailable — silently ignore
    }
  },
}
