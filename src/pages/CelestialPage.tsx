import { useMemo, useRef, Suspense, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { useStore } from '../store/useStore'
import { THEME_COLORS } from '../utils/themeMapping'
import type { Crystal, Theme } from '../types'

const FRAGMENT_COST: Record<string, number> = { 晶王: 60, 晶簇: 35, 晶花: 15, 晶芽: 5 }
type FlowerTier = keyof typeof FRAGMENT_COST

function computeFlowers(mastered: Crystal[], plantedBlooms: { tier: string; theme: string }[], spentFragments: number) {
  const totalEarned = mastered.reduce((sum, c) =>
    sum + (c.difficulty === '较难' ? 10 : c.difficulty === '中等' ? 6 : 3), 0
  )
  const available = Math.max(0, totalEarned - spentFragments)
  const blooms = plantedBlooms.map((b) => ({
    tier: b.tier as FlowerTier,
    theme: b.theme as Theme,
    scale: b.tier === '晶王' ? 1.4 : b.tier === '晶簇' ? 1.0 : b.tier === '晶花' ? 0.65 : 0.35,
    layers: b.tier === '晶王' ? 4 : b.tier === '晶簇' ? 3 : b.tier === '晶花' ? 2 : 1,
  }))
  return { blooms, availableFragments: available, totalEarned }
}

// ─── Crystal Shard ───
function Shard({ pos, rot, color, size }: {
  pos: [number, number, number]; rot: [number, number, number]; color: THREE.Color; size: number
}) {
  return (
    <group position={pos} rotation={rot}>
      <mesh>
        <octahedronGeometry args={[size, 0]} />
        <meshBasicMaterial color={color} transparent opacity={0.65} depthWrite={false} />
      </mesh>
      <mesh scale={1.2}>
        <octahedronGeometry args={[size, 0]} />
        <meshBasicMaterial color="#fff" wireframe transparent opacity={0.18}
          blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
    </group>
  )
}

// ─── Crystal Flower ───
function CrystalFlower({ bloom, index, position }: {
  bloom: { tier: FlowerTier; theme: Theme; scale: number; layers: number }
  index: number
  position: [number, number, number]
}) {
  const groupRef = useRef<THREE.Group>(null)
  const { theme, scale, layers } = bloom
  const colors = THEME_COLORS[theme]
  const primary = useMemo(() => new THREE.Color(colors.primary), [colors.primary])
  const glow = useMemo(() => new THREE.Color(colors.glow), [colors.glow])
  const n = 6 + layers * 2
  const form = index % 3

  const targets = useMemo((): [number, number, number][] => {
    const t: [number, number, number][] = []
    const sz = scale
    const push = (x: number, y: number, z: number) => t.push([x, y, z])
    t.push([0, 0.02, 0])

    if (layers <= 1) {
      if (form === 0) { push(0, sz * 0.1, 0); for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2; push(Math.cos(a) * sz * 0.14, 0.02, Math.sin(a) * sz * 0.14) } }
      else if (form === 1) { push(0, sz * 0.1, 0); push(0, sz * 0.1, 0) }
      else { for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; push(Math.cos(a) * sz * 0.12, 0.04, Math.sin(a) * sz * 0.12) } }
    } else if (layers <= 2) {
      if (form === 0) for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; push(Math.cos(a) * sz * 0.18, sz * 0.04, Math.sin(a) * sz * 0.18) }
      else if (form === 1) for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; push(Math.cos(a) * sz * 0.16, i * sz * 0.04, Math.sin(a) * sz * 0.16) }
      else for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; push(Math.cos(a) * sz * 0.2, -sz * 0.02, Math.sin(a) * sz * 0.2) }
    } else if (layers <= 3) {
      if (form === 0) for (let i = 0; i < n * 2; i++) { const phi = Math.acos(2 * i / (n * 2) - 1); push(Math.sin(phi) * Math.cos(i * 2.4) * sz * 0.2, Math.abs(Math.cos(phi)) * sz * 0.1, Math.sin(phi) * Math.sin(i * 2.4) * sz * 0.2) }
      else if (form === 1) for (let r = 0; r < 3; r++) for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2 + r * 0.4; push(Math.cos(a) * sz * (0.1 + r * 0.05), r * sz * 0.05, Math.sin(a) * sz * (0.1 + r * 0.05)) }
      else for (let i = 0; i < n * 2; i++) { const a = (i / (n * 2)) * Math.PI * 2; push(Math.cos(a) * sz * (0.08 + (i % 3) * 0.08), sz * 0.04, Math.sin(a) * sz * (0.08 + (i % 3) * 0.08)) }
    } else {
      if (form === 0) { push(0, sz * 0.12, 0); for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; push(Math.cos(a) * sz * 0.2, 0.04, Math.sin(a) * sz * 0.2) }; for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 + 0.3; push(Math.cos(a) * sz * 0.12, sz * 0.08, Math.sin(a) * sz * 0.12) } }
      else if (form === 1) { push(0, sz * 0.1, 0); push(0, sz * 0.1, 0); for (let r = 0; r < 3; r++) for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2 + r * 0.5; push(Math.cos(a) * sz * (0.14 + r * 0.04), r * sz * 0.04, Math.sin(a) * sz * (0.14 + r * 0.04)) } }
      else { for (let i = 0; i < 3; i++) push(0, sz * (0.05 + i * 0.05), 0); for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; push(Math.cos(a) * sz * 0.16, 0, Math.sin(a) * sz * 0.16); push(Math.cos(a) * sz * 0.16, sz * 0.06, Math.sin(a) * sz * 0.16) } }
    }
    return t
  }, [scale, n, layers, form])

  useFrame((state, delta) => {
    void state
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.06
      const sway = Math.sin(Date.now() * 0.0008 + position[0]) * 0.012
      groupRef.current.position.y = position[1] + sway
    }
  })

  return (
    <group ref={groupRef} position={position}>
      <mesh position={[0, -0.06, 0]}>
        <cylinderGeometry args={[0.01, 0.015, 0.5 * scale, 6]} />
        <meshBasicMaterial color={primary} transparent opacity={0.3} depthWrite={false} />
      </mesh>
      <group position={[0, 0.02, 0]}>
        <mesh><octahedronGeometry args={[scale * 0.06, 0]} /><meshBasicMaterial color={glow} transparent opacity={0.7} blending={THREE.AdditiveBlending} depthWrite={false} /></mesh>
        <mesh scale={1.25}><octahedronGeometry args={[scale * 0.06, 0]} /><meshBasicMaterial color={glow} wireframe transparent opacity={0.25} blending={THREE.AdditiveBlending} depthWrite={false} /></mesh>
      </group>
      {targets.slice(1).map((t, i) => (
        <Shard key={i} pos={t} rot={[0.5, i * 0.8, 0.2]} color={i % 3 === 0 ? glow : primary} size={scale * 0.06} />
      ))}
    </group>
  )
}

