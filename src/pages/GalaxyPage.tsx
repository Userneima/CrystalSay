import { useState, useMemo, Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { useNavigate } from 'react-router-dom'
import * as THREE from 'three'
import { useStore } from '../store/useStore'
import Starfield from '../components/galaxy/Starfield'
import CameraController from '../components/galaxy/CameraController'
import CrystalOrbit from '../components/galaxy/CrystalOrbit'
import ClusterLabel from '../components/galaxy/ClusterLabel'

// Deterministic hash for stable positions
function hashId(id: string, seed: number): number {
  let h = seed
  for (let i = 0; i < id.length; i++) {
    h = ((h << 5) - h + id.charCodeAt(i)) | 0
  }
  return Math.abs(h) / 2147483647
}

function CrystalPositions({ onCrystalClick, onClusterClick }: {
  onCrystalClick: (id: string) => void
  onClusterClick: (pos: [number, number, number]) => void
}) {
  const crystals = useStore((s) => s.crystals)
  const clusters = useStore((s) => s.clusters)

  const crystalPositions = useMemo(() => {
    const map = new Map<string, [number, number, number]>()
    clusters.forEach((cluster) => {
      const [cx, cy, cz] = cluster.centerPosition
      cluster.crystalIds.forEach((id, i) => {
        const count = cluster.crystalIds.length
        const spread = count <= 2 ? 2.0 : 2.5
        const angleOffset = hashId(id, 7) * Math.PI * 2
        const angle = (i / count) * Math.PI * 2 + angleOffset * 0.1
        const radius = count === 1 ? 0 : spread * (0.6 + hashId(id, 13) * 0.8)

        map.set(id, [
          cx + Math.cos(angle) * radius,
          cy + (hashId(id, 3) - 0.5) * 1.5,
          cz + Math.sin(angle) * radius * 0.5,
        ])
      })
    })
    return map
  }, [clusters])

  return (
    <>
      {clusters.map((cluster) => (
        <ClusterLabel
          key={cluster.id}
          name={cluster.name}
          position={[
            cluster.centerPosition[0],
            cluster.centerPosition[1] + 2.5,
            cluster.centerPosition[2],
          ]}
          crystalCount={cluster.crystalIds.length}
          onClick={() => onClusterClick(cluster.centerPosition)}
        />
      ))}
      {crystals.map((crystal) => {
        const pos = crystalPositions.get(crystal.id)
        if (!pos) return null
        return (
          <CrystalOrbit
            key={crystal.id}
            crystal={crystal}
            position={pos}
            onClick={() => onCrystalClick(crystal.id)}
          />
        )
      })}
    </>
  )
}

function Scene() {
  const navigate = useNavigate()
  const [cameraTarget, setCameraTarget] = useState<[number, number, number] | null>(null)

  return (
    <>
      <Starfield />
      <ambientLight intensity={0.2} />
      <pointLight position={[12, 10, 12]} intensity={1.5} color="#4466cc" />
      <pointLight position={[-10, -4, 8]} intensity={0.7} color="#8844aa" />
      <pointLight position={[0, -10, -6]} intensity={0.5} color="#3388aa" />
      <pointLight position={[0, 8, -10]} intensity={0.6} color="#886644" />
      <fog attach="fog" args={['#02030a', 18, 55]} />
      <CameraController
        targetPosition={cameraTarget}
        onTargetReached={() => setCameraTarget(null)}
      />
      <CrystalPositions
        onCrystalClick={(id) => navigate(`/crystal/${id}`)}
        onClusterClick={setCameraTarget}
      />
    </>
  )
}

export default function GalaxyPage() {
  const loaded = useStore((s) => s.loaded)

  if (!loaded) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#02030a]">
        <div className="text-center">
          <div className="w-10 h-10 mx-auto mb-4 rounded-full bg-gradient-to-br from-cyan-400 to-purple-500 animate-pulse" />
          <p className="text-white/40 text-sm tracking-widest">正在加载晶体星系...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-full relative">
      <Canvas
        camera={{ position: [0, 6, 16], fov: 45 }}
        gl={{ antialias: true, alpha: false, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.2 }}
        style={{ background: '#02030a' }}
      >
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </Canvas>

      {/* Title */}
      <div className="absolute top-6 left-0 right-0 text-center pointer-events-none z-10">
        <h1 className="text-white/70 text-xl tracking-[0.35em] font-bold">CRYSTAL SAY</h1>
        <p className="text-white/20 text-xs mt-1 tracking-[0.2em]">表 达 晶 体 星 系</p>
      </div>

      {/* Hint */}
      <div className="absolute bottom-6 left-0 right-0 text-center pointer-events-none z-10">
        <p className="text-white/15 text-xs">拖拽旋转 · 滚轮缩放 · 点击晶体进入学习</p>
      </div>
    </div>
  )
}
