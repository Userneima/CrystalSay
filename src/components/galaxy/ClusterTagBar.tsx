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
      <div className="flex gap-1.5 px-8 py-1 min-w-min">
        {clusters.map((cluster) => {
          const isActive = cluster.id === activeClusterId
          return (
            <button
              key={cluster.id}
              data-cluster-id={cluster.id}
              onClick={() => onClusterClick(cluster)}
              className={`shrink-0 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] tracking-normal font-medium backdrop-blur-md transition-all duration-300 ${
                isActive
                  ? 'bg-white/[0.10] border-white/25 text-white/95 shadow-[0_0_14px_rgba(168,85,247,0.22)]'
                  : 'bg-white/[0.03] border-white/[0.08] text-white/55 hover:bg-white/[0.06] hover:text-white/80'
              } border`}
            >
              {cluster.name}
              <span className={`text-[10px] font-normal tabular-nums ${
                isActive ? 'text-white/60' : 'text-white/30'
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
