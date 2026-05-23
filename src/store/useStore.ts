import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Crystal, Cluster } from '../types'

type ProgressMap = Record<string, { mastered: boolean; practicedAt: string | null }>

interface CrystalState {
  crystals: Crystal[]
  clusters: Cluster[]
  loaded: boolean
  setCrystals: (crystals: Crystal[]) => void
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
          return p ? { ...c, mastered: p.mastered, practicedAt: p.practicedAt } : c
        })

        const clusterMap = new Map<string, string[]>()
        merged.forEach((c) => {
          const key = c.topicTag
          if (!clusterMap.has(key)) clusterMap.set(key, [])
          clusterMap.get(key)!.push(c.id)
        })

        const clusters: Cluster[] = Array.from(clusterMap.entries()).map(
          ([name, crystalIds], index) => ({
            id: name,
            name,
            crystalIds,
            centerPosition: clusterPosition(index, clusterMap.size),
          }),
        )

        set({ crystals: merged, clusters, loaded: true })
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

function clusterPosition(index: number, total: number): [number, number, number] {
  const angle = (index / total) * Math.PI * 2 - Math.PI / 3
  const radius = 7
  return [Math.cos(angle) * radius, Math.sin(angle) * 0.6, Math.sin(angle) * radius * 0.7]
}
