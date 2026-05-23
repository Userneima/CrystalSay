import { useState, useMemo, Suspense, useCallback } from 'react'
import { Canvas } from '@react-three/fiber'
import { useNavigate } from 'react-router-dom'
import * as THREE from 'three'
import { useStore } from '../store/useStore'
import type { Cluster } from '../types'
import Starfield from '../components/galaxy/Starfield'
import CameraController from '../components/galaxy/CameraController'
import CrystalOrbit from '../components/galaxy/CrystalOrbit'
import ClusterTagBar from '../components/galaxy/ClusterTagBar'
import ClusterBeacon from '../components/galaxy/ClusterBeacon'

// Deterministic hash for stable positions
function hashId(id: string, seed: number): number {
  let h = seed
  for (let i = 0; i < id.length; i++) {
    h = ((h << 5) - h + id.charCodeAt(i)) | 0
  }
  return Math.abs(h) / 2147483647
}

function CrystalPositions({ onCrystalClick }: {
  onCrystalClick: (id: string) => void
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

function Scene({ cameraTarget, onTargetReached, clusterPositions, onActiveClusterChange, onClusterClick }: {
  cameraTarget: [number, number, number] | null
  onTargetReached: () => void
  clusterPositions: { id: string; position: [number, number, number] }[]
  onActiveClusterChange: (id: string | null) => void
  onClusterClick: (id: string) => void
}) {
  const navigate = useNavigate()

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
        onTargetReached={onTargetReached}
        clusterPositions={clusterPositions}
        onActiveClusterChange={onActiveClusterChange}
      />
      <CrystalPositions onCrystalClick={(id) => navigate(`/crystal/${id}`)} />
      {clusterPositions.map((cp) => (
        <ClusterBeacon
          key={cp.id}
          position={cp.position}
          onClick={() => onClusterClick(cp.id)}
        />
      ))}
    </>
  )
}

export default function GalaxyPage() {
  const navigate = useNavigate()
  const loaded = useStore((s) => s.loaded)
  const clusters = useStore((s) => s.clusters)

  const [cameraTarget, setCameraTarget] = useState<[number, number, number] | null>(null)
  const [activeClusterId, setActiveClusterId] = useState<string | null>(null)

  const clusterPositions = useMemo(
    () => clusters.map((c) => ({ id: c.id, position: c.centerPosition })),
    [clusters],
  )

  const handleClusterClick = useCallback((cluster: Cluster) => {
    setCameraTarget(cluster.centerPosition)
    setActiveClusterId(cluster.id)
  }, [])

  const handleBeaconClick = useCallback((clusterId: string) => {
    const cluster = clusters.find((c) => c.id === clusterId)
    if (cluster) {
      setCameraTarget(cluster.centerPosition)
      setActiveClusterId(cluster.id)
    }
  }, [clusters])

  const handleTargetReached = useCallback(() => {
    setCameraTarget(null)
  }, [])

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
          <Scene
            cameraTarget={cameraTarget}
            onTargetReached={handleTargetReached}
            clusterPositions={clusterPositions}
            onActiveClusterChange={setActiveClusterId}
            onClusterClick={handleBeaconClick}
          />
        </Suspense>
      </Canvas>

      {/* Title */}
      <div className="absolute top-6 left-0 right-0 text-center pointer-events-none z-10">
        <h1 className="text-white/70 text-lg sm:text-xl tracking-[0.25em] sm:tracking-[0.35em] font-bold">CRYSTAL SAY</h1>
        <p className="text-white/20 text-[10px] sm:text-xs mt-0.5 tracking-[0.15em] sm:tracking-[0.2em]">表 达 晶 体 星 系</p>
      </div>

      {/* Cluster tag bar */}
      <div className="absolute top-28 left-0 right-0 flex justify-center pointer-events-none z-10">
        <div className="pointer-events-auto max-w-[85vw]">
          <ClusterTagBar
            clusters={clusters}
            activeClusterId={activeClusterId}
            onClusterClick={handleClusterClick}
          />
        </div>
      </div>

      {/* Bottom bar: icon+text nav left & right, hint centered */}
      <div className="absolute bottom-6 left-5 right-5 z-10 safe-bottom">
        <div className="flex items-end justify-between">
          {/* left: history */}
          <button
            onClick={() => navigate('/history')}
            className="flex items-center gap-1.5 text-white/20 hover:text-white/40 active:scale-95 transition-all"
          >
            <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="8" cy="8" r="6.5" />
              <path d="M8 4.5v3.5l2 2" />
            </svg>
            <span className="text-xs sm:text-sm">历史</span>
          </button>
          {/* right: update */}
          <button
            onClick={() => navigate('/update')}
            className="flex items-center gap-1.5 text-white/20 hover:text-white/40 active:scale-95 transition-all"
          >
            <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 1.5l6 4.5-3 8.5H5l-3-8.5 6-4.5z" />
              <path d="M8 1.5l-3 4.5h6l-3-4.5z" opacity="0.5" />
            </svg>
            <span className="text-xs sm:text-sm">更新</span>
          </button>
        </div>
        {/* hint — centered */}
        <p className="text-center text-white/15 text-[11px] sm:text-xs leading-relaxed mt-1.5 pointer-events-none">
          <span className="hint-desktop">拖拽旋转 · 滚轮缩放 · 右键平移</span>
          <span className="hint-mobile">单指旋转 · 双指缩放 · 双指平移</span>
        </p>
      </div>
    </div>
  )
}