// ─── Environment ───
function FragmentSoil({ count }: { count: number }) {
  const ref = useRef<THREE.Points>(null)
  const data = useMemo(() => {
    const n = Math.max(150, count * 20), pos = new Float32Array(n * 3), cols = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) {
      const r = Math.random() * 5.5, a = Math.random() * Math.PI * 2
      pos[i * 3] = Math.cos(a) * r; pos[i * 3 + 1] = -2.5 + Math.random() * 0.12; pos[i * 3 + 2] = Math.sin(a) * r
      const c = new THREE.Color().setHSL(0.55 + Math.random() * 0.25, 0.4, 0.15 + Math.random() * 0.2)
      cols[i * 3] = c.r; cols[i * 3 + 1] = c.g; cols[i * 3 + 2] = c.b
    }
    return { positions: pos, colors: cols }
  }, [count])
  useFrame((state, delta) => { void state; if (ref.current) ref.current.rotation.y += delta * 0.03 })
  return <points ref={ref}><bufferGeometry><bufferAttribute attach="attributes-position" args={[data.positions, 3]} /><bufferAttribute attach="attributes-color" args={[data.colors, 3]} /></bufferGeometry><pointsMaterial size={0.06} vertexColors transparent opacity={0.6} blending={THREE.AdditiveBlending} depthWrite={false} /></points>
}

function Fireflies() {
  const ref = useRef<THREE.Points>(null)
  const data = useMemo(() => {
    const n = 60, p = new Float32Array(n * 3), base = new Float32Array(n * 3), speeds = new Float32Array(n), phases = new Float32Array(n)
    for (let i = 0; i < n; i++) {
      p[i * 3] = base[i * 3] = (Math.random() - 0.5) * 8; p[i * 3 + 1] = base[i * 3 + 1] = -2.5 + Math.random() * 4; p[i * 3 + 2] = base[i * 3 + 2] = (Math.random() - 0.5) * 8
      speeds[i] = 0.3 + Math.random() * 0.8; phases[i] = Math.random() * Math.PI * 2
    }
    return { positions: p, bases: base, speeds, phases }
  }, [])
  useFrame(() => {
    if (ref.current) {
      const arr = ref.current.geometry.attributes.position.array as Float32Array; const t = Date.now() * 0.001
      for (let i = 0; i < data.positions.length / 3; i++) {
        arr[i * 3] = data.bases[i * 3] + Math.sin(t * data.speeds[i] + data.phases[i]) * 0.6
        arr[i * 3 + 1] = data.bases[i * 3 + 1] + Math.cos(t * data.speeds[i] * 0.7 + data.phases[i]) * 0.4
        arr[i * 3 + 2] = data.bases[i * 3 + 2] + Math.cos(t * data.speeds[i] * 0.5 + data.phases[i]) * 0.5
      }
      ref.current.geometry.attributes.position.needsUpdate = true
    }
  })
  return <points ref={ref}><bufferGeometry><bufferAttribute attach="attributes-position" args={[data.positions, 3]} /></bufferGeometry><pointsMaterial size={0.05} color="#ccddff" transparent opacity={0.5} blending={THREE.AdditiveBlending} depthWrite={false} /></points>
}

