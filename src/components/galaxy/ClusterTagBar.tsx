import { useEffect, useRef } from 'react'
import type { Cluster } from '../../types'

interface ClusterTagBarProps {
  clusters: Cluster[]
  activeClusterId: string | null
  onClusterClick: (cluster: Cluster) => void
}

export default function ClusterTagBar({ clusters, activeClusterId, onClusterClick }: ClusterTagBarProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (activeClusterId && scrollRef.current) {
      const el = scrollRef.current.querySelector(`[data-cluster-id="${activeClusterId}"]`)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
      }
    }
  }, [activeClusterId])

  return (
    <div
      ref={scrollRef}
      className="scrollbar-none overflow-x-auto"
      style={{
        maskImage: 'linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)',
      }}
    >
      <div className="flex gap-2 px-8 py-1 min-w-min">
        {clusters.map((cluster) => {
          const isActive = cluster.id === activeClusterId
          return (
            <button
              key={cluster.id}
              data-cluster-id={cluster.id}
              onClick={() => onClusterClick(cluster)}
              className={`shrink-0 flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] tracking-wide font-medium transition-all duration-300 ${
                isActive
                  ? 'bg-white/[0.12] border-white/30 text-white/90 shadow-[0_0_12px_rgba(168,85,247,0.25)]'
                  : 'bg-white/[0.05] border-white/[0.08] text-white/50 hover:bg-white/[0.08] hover:text-white/70'
              } border`}
            >
              {cluster.name}
              <span className={`text-[11px] rounded-full px-1 py-0.5 ${
                isActive ? 'bg-white/[0.15] text-white/70' : 'bg-white/[0.06] text-white/30'
              }`}>
                {cluster.crystalIds.length}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
