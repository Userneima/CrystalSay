import { useMemo, useRef, Suspense } from 'react'
import { useNavigate } from 'react-router-dom'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { useStore } from '../store/useStore'
import { THEME_COLORS } from '../utils/themeMapping'
import type { Crystal } from '../types'

function hashId(id: string, seed: number): number {
  let h = seed
  for (let i = 0; i < id.length; i++) h = ((h << 5) - h + id.charCodeAt(i)) | 0
  return Math.abs(h) / 2147483647
}

function getFlowerType(crystal: Crystal): { scale: number; petalCount: number; layers: number } {
  const { difficulty, reuseValue } = crystal
  if (difficulty === '较难' || (difficulty === '中等' && reuseValue >= 4)) {
    return { scale: 1.0, petalCount: 7 + reuseValue, layers: 3 }
  }
  if (difficulty === '中等' || (difficulty === '简单' && reuseValue >= 4)) {
    return { scale: 0.7, petalCount: 5 + reuseValue, layers: 2 }
  }
  return { scale: 0.4, petalCount: 4 + reuseValue, layers: 1 }
}

// ─── Glass Petal ───
function GlassPetal({ position, rotation, color, scale: s, layer }: {
  position: [number, number, number]
  rotation: [number, number, number]
  color: THREE.Color
  scale: number
  layer: number
}) {
  const petalLen = s * (0.25 - layer * 0.04)
  const petalW = s * (0.08 - layer * 0.01)

  return (
    <mesh position={position} rotation={rotation}>
      <coneGeometry args={[petalW, petalLen, 5, 1]} />
      <meshPhysicalMaterial
        color={color}
        roughness={0.15}
        metalness={0.05}
        clearcoat={0.1}
        transparent
        opacity={0.65 + layer * 0.1}
        depthWrite
      />
    </mesh>
  )
}

// ─── Blooming Flower ───
function CrystalFlower({ flower }: {
  flower: { crystal: Crystal; position: [number, number, number]; scale: number; petalCount: number; layers: number }
}) {
  const groupRef = useRef<THREE.Group>(null)
  const bloomRef = useRef(0)
  const { crystal, scale, petalCount, layers } = flower
  const theme = crystal?.theme || 'blue-green'
  const colors = THEME_COLORS[theme]
  const primary = useMemo(() => new THREE.Color(colors.primary), [colors.primary])
  const glow = useMemo(() => new THREE.Color(colors.glow), [colors.glow])
  const petalAngle = (Math.PI * 2) / Math.max(petalCount, 1)

  useFrame((_, delta) => {
    bloomRef.current = Math.min(1, bloomRef.current + delta * 1.2)
    const b = bloomRef.current
    // Ease out cubic
    const ease = 1 - Math.pow(1 - b, 3)
    if (groupRef.current) {
      groupRef.current.scale.setScalar(ease)
      const sway = Math.sin(Date.now() * 0.0008 + flower.position[0]) * 0.02 * ease
      groupRef.current.position.y = flower.position[1] + sway
      groupRef.current.rotation.y += delta * 0.1
    }
  })

  return (
    <group ref={groupRef} position={flower.position} scale={0}>
      {/* Stem — thin glass rod */}
      <mesh position={[0, -0.25, 0]}>
        <cylinderGeometry args={[0.015, 0.025, 0.5 * scale, 6]} />
        <meshPhysicalMaterial color={primary} roughness={0.2} metalness={0.1} transparent opacity={0.4} depthWrite />
      </mesh>

      {/* Petal layers */}
      {Array.from({ length: layers }).map((_, layer) => (
        <group key={layer} position={[0, 0.04 * layer, 0]}>
          {Array.from({ length: petalCount }).map((_, i) => {
            const angle = i * petalAngle + layer * (petalAngle * 0.35)
            const petalLen = scale * (0.22 - layer * 0.04)
            const tiltOut = 0.45 + layer * 0.18
            return (
              <GlassPetal
                key={i}
                position={[
                  Math.cos(angle) * petalLen * 0.35,
                  petalLen * 0.28,
                  Math.sin(angle) * petalLen * 0.35,
                ]}
                rotation={[tiltOut, -angle, Math.PI * 0.08 * (layer + 1)]}
                color={i % 2 === 0 ? primary : glow}
                scale={scale}
                layer={layer}
              />
            )
          })}
        </group>
      ))}

      {/* Inner stamen cluster */}
      {Array.from({ length: 6 }).map((_, i) => {
        const a = (i / 6) * Math.PI * 2
        return (
          <mesh key={`st-${i}`} position={[Math.cos(a) * scale * 0.04, scale * 0.02, Math.sin(a) * scale * 0.04]}>
            <sphereGeometry args={[scale * 0.025, 6, 6]} />
            <meshBasicMaterial color={glow} transparent opacity={0.7} depthWrite={false} />
          </mesh>
        )
      })}

      {/* Center gem — the crystal core */}
      <mesh position={[0, 0.02, 0]}>
        <octahedronGeometry args={[scale * 0.04, 0]} />
        <meshBasicMaterial color={glow} transparent opacity={0.9} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>

      <pointLight color={glow} intensity={0.4 * scale} distance={2.5} decay={2} />
    </group>
  )
}