// ─── Scene ───
function Scene({ focusIndex }: { focusIndex: number | null }) {
  const crystals = useStore((s) => s.crystals)
  const plantedBlooms = useStore((s) => s.plantedBlooms)
  const spentFragments = useStore((s) => s.spentFragments)
  const mastered = useMemo(() => crystals.filter((c) => c.mastered), [crystals])
  const { blooms } = useMemo(() => computeFlowers(mastered, plantedBlooms, spentFragments), [mastered, plantedBlooms, spentFragments])
  const controlsRef = useRef<any>(null)

  // Animate camera to newly planted flower
  useFrame(() => {
    if (focusIndex != null && controlsRef.current && positions[focusIndex]) {
      const target = new THREE.Vector3(...positions[focusIndex])
      const current = controlsRef.current.target as THREE.Vector3
      current.lerp(target, 0.06)
      controlsRef.current.update()
    }
  })

  // Generate positions with collision avoidance
  const positions = useMemo(() => {
    const taken: { x: number; z: number }[] = []
    const minDist = 0.7
    return blooms.map(() => {
      let px = 0, pz = 0, att = 0
      do {
        const angle = Math.random() * Math.PI * 2
        const radius = 0.3 + Math.random() * 4.5
        px = Math.cos(angle) * radius
        pz = Math.sin(angle) * radius
        att++
      } while (att < 30 && taken.some((t) => Math.hypot(px - t.x, pz - t.z) < minDist))
      taken.push({ x: px, z: pz })
      return [px, -2.15, pz] as [number, number, number]
    })
  }, [blooms])

  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[6, 6, 6]} intensity={0.4} color="#4466cc" />
      <pointLight position={[-5, -2, -5]} intensity={0.3} color="#8844aa" />
      <FragmentSoil count={blooms.length} />
      <Fireflies />
      {blooms.map((b, i) => <CrystalFlower key={i} bloom={b} index={i} position={positions[i]} />)}
      <OrbitControls ref={controlsRef} enableDamping dampingFactor={0.08} minDistance={2} maxDistance={15} maxPolarAngle={Math.PI * 0.65} autoRotate autoRotateSpeed={0.15} target={[0, -1.6, 0]} />
    </>
  )
}

