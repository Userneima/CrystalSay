import { useState, useMemo, Suspense, useCallback, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useNavigate } from 'react-router-dom'
import * as THREE from 'three'
import { useStore } from '../store/useStore'
import type { Cluster } from '../types'
import Starfield from '../components/galaxy/Starfield'
import CameraController from '../components/galaxy/CameraController'
import CrystalOrbit from '../components/galaxy/CrystalOrbit'
import ClusterTagBar from '../components/galaxy/ClusterTagBar'
import ClusterBeacon from '../components/galaxy/ClusterBeacon'
import { THEME_COLORS } from '../utils/themeMapping'

// Deterministic hash for stable positions
function hashId(id: string, seed: number): number {
  let h = seed
  for (let i = 0; i < id.length; i++) {
    h = ((h << 5) - h + id.charCodeAt(i)) | 0
  }
  return Math.abs(h) / 2147483647
}

// Enhanced crystal shatter — flash ring → core glow → fragment burst
function ShatterEffect({ position, crystal, onDone }: {
  position: [number, number, number]
  crystal: { theme: string; difficulty: string }
  onDone: () => void
}) {
  const particlesRef = useRef<THREE.Points>(null)
  const flashRef = useRef<THREE.Mesh>(null)
  const ringRef = useRef<THREE.Mesh>(null)
  const timerRef = useRef(0)
  const colors = THEME_COLORS[crystal.theme as keyof typeof THEME_COLORS] || THEME_COLORS['blue-green']
  const fragmentCount = crystal.difficulty === '较难' ? 50 : crystal.difficulty === '中等' ? 35 : 20
  const glow = new THREE.Color(colors.glow)

  const { positions, velocities } = useMemo(() => {
    const pos = new Float32Array(fragmentCount * 3)
    const vel = new Float32Array(fragmentCount * 3)
    for (let i = 0; i < fragmentCount; i++) {
      pos[i * 3] = position[0]
      pos[i * 3 + 1] = position[1]
      pos[i * 3 + 2] = position[2]
      const speed = 0.04 + Math.random() * 0.1
      vel[i * 3] = (Math.random() - 0.5) * speed * 2
      vel[i * 3 + 1] = Math.random() * speed * 1.5
      vel[i * 3 + 2] = (Math.random() - 0.5) * speed * 2
    }
    return { positions: pos, velocities: vel }
  }, [fragmentCount, position])

  useFrame((_, delta) => {
    timerRef.current += delta
    const t = timerRef.current
    if (t > 2.5) { onDone(); return }

    if (ringRef.current) {
      const p = Math.min(1, t / 0.4)
      ringRef.current.scale.setScalar(0.3 + p * 5)
      ;(ringRef.current.material as THREE.MeshBasicMaterial).opacity = 0.7 * (1 - p)
      ringRef.current.visible = t < 0.5
    }
    if (flashRef.current) {
      flashRef.current.visible = t < 0.3
      ;(flashRef.current.material as THREE.MeshBasicMaterial).opacity = 0.9 * (1 - t / 0.3)
    }
    if (particlesRef.current) {
      const arr = particlesRef.current.geometry.attributes.position.array as Float32Array
      for (let i = 0; i < fragmentCount; i++) {
        const speed = 1 + t * 3
        arr[i * 3] += velocities[i * 3] * delta * speed * 12
        arr[i * 3 + 1] += velocities[i * 3 + 1] * delta * speed * 12 - t * 0.01
        arr[i * 3 + 2] += velocities[i * 3 + 2] * delta * speed * 12
      }
      particlesRef.current.geometry.attributes.position.needsUpdate = true
      ;(particlesRef.current.material as THREE.PointsMaterial).opacity = t < 1.2 ? 1 : Math.max(0, 1 - (t - 1.2) * 0.8)
    }
  })

  return (
    <group>
      <mesh ref={ringRef} position={position}>
        <torusGeometry args={[0.3, 0.025, 8, 32]} />
        <meshBasicMaterial color={glow} transparent opacity={0.7} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh ref={flashRef} position={position}>
        <sphereGeometry args={[0.6, 16, 16]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.9} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <points ref={particlesRef}>
        <bufferGeometry><bufferAttribute attach="attributes-position" args={[positions, 3]} /></bufferGeometry>
        <pointsMaterial size={0.15} color={glow} transparent opacity={1} blending={THREE.AdditiveBlending} depthWrite={false} />
      </points>
    </group>
  )
}

function CrystalPositions({ onCrystalClick }: {
  onCrystalClick: (id: string) => void
}) {
  const crystals = useStore((s) => s.crystals)
  const clusters = useStore((s) => s.clusters)
  const shatteringIds = useStore((s) => s.shatteringIds)
  const dismissShatter = useStore((s) => s.dismissShatter)

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
          <group key={crystal.id}>
            <CrystalOrbit
              crystal={crystal}
              position={pos}
              onClick={() => onCrystalClick(crystal.id)}
            />
            {shatteringIds.includes(crystal.id) && (
              <ShatterEffect position={pos} crystal={crystal} onDone={() => dismissShatter(crystal.id)} />
            )}
          </group>
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
            onClick={() => navigate('/celestial')}
            className="flex items-center gap-1.5 text-white/20 hover:text-white/40 active:scale-95 transition-all"
          >
            <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
              <circle cx="8" cy="4" r="1.5" />
              <path d="M8 5.5v7" />
              <path d="M5 10c1-2 2-3 3-3s2 1 3 3" />
            </svg>
            <span className="text-xs sm:text-sm">沉淀</span>
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