// ─── Fragment Soil ───
function FragmentSoil({ count }: { count: number }) {
  const ref = useRef<THREE.Points>(null)
  const { positions, colors } = useMemo(() => {
    const n = Math.max(60, count * 15)
    const pos = new Float32Array(n * 3)
    const cols = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) {
      const r = Math.random() * 4.5
      const angle = Math.random() * Math.PI * 2
      pos[i * 3] = Math.cos(angle) * r
      pos[i * 3 + 1] = -2.5 + Math.random() * 0.3
      pos[i * 3 + 2] = Math.sin(angle) * r
      // Mix crystal theme colors
      const hue = 0.55 + Math.random() * 0.25
      const c = new THREE.Color().setHSL(hue, 0.4, 0.15 + Math.random() * 0.2)
      cols[i * 3] = c.r; cols[i * 3 + 1] = c.g; cols[i * 3 + 2] = c.b
    }
    return { positions: pos, colors: cols }
  }, [count])

  useFrame((_, delta) => { if (ref.current) ref.current.rotation.y += delta * 0.03 })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.04} vertexColors transparent opacity={0.5} blending={THREE.AdditiveBlending} depthWrite={false} />
    </points>
  )
}

// ─── Ambient Fireflies ───
function Fireflies() {
  const ref = useRef<THREE.Points>(null)
  const positions = useMemo(() => {
    const n = 40
    const p = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) {
      p[i * 3] = (Math.random() - 0.5) * 8
      p[i * 3 + 1] = -2 + Math.random() * 5
      p[i * 3 + 2] = (Math.random() - 0.5) * 8
    }
    return p
  }, [])
  useFrame((_, delta) => { if (ref.current) { ref.current.position.y += Math.sin(Date.now() * 0.0005) * delta * 0.3; ref.current.rotation.y += delta * 0.02 } })
  return (
    <points ref={ref}>
      <bufferGeometry><bufferAttribute attach="attributes-position" args={[positions, 3]} /></bufferGeometry>
      <pointsMaterial size={0.04} color="#ccbbff" transparent opacity={0.25} blending={THREE.AdditiveBlending} depthWrite={false} />
    </points>
  )
}

// ─── Fragment → Flower conversion ───
const FRAGMENT_COST = { 晶王: 60, 晶簇: 35, 晶花: 15, 晶芽: 5 } as const
type FlowerTier = keyof typeof FRAGMENT_COST

function computeFlowers(mastered: Crystal[], plantedBlooms: { tier: string; theme: string }[], spentFragments: number) {
  // Total fragments earned from mastered crystals
  const totalEarned = mastered.reduce((sum, c) =>
    sum + (c.difficulty === '较难' ? 10 : c.difficulty === '中等' ? 6 : 3), 0
  )
  const available = totalEarned - spentFragments

  // Convert planted blooms to flower data
  const blooms = plantedBlooms.map((b) => ({
    tier: b.tier as FlowerTier,
    theme: b.theme as Crystal['theme'],
    scale: b.tier === '晶王' ? 1.4 : b.tier === '晶簇' ? 1.0 : b.tier === '晶花' ? 0.65 : 0.35,
    layers: b.tier === '晶王' ? 4 : b.tier === '晶簇' ? 3 : b.tier === '晶花' ? 2 : 1,
  }))

  return { blooms, availableFragments: available, totalEarned }
}

// ─── Scene ───
function Scene() {
  const crystals = useStore((s) => s.crystals)
  const plantedBlooms = useStore((s) => s.plantedBlooms)
  const spentFragments = useStore((s) => s.spentFragments)
  const mastered = useMemo(() => crystals.filter((c) => c.mastered), [crystals])
  const { blooms } = useMemo(
    () => computeFlowers(mastered, plantedBlooms, spentFragments),
    [mastered, plantedBlooms, spentFragments],
  )

  const flowers = useMemo(() =>
    blooms.map((b, i) => ({
      tier: b.tier,
      position: [
        (hashId(`f-${i}`, 2) - 0.5) * 5,
        -2.2 + hashId(`f-${i}`, 3) * 0.4,
        (hashId(`f-${i}`, 4) - 0.5) * 5,
      ] as [number, number, number],
      scale: b.scale,
      petalCount: 5 + Math.floor(hashId(`f-${i}`, 1) * 7),
      layers: b.layers,
      theme: b.theme,
      tier: b.tier,
    }))
  , [blooms])

  return (
    <>
      <ambientLight intensity={0.25} />
      <pointLight position={[6, 6, 6]} intensity={0.4} color="#4466cc" />
      <pointLight position={[-5, -2, -5]} intensity={0.3} color="#8844aa" />
      <pointLight position={[3, -4, 4]} intensity={0.35} color="#3388aa" />
      <fog attach="fog" args={['#02030a', 5, 16]} />

      <FragmentSoil count={mastered.length} />
      <Fireflies />

      {flowers.map((f, i) => (
        <CrystalFlower key={`flower-${i}`} flower={{
          crystal: { theme: f.theme } as Crystal,
          position: f.position,
          scale: f.scale,
          petalCount: f.petalCount,
          layers: f.layers,
        }} />
      ))}

      <OrbitControls
        enableDamping dampingFactor={0.08}
        minDistance={3} maxDistance={12}
        maxPolarAngle={Math.PI * 0.65}
        autoRotate autoRotateSpeed={0.15}
        target={[0, -1.6, 0]}
      />
    </>
  )
}

