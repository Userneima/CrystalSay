import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Crystal, Cluster } from '../types'

interface RawCandidate {
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
}

export interface ArchiveBatch {
  id: string
  sourceName: string
  createdAt: string
  sentences: RawCandidate[]
}

function clusterPosition(index: number, total: number): [number, number, number] {
  const angle = (index / total) * Math.PI * 2 - Math.PI / 3
  const radius = 7
  return [Math.cos(angle) * radius, Math.sin(angle) * 0.6, Math.sin(angle) * radius * 0.7]
}

function buildClusters(crystals: Crystal[]): Cluster[] {
  const clusterMap = new Map<string, string[]>()
  crystals.forEach((c) => {
    const key = c.topicTag
    if (!clusterMap.has(key)) clusterMap.set(key, [])
    clusterMap.get(key)!.push(c.id)
  })
  return Array.from(clusterMap.entries()).map(([name, crystalIds], index) => ({
    id: name,
    name,
    crystalIds,
    centerPosition: clusterPosition(index, clusterMap.size),
  }))
}

interface CrystalState {
  crystals: Crystal[]
  clusters: Cluster[]
  loaded: boolean
  archive: ArchiveBatch[]
  practiceCounts: Record<string, { chunks: number; sentence: number }>
  shatteringIds: string[]
  plantedBlooms: { tier: string; theme: string }[]
  spentFragments: number
  setCrystals: (crystals: Crystal[]) => void
  addCrystals: (newCrystals: Crystal[]) => void
  markMastered: (id: string) => void
  markPracticed: (id: string) => void
  plantFlower: (tier: string, theme: string) => void
  removeFlower: () => void
  dismissShatter: (id: string) => void
  recordChunkPass: (id: string) => void
  recordSentencePass: (id: string) => void
  addToArchive: (sourceName: string, sentences: RawCandidate[]) => void
  removeFromArchive: (batchId: string) => void
  clearArchive: () => void
}

let archiveCounter = 0

const FRAGMENT_COST_MAP: Record<string, number> = { 晶王: 60, 晶簇: 35, 晶花: 15, 晶芽: 5 }

export const useStore = create<CrystalState>()(
  persist(
    (set, get) => ({
      crystals: [],
      clusters: [],
      loaded: false,
      archive: [],
      practiceCounts: {},
      shatteringIds: [],
      plantedBlooms: [],
      spentFragments: 0,

      setCrystals: (crystals) => {
        const stored = (get() as any)._progress || {}
        const merged = crystals.map((c) => {
          const p = stored[c.id]
          if (p) return { ...c, mastered: p.mastered, practicedAt: p.practicedAt }
          return c
        })
        set({ crystals: merged, clusters: buildClusters(merged), loaded: true })
      },

      addCrystals: (newCrystals) => {
        const state = get()
        const merged = [...state.crystals, ...newCrystals]
        set({ crystals: merged, clusters: buildClusters(merged) })
      },

      markMastered: (id) =>
        set((state) => ({
          crystals: state.crystals.map((c) =>
            c.id === id
              ? { ...c, mastered: true, practicedAt: new Date().toISOString() }
              : c,
          ),
        })),

      markPracticed: (id) =>
        set((state) => ({
          crystals: state.crystals.map((c) =>
            c.id === id
              ? { ...c, practicedAt: new Date().toISOString() }
              : c,
          ),
        })),

      recordChunkPass: (id) =>
        set((state) => {
          const counts = { ...state.practiceCounts }
          const cur = counts[id] || { chunks: 0, sentence: 0 }
          counts[id] = { ...cur, chunks: cur.chunks + 1 }
          const shouldMaster = counts[id].chunks + counts[id].sentence >= 2
          return {
            practiceCounts: counts,
            crystals: shouldMaster
              ? state.crystals.map((c) => (c.id === id ? { ...c, mastered: true, practicedAt: new Date().toISOString() } : c))
              : state.crystals,
            shatteringIds: shouldMaster ? [...state.shatteringIds, id] : state.shatteringIds,
          }
        }),

      recordSentencePass: (id) =>
        set((state) => {
          const counts = { ...state.practiceCounts }
          const cur = counts[id] || { chunks: 0, sentence: 0 }
          counts[id] = { ...cur, sentence: cur.sentence + 1 }
          const wasMastered = state.crystals.some((c) => c.id === id && c.mastered)
          return {
            practiceCounts: counts,
            crystals: state.crystals.map((c) =>
              c.id === id ? { ...c, mastered: true, practicedAt: new Date().toISOString() } : c,
            ),
            shatteringIds: wasMastered ? state.shatteringIds : [...state.shatteringIds, id],
          }
        }),

      dismissShatter: (id) =>
        set((state) => ({
          shatteringIds: state.shatteringIds.filter((sid) => sid !== id),
        })),

      plantFlower: (tier, theme) =>
        set((state) => ({
          plantedBlooms: [...state.plantedBlooms, { tier, theme }],
          spentFragments: state.spentFragments + (FRAGMENT_COST_MAP[tier] || 0),
        })),

      removeFlower: () =>
        set((state) => {
          if (state.plantedBlooms.length === 0) return state
          const last = state.plantedBlooms[state.plantedBlooms.length - 1]
          return {
            plantedBlooms: state.plantedBlooms.slice(0, -1),
            spentFragments: state.spentFragments - (FRAGMENT_COST_MAP[last.tier] || 0),
          }
        }),

      addToArchive: (sourceName, sentences) => {
        if (sentences.length === 0) return
        const batch: ArchiveBatch = {
          id: `archive-${Date.now()}-${archiveCounter++}`,
          sourceName,
          createdAt: new Date().toISOString(),
          sentences,
        }
        set((state) => ({ archive: [batch, ...state.archive] }))
      },

      removeFromArchive: (batchId) => {
        set((state) => ({
          archive: state.archive.filter((b) => b.id !== batchId),
        }))
      },

      clearArchive: () => set({ archive: [] }),
    }),
    {
      name: 'crystalsay-storage',
      onRehydrateStorage: () => {
        return (state) => {
          if (state && state.archive) {
            const seen = new Set<string>()
            state.archive = state.archive.filter((b: ArchiveBatch) => {
              if (seen.has(b.id)) return false
              seen.add(b.id)
              return true
            })
          }
        }
      },
      partialize: (state) => ({
        _progress: Object.fromEntries(
          state.crystals.map((c) => [c.id, { mastered: c.mastered, practicedAt: c.practicedAt }]),
        ),
        archive: state.archive,
        practiceCounts: state.practiceCounts,
      }),
    },
  ),
)
