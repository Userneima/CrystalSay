import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Crystal, Cluster } from '../types'

type ProgressMap = Record<string, { mastered: boolean; practicedAt: string | null }>

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

let nextId = 100

interface CrystalState {
  crystals: Crystal[]
  clusters: Cluster[]
  loaded: boolean
  setCrystals: (crystals: Crystal[]) => void
  addCrystals: (newCrystals: Crystal[]) => void
  markMastered: (id: string) => void
}

export const useStore = create<CrystalState>()(
  persist(
    (set, get) => ({
      crystals: [],
      clusters: [],
      loaded: false,

      setCrystals: (crystals) => {
        const stored = (get() as any)._progress || {}
        const merged = crystals.map((c) => {
          const p = stored[c.id]
          if (p) return { ...c, mastered: p.mastered, practicedAt: p.practicedAt }
          nextId = Math.max(nextId, parseInt(c.id.replace('crystal-', ''), 10) + 1)
          return c
        })
        set({ crystals: merged, clusters: buildClusters(merged), loaded: true })
      },

      addCrystals: (newCrystals) => {
        const state = get()
        const existing = state.crystals
        const merged = [...existing, ...newCrystals]
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
    }),
    {
      name: 'crystalsay-storage',
      partialize: (state) => ({
        _progress: Object.fromEntries(
          state.crystals.map((c) => [c.id, { mastered: c.mastered, practicedAt: c.practicedAt }]),
        ),
      }),
    },
  ),
)
