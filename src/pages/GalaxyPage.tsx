import { useState, useMemo, Suspense, useCallback, useRef, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useNavigate, useSearchParams } from 'react-router-dom'
import * as THREE from 'three'
import { useStore } from '../store/useStore'
import type { Cluster, Crystal } from '../types'
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

function clusterCenterPosition(index: number, total: number, radius: number): [number, number, number] {
  if (total <= 1) return [0, 0, 0]
  const angle = (index / total) * Math.PI * 2 - Math.PI / 3
  return [Math.cos(angle) * radius, Math.sin(angle) * 0.6, Math.sin(angle) * radius * 0.7]
}

function crystalSpacingRadius(crystal: Crystal): number {
  const difficultyBump = crystal.difficulty === '较难' ? 0.22 : crystal.difficulty === '中等' ? 0.12 : 0
  const wordBump = Math.min(0.28, crystal.english.split(/\s+/).length * 0.025)
  return 0.78 + crystal.reuseValue * 0.08 + difficultyBump + wordBump
}

function estimateClusterFootprint(count: number): number {
  if (count <= 1) return 1.8
  if (count <= 6) return 3.0
  if (count <= 14) return 4.4
  return 5.7 + Math.sqrt(count - 14) * 0.35
}

function resolveClusterPositions(
  crystals: Crystal[],
  center: [number, number, number],
): Map<string, [number, number, number]> {
  const map = new Map<string, [number, number, number]>()
  if (crystals.length === 0) return map

  const [cx, cy, cz] = center
  if (crystals.length === 1) {
    const only = crystals[0]
    map.set(only.id, [cx, cy + (hashId(only.id, 3) - 0.5) * 0.5, cz])
    return map
  }

  const ordered = [...crystals].sort((a, b) => {
    const sizeDelta = crystalSpacingRadius(b) - crystalSpacingRadius(a)
    return sizeDelta !== 0 ? sizeDelta : a.id.localeCompare(b.id)
  })
  const minGap = 1.15
  const ringStep = 1.55
  const nodes = ordered.map((crystal, index) => {
    let remaining = index
    let ring = 1
    let capacity: number
    while (true) {
      const ringRadius = ring * ringStep
      capacity = Math.max(4, Math.floor((Math.PI * 2 * ringRadius) / minGap))
      if (remaining < capacity) break
      remaining -= capacity
      ring += 1
    }

    const baseRadius = ring * ringStep
    const radius = baseRadius + (hashId(crystal.id, 13) - 0.5) * 0.3
    const angle = (remaining / capacity) * Math.PI * 2 + ring * 0.47 + (hashId(crystal.id, 7) - 0.5) * 0.32
    const zScale = 0.56
    return {
      id: crystal.id,
      radius: crystalSpacingRadius(crystal),
      anchorX: Math.cos(angle) * radius,
      anchorZ: Math.sin(angle) * radius * zScale,
      x: Math.cos(angle) * radius,
      z: Math.sin(angle) * radius * zScale,
      y: (hashId(crystal.id, 3) - 0.5) * 1.25 + (ring - 1) * 0.08,
    }
  })

  for (let iteration = 0; iteration < 12; iteration++) {
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i]
        const b = nodes[j]
        let dx = b.x - a.x
        let dz = b.z - a.z
        let distance = Math.hypot(dx, dz)
        if (distance < 0.001) {
          dx = hashId(`${a.id}-${b.id}`, 19) - 0.5
          dz = hashId(`${b.id}-${a.id}`, 23) - 0.5
          distance = Math.hypot(dx, dz)
        }

        const minDistance = a.radius + b.radius + 0.28
        if (distance >= minDistance) continue

        const push = (minDistance - distance) * 0.5
        const nx = dx / distance
        const nz = dz / distance
        a.x -= nx * push
        a.z -= nz * push
        b.x += nx * push
        b.z += nz * push
      }
    }

    nodes.forEach((node) => {
      node.x += (node.anchorX - node.x) * 0.035
      node.z += (node.anchorZ - node.z) * 0.035
    })
  }

  nodes.forEach((node) => {
    map.set(node.id, [cx + node.x, cy + node.y, cz + node.z])
  })
  return map
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
      // Stronger, more dramatic burst
      const speed = 0.08 + Math.random() * 0.15
      vel[i * 3] = (Math.random() - 0.5) * speed * 4
      vel[i * 3 + 1] = (Math.random() * 0.7 + 0.2) * speed * 2
      vel[i * 3 + 2] = (Math.random() - 0.5) * speed * 4
    }
    return { positions: pos, velocities: vel }
  }, [fragmentCount, position])

  useFrame((_, delta) => {
    timerRef.current += delta
    const t = timerRef.current
    if (t > 2.8) { onDone(); return }

    // Phase 1 (0-0.3s): flash ring expands
    if (ringRef.current) {
      const p = Math.min(1, t / 0.3)
      ringRef.current.scale.setScalar(0.3 + p * 4)
      ;(ringRef.current.material as THREE.MeshBasicMaterial).opacity = 0.6 * (1 - p)
      ringRef.current.visible = t < 0.4
    }
    // Phase 1: core flash
    if (flashRef.current) {
      flashRef.current.visible = t < 0.25
      ;(flashRef.current.material as THREE.MeshBasicMaterial).opacity = 0.9 * (1 - t / 0.25)
    }

    // Particles: 3 phases
    if (particlesRef.current) {
      const arr = particlesRef.current.geometry.attributes.position.array as Float32Array
      const mat = particlesRef.current.material as THREE.PointsMaterial

      for (let i = 0; i < fragmentCount; i++) {
        if (t < 0.25) {
          // Phase 1: violent explosion
          const spd = 1 + t * 6
          arr[i * 3] += velocities[i * 3] * delta * spd * 15
          arr[i * 3 + 1] += velocities[i * 3 + 1] * delta * spd * 15
          arr[i * 3 + 2] += velocities[i * 3 + 2] * delta * spd * 15
        } else if (t < 0.5) {
          // Phase 2: brief pause
          arr[i * 3] += velocities[i * 3] * delta * 1
          arr[i * 3 + 1] += velocities[i * 3 + 1] * delta * 1
          arr[i * 3 + 2] += velocities[i * 3 + 2] * delta * 1
        } else {
          // Phase 3: dramatic pull to bottom-left
          const flowT = Math.min(1, (t - 0.5) / 1.8)
          const pull = flowT * flowT * flowT // cubic ease
          arr[i * 3] -= 5 * pull * delta * 3
          arr[i * 3 + 1] -= 6 * pull * delta * 3
          arr[i * 3 + 2] += (Math.random() - 0.5) * delta * 0.3
        }
      }
      particlesRef.current.geometry.attributes.position.needsUpdate = true
      // Fade only in phase 3
      mat.opacity = t < 0.8 ? 1 : Math.max(0, 1 - (t - 0.8) / 2.0)
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

function CrystalPositions({ clusters, onCrystalClick }: {
  clusters: Cluster[]
  onCrystalClick: (id: string) => void
}) {
  const crystals = useStore((s) => s.crystals)
  const shatteringIds = useStore((s) => s.shatteringIds)
  const dismissShatter = useStore((s) => s.dismissShatter)

  // Hide mastered crystals that finished shattering
  const visibleCrystals = useMemo(() =>
    crystals.filter((c) => !c.mastered || shatteringIds.includes(c.id)),
  [crystals, shatteringIds])

  const crystalPositions = useMemo(() => {
    const map = new Map<string, [number, number, number]>()
    clusters.forEach((cluster) => {
      const clusterCrystals = cluster.crystalIds.flatMap((id) => {
        const crystal = crystals.find((c) => c.id === id)
        return crystal ? [crystal] : []
      })
      resolveClusterPositions(clusterCrystals, cluster.centerPosition).forEach((position, id) => {
        map.set(id, position)
      })
    })
    return map
  }, [clusters, crystals])

  return (
    <>
      {visibleCrystals.map((crystal) => {
        const pos = crystalPositions.get(crystal.id)
        if (!pos) return null
        return (
          <group key={crystal.id}>
            {shatteringIds.includes(crystal.id) ? (
              <ShatterEffect position={pos} crystal={crystal} onDone={() => dismissShatter(crystal.id)} />
            ) : (
              <CrystalOrbit
                crystal={crystal}
                position={pos}
                onClick={() => onCrystalClick(crystal.id)}
              />
            )}
          </group>
        )
      })}
    </>
  )
}

function Scene({ cameraTarget, onTargetReached, clusters, onActiveClusterChange, onClusterClick }: {
  cameraTarget: [number, number, number] | null
  onTargetReached: () => void
  clusters: Cluster[]
  onActiveClusterChange: (id: string | null) => void
  onClusterClick: (id: string) => void
}) {
  const navigate = useNavigate()
  const clusterPositions = useMemo(
    () => clusters.map((c) => ({ id: c.id, position: c.centerPosition })),
    [clusters],
  )

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
      <CrystalPositions clusters={clusters} onCrystalClick={(id) => navigate(`/crystal/${id}`)} />
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
  const allClusters = useStore((s) => s.clusters)
  const allCrystals = useStore((s) => s.crystals)
  const shatteringIds = useStore((s) => s.shatteringIds)
  const [searchParams, setSearchParams] = useSearchParams()

  // Only lay out visible crystals: unmastered crystals plus the one currently shattering.
  const clusters = useMemo(() =>
    allClusters.map((c) => ({
      ...c,
      crystalIds: c.crystalIds.filter((id) => {
        const crystal = allCrystals.find((cr) => cr.id === id)
        if (!crystal) return false
        return !crystal.mastered || shatteringIds.includes(id)
      }),
    })).filter((c) => c.crystalIds.length > 0),
  [allClusters, allCrystals, shatteringIds])

  const layoutClusters = useMemo(() => {
    const maxFootprint = Math.max(0, ...clusters.map((c) => estimateClusterFootprint(c.crystalIds.length)))
    const radius = clusters.length <= 1
      ? 0
      : Math.max(7, (maxFootprint * 2 + 2.4) / (2 * Math.sin(Math.PI / clusters.length)))

    return clusters.map((cluster, index) => ({
      ...cluster,
      centerPosition: clusterCenterPosition(index, clusters.length, radius),
    }))
  }, [clusters])

  const [cameraTarget, setCameraTarget] = useState<[number, number, number] | null>(null)
  const [activeClusterId, setActiveClusterId] = useState<string | null>(null)

  // Handle ?shatter=id param: focus camera on the mastered crystal
  useEffect(() => {
    const sid = searchParams.get('shatter')
    if (sid && loaded && layoutClusters.length > 0) {
      const cluster = layoutClusters.find((c) => c.crystalIds.includes(sid))
      if (cluster) {
        setCameraTarget(cluster.centerPosition)
        setActiveClusterId(cluster.id)
      }
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, loaded, layoutClusters, setSearchParams])

  // Tag bar clusters: show only unmastered crystal counts
  const tagClusters = useMemo(() =>
    layoutClusters.map((c) => ({
      ...c,
      crystalIds: c.crystalIds.filter((id) => !allCrystals.find((cr) => cr.id === id)?.mastered),
    })),
  [layoutClusters, allCrystals])

  const handleClusterClick = useCallback((cluster: Cluster) => {
    setCameraTarget(cluster.centerPosition)
    setActiveClusterId(cluster.id)
  }, [])

  const handleBeaconClick = useCallback((clusterId: string) => {
    const cluster = layoutClusters.find((c) => c.id === clusterId)
    if (cluster) {
      setCameraTarget(cluster.centerPosition)
      setActiveClusterId(cluster.id)
    }
  }, [layoutClusters])

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
            clusters={layoutClusters}
            onActiveClusterChange={setActiveClusterId}
            onClusterClick={handleBeaconClick}
          />
        </Suspense>
      </Canvas>

      {/* Vignette — radial darkening at edges for cinematic depth */}
      <div
        className="absolute inset-0 pointer-events-none z-[5]"
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 38%, rgba(2,3,10,0.45) 72%, rgba(2,3,10,0.92) 100%)',
        }}
      />
      {/* Top fade — improves title legibility */}
      <div
        className="absolute top-0 left-0 right-0 h-40 pointer-events-none z-[5]"
        style={{
          background: 'linear-gradient(to bottom, rgba(2,3,10,0.55), transparent)',
        }}
      />
      {/* Bottom fade — anchors the dock */}
      <div
        className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none z-[5]"
        style={{
          background: 'linear-gradient(to top, rgba(2,3,10,0.7), transparent)',
        }}
      />

      {/* Title — Primary (display) */}
      <div className="absolute top-7 left-0 right-0 text-center pointer-events-none z-10">
        <h1 className="text-white/85 text-lg sm:text-xl tracking-[0.32em] sm:tracking-[0.42em] font-semibold">
          CRYSTAL SAY
        </h1>
        <p className="text-white/35 text-[11px] sm:text-xs mt-1 tracking-[0.18em] sm:tracking-[0.22em] font-light">
          表 达 晶 体 星 系
        </p>
      </div>

      {/* Cluster tag bar */}
      <div className="absolute top-28 left-0 right-0 flex justify-center pointer-events-none z-10">
        <div className="pointer-events-auto max-w-[85vw]">
          <ClusterTagBar
            clusters={tagClusters}
            activeClusterId={activeClusterId}
            onClusterClick={handleClusterClick}
          />
        </div>
      </div>

      {/* Bottom bar: frosted dock buttons + hint */}
      <div className="absolute bottom-6 left-5 right-5 z-10 safe-bottom">
        <div className="flex items-center justify-between">
          {/* left: history → celestial */}
          <button
            onClick={() => navigate('/celestial')}
            className="group flex items-center gap-2 rounded-full px-3.5 py-2 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/[0.14] backdrop-blur-md text-white/60 hover:text-white/90 active:scale-[0.97] transition-all"
          >
            <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="8" cy="8" r="3.2" />
              <ellipse cx="8" cy="8" rx="6.2" ry="2" />
            </svg>
            <span className="text-xs sm:text-[13px] font-medium tracking-wide">沉淀</span>
          </button>
          {/* right: update */}
          <button
            onClick={() => navigate('/update')}
            className="group flex items-center gap-2 rounded-full px-3.5 py-2 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/[0.14] backdrop-blur-md text-white/60 hover:text-white/90 active:scale-[0.97] transition-all"
          >
            <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 10.5h10" />
              <path d="M8 2.5v6" />
              <path d="M5.5 6L8 8.5 10.5 6" />
            </svg>
            <span className="text-xs sm:text-[13px] font-medium tracking-wide">更新</span>
          </button>
        </div>
        {/* hint — centered, secondary */}
        <p className="text-center text-white/30 text-[11px] sm:text-xs leading-relaxed mt-2.5 tracking-wide pointer-events-none">
          <span className="hint-desktop">拖拽旋转 · 滚轮缩放 · 右键平移</span>
          <span className="hint-mobile">单指旋转 · 双指缩放 · 双指平移</span>
        </p>
      </div>
    </div>
  )
}
