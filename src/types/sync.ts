// SyncAdapter: abstraction layer between app state and persistence backend.
// Current implementation: LocalStorageSync
// Future implementation: SupabaseSync (swappable without touching store logic)

export interface ArchiveEntry {
  id: string
  sourceName: string
  createdAt: string
  sentences: {
    crystal_name: string
    english_sentence: string
    chinese_meaning: string
    usage_scene: string
    expression_function: string
    chunks: string[]
    difficulty: string
    topic_tag: string
    reuse_value: number
    visual_hint: string
  }[]
}

export interface UserState {
  /** Per-crystal progress. Merged with static crystal data at load time. */
  progress: Record<string, { mastered: boolean; practicedAt: string | null }>
  /** Chunk + sentence pass counters per crystal */
  practiceCounts: Record<string, { chunks: number; sentence: number }>
  /** Sentence archive (sentences user skipped in UpdatePage) */
  archive: ArchiveEntry[]
  /** Garden: planted flower records */
  plantedBlooms: { tier: string; theme: string }[]
  /** Garden: total spent fragment count */
  spentFragments: number
}

export const DEFAULT_USER_STATE: UserState = {
  progress: {},
  practiceCounts: {},
  archive: [],
  plantedBlooms: [],
  spentFragments: 0,
}

export interface SyncAdapter {
  /** Load user state from the persistence backend */
  load(): Promise<UserState>
  /** Save user state to the persistence backend */
  save(state: UserState): Promise<void>
}