export default function CelestialPage() {
  const navigate = useNavigate()
  const crystals = useStore((s) => s.crystals)
  const plantedBlooms = useStore((s) => s.plantedBlooms)
  const spentFragments = useStore((s) => s.spentFragments)
  const plantFlower = useStore((s) => s.plantFlower)
  const mastered = useMemo(() => crystals.filter((c) => c.mastered), [crystals])
  const { blooms, availableFragments, totalEarned } = useMemo(
    () => computeFlowers(mastered, plantedBlooms, spentFragments),
    [mastered, plantedBlooms, spentFragments],
  )

  const masteredCount = mastered.length
  const 晶芽 = blooms.filter((b) => b.tier === '晶芽').length
  const 晶花 = blooms.filter((b) => b.tier === '晶花').length
  const 晶簇 = blooms.filter((b) => b.tier === '晶簇').length
  const 晶王 = blooms.filter((b) => b.tier === '晶王').length

  const tiers: { tier: FlowerTier; cost: number; label: string; desc: string }[] = [
    { tier: '晶芽', cost: 5, label: '晶芽', desc: '小巧单层' },
    { tier: '晶花', cost: 15, label: '晶花', desc: '双瓣绽放' },
    { tier: '晶簇', cost: 35, label: '晶簇', desc: '多层璀璨' },
    { tier: '晶王', cost: 60, label: '晶王', desc: '繁复层叠' },
  ]

  const plant = (tier: FlowerTier) => {
    const cost = FRAGMENT_COST[tier]
    if (availableFragments < cost) return
    plantFlower(tier, mastered[0]?.theme || 'blue-green')
  }

  return (
    <div className="w-full h-full relative bg-[#02030a]">
      {masteredCount === 0 ? (
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
          <button onClick={() => navigate('/')} className="text-white/35 text-sm hover:text-white/55 transition-colors">
            ← 返回星系
          </button>
        </div>
      ) : (
        <Canvas
          camera={{ position: [0, 1.5, 7], fov: 45 }}
          gl={{ antialias: true, alpha: false, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.2 }}
          style={{ background: '#02030a' }}
        >
          <Suspense fallback={null}>
            <Scene />
          </Suspense>
        </Canvas>
      )}

      {/* Top bar */}
      <div className="absolute top-6 left-5 right-5 flex items-end justify-between z-10 pointer-events-none">
        <button onClick={() => navigate('/')} className="pointer-events-auto flex items-center gap-1.5 min-h-[44px] text-white/40 hover:text-white/70 transition-colors text-sm">
          <span className="text-lg leading-none">‹</span>
          <span>星系</span>
        </button>
        <span className="text-white/30 text-xs tracking-wider">沉 淀</span>
      </div>

      {masteredCount > 0 && (
        <div className="absolute top-20 right-5 z-10 text-right">
          <p className="text-white/30 text-xs tracking-wider">
            {晶芽} 晶芽 · {晶花} 晶花 · {晶簇} 晶簇{晶王 > 0 && ` · ${晶王} 晶王`}
          </p>
          <p className="text-white/20 text-[11px] mt-0.5">
            {availableFragments} 碎片可用 · 累计 {totalEarned}
          </p>
        </div>
      )}

      {/* Planting bar — show when there are fragments available */}
      {masteredCount > 0 && (
        <div className="absolute bottom-20 left-5 right-5 z-10">
          <div className="flex justify-center gap-2">
            {tiers.map((t) => {
              const canAfford = availableFragments >= t.cost
              return (
                <button
                  key={t.tier}
                  onClick={() => plant(t.tier)}
                  disabled={!canAfford}
                  className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl border transition-all min-w-[72px] ${
                    canAfford
                      ? 'bg-white/[0.06] border-white/[0.12] text-white/60 hover:bg-white/[0.1] hover:text-white/80 active:scale-95'
                      : 'bg-white/[0.02] border-white/[0.04] text-white/15 cursor-not-allowed'
                  }`}
                >
                  <span className="text-[10px] tracking-wider">{t.label}</span>
                  <span className={`text-[9px] ${canAfford ? 'text-white/30' : 'text-white/10'}`}>
                    {t.cost} 碎片
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {masteredCount > 0 && (
        <div className="absolute bottom-6 left-0 right-0 text-center pointer-events-none z-10 safe-bottom">
          <p className="text-white/15 text-xs">
            <span className="hint-desktop">拖拽旋转 · 滚轮缩放 · 右键平移</span>
            <span className="hint-mobile">单指旋转 · 双指缩放 · 双指平移</span>
          </p>
        </div>
      )}
    </div>
  )
}