export default function CelestialPage() {
  const navigate = useNavigate()
  const crystals = useStore((s) => s.crystals)
  const plantedBlooms = useStore((s) => s.plantedBlooms)
  const spentFragments = useStore((s) => s.spentFragments)
  const seedGarden = useStore((s) => s.seedGarden)
  const plantFlower = useStore((s) => s.plantFlower)
  const removeFlower = useStore((s) => s.removeFlower)
  const prevCountRef = useRef(plantedBlooms.length)
  const [focusIndex, setFocusIndex] = useState<number | null>(null)

  // When a new bloom is planted, focus camera on it
  useEffect(() => {
    if (plantedBlooms.length > prevCountRef.current) {
      setFocusIndex(plantedBlooms.length - 1)
    }
    prevCountRef.current = plantedBlooms.length
  }, [plantedBlooms.length])

  const mastered = useMemo(() => crystals.filter((c) => c.mastered), [crystals])
  const { blooms, availableFragments } = useMemo(() => computeFlowers(mastered, plantedBlooms, spentFragments), [mastered, plantedBlooms, spentFragments])

  // Load garden from file on first visit
  useEffect(() => {
    if (plantedBlooms.length === 0) {
      fetch('/data/garden.json')
        .then(r => r.json())
        .then(data => {
          if (data.plantedBlooms) {
            seedGarden(data.plantedBlooms, data.spentFragments || 0)
          }
        })
        .catch(() => {})
    }
  }, [plantedBlooms.length, seedGarden])

  const 晶芽 = blooms.filter((b) => b.tier === '晶芽').length
  const 晶花 = blooms.filter((b) => b.tier === '晶花').length
  const 晶簇 = blooms.filter((b) => b.tier === '晶簇').length
  const 晶王 = blooms.filter((b) => b.tier === '晶王').length

  const tiers: { tier: FlowerTier; cost: number; label: string }[] = [
    { tier: '晶芽', cost: 5, label: '晶芽' },
    { tier: '晶花', cost: 15, label: '晶花' },
    { tier: '晶簇', cost: 35, label: '晶簇' },
    { tier: '晶王', cost: 60, label: '晶王' },
  ]

  const plant = (tier: FlowerTier) => {
    if (availableFragments < FRAGMENT_COST[tier]) return
    const themes: Theme[] = ['amethyst', 'blue-green', 'amber', 'ice-white']
    const randomTheme = themes[Math.floor(Math.random() * themes.length)]
    plantFlower(tier, randomTheme)
  }

  return (
    <div className="w-full h-full relative bg-[#02030a]">
      {plantedBlooms.length === 0 ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-5">
          <div className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ background: `radial-gradient(circle, ${THEME_COLORS.amethyst.glow}12, transparent 65%)` }}>
            <svg viewBox="0 0 24 24" className="w-8 h-8 text-white/10" fill="none" stroke="currentColor" strokeWidth="1.2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l3 3" strokeLinecap="round" />
            </svg>
          </div>
          <div className="text-center">
            <p className="text-white/25 text-sm mb-1">花园还是一片空地</p>
            <p className="text-white/12 text-xs">去星系中学习表达，掌握后碎片会种出晶花</p>
          </div>
          <button onClick={() => navigate('/')} className="text-white/35 text-sm hover:text-white/55 transition-colors">← 返回星系</button>
        </div>
      ) : (
        <Canvas camera={{ position: [0, 1.5, 7], fov: 45 }} gl={{ antialias: true }} style={{ background: '#02030a' }}>
          <Suspense fallback={null}><Scene focusIndex={focusIndex} /></Suspense>
        </Canvas>
      )}

      <div className="absolute top-6 left-5 right-5 flex justify-between z-10 pointer-events-none">
        <button onClick={() => navigate('/')} className="pointer-events-auto flex items-center gap-1.5 min-h-[44px] text-white/40 hover:text-white/70 transition-colors text-sm"><span className="text-lg leading-none">‹</span><span>星系</span></button>
        <span className="text-white/30 text-xs tracking-wider">沉 淀</span>
      </div>

      {plantedBlooms.length > 0 && (
        <div className="absolute top-20 right-5 z-10 text-right">
          <p className="text-white/30 text-xs tracking-wider">{晶芽} 晶芽 · {晶花} 晶花 · {晶簇} 晶簇{晶王 > 0 && ` · ${晶王} 晶王`}</p>
          <p className="text-white/20 text-[11px] mt-0.5">🪙 {availableFragments} 碎片可用</p>
        </div>
      )}

      {(mastered.length > 0 || plantedBlooms.length > 0) && (
        <div className="absolute bottom-20 left-5 right-5 z-10">
          <div className="flex justify-center gap-2">
            {tiers.map((t) => {
              const canAfford = availableFragments >= t.cost
              return (
                <button key={t.tier} onClick={() => plant(t.tier)} disabled={!canAfford}
                  className={`flex flex-col items-center gap-1.5 px-4 py-2.5 rounded-xl border transition-all min-w-[80px] ${canAfford ? 'bg-white/[0.06] border-white/[0.12] text-white/60 hover:bg-white/[0.1] hover:text-white/80 active:scale-95' : 'bg-white/[0.02] border-white/[0.04] text-white/15 cursor-not-allowed'}`}>
                  <span className="text-xs tracking-wider">{t.label}</span>
                  <span className={`text-[11px] ${canAfford ? 'text-white/30' : 'text-white/10'}`}>{t.cost} 碎片</span>
                </button>
              )
            })}
          </div>

          {plantedBlooms.length > 0 && (
            <button onClick={removeFlower}
              className="block mx-auto mt-2 text-white/10 text-[8px] hover:text-white/25 transition-colors">
              撤回上一次种植
            </button>
          )}
        </div>
      )}

      {plantedBlooms.length > 0 && (
        <div className="absolute bottom-6 left-0 right-0 text-center pointer-events-none z-10 safe-bottom">
          <p className="text-white/15 text-xs"><span className="hint-desktop">拖拽旋转 · 滚轮缩放 · 右键平移</span><span className="hint-mobile">单指旋转 · 双指缩放 · 双指平移</span></p>
        </div>
      )}
    </div>
  )
}
