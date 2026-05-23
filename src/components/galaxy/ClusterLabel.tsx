import { Html } from '@react-three/drei'

interface ClusterLabelProps {
  name: string
  position: [number, number, number]
  crystalCount: number
  onClick: () => void
}

export default function ClusterLabel({ name, position, crystalCount, onClick }: ClusterLabelProps) {
  return (
    <Html position={position} center style={{ pointerEvents: 'auto' }}>
      <button
        onClick={(e) => { e.stopPropagation(); onClick() }}
        className="flex flex-col items-center gap-1 group"
      >
        <span className="text-white/70 text-xs tracking-widest font-bold uppercase transition-colors group-hover:text-white/90">
          {name}
        </span>
        <span className="w-1.5 h-1.5 rounded-full bg-white/30 group-hover:bg-white/60 transition-colors" />
        <span className="text-white/30 text-[10px]">{crystalCount} 颗晶体</span>
      </button>
    </Html>
  )
}
