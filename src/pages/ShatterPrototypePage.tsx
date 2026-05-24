import { Suspense, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import CrystalOrbit from '../components/galaxy/CrystalOrbit'
import Starfield from '../components/galaxy/Starfield'
import type { Crystal, Theme } from '../types'
import { THEME_COLORS } from '../utils/themeMapping'

const BASE_CRYSTAL: Crystal = {
  id: 'prototype-crystal',
  name: '早该告诉你',
  english: 'I should have told you sooner',
  chinese: '我早该告诉你',
  chunks: ['I should have', 'told you', 'sooner'],
  difficulty: '较难',
  topicTag: '社交',
  usageScene: '承认自己本该更早说明',
  expressionFunction: '表达迟到的坦诚',
  reuseValue: 5,
  visualHint: '当前产品内的八面体晶体形态',
  theme: 'amethyst',
  mastered: true,
  practicedAt: new Date().toISOString(),
}

const THEME_OPTIONS: { theme: Theme; label: string }[] = [
  { theme: 'amethyst', label: '紫' },
  { theme: 'blue-green', label: '青' },
  { theme: 'amber', label: '金' },
]

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3)
}

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

function clamp(n: number, min = 0, max = 1) {
  return Math.max(min, Math.min(max, n))
}

function seeded(index: number, salt: number) {
  const x = Math.sin(index * 9283.17 + salt * 192.31) * 43758.5453
  return x - Math.floor(x)
}

function makeLineGeometry(points: [number, number, number][]) {
  const geometry = new THREE.BufferGeometry()
  geometry.setFromPoints(points.map((p) => new THREE.Vector3(...p)))
  return geometry
}

function CrackLines({ theme }: { theme: Theme }) {
  const groupRef = useRef<THREE.Group>(null)
  const materialRefs = useRef<THREE.LineBasicMaterial[]>([])
  const colors = THEME_COLORS[theme]
  const geometries = useMemo(
    () => [
      makeLineGeometry([[0, 0.55, 0.02], [0.08, 0.2, 0.08], [-0.08, -0.08, 0.05], [0.12, -0.42, 0.02]]),
      makeLineGeometry([[-0.38, 0.1, 0.04], [-0.1, -0.02, 0.08], [-0.28, -0.36, 0.06]]),
      makeLineGeometry([[0.34, 0.16, 0.04], [0.1, 0.0, 0.08], [0.28, -0.32, 0.05]]),
      makeLineGeometry([[0.02, 0.44, -0.04], [-0.1, 0.12, -0.08], [0.08, -0.18, -0.06]]),
    ],
    [],
  )

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() % 4.8
    const crack = clamp((t - 0.72) / 0.72)
    const flicker = 0.75 + Math.sin(clock.getElapsedTime() * 36) * 0.25
    if (groupRef.current) {
      groupRef.current.visible = t > 0.72 && t < 1.62
      groupRef.current.rotation.y += 0.006
    }
    materialRefs.current.forEach((material, index) => {
      material.opacity = clamp(crack * 1.35 - index * 0.16) * flicker
    })
  })

  return (
    <group ref={groupRef} scale={1.95}>
      {geometries.map((geometry, index) => (
        <line key={index} geometry={geometry}>
          <lineBasicMaterial
            ref={(material) => {
              if (material) materialRefs.current[index] = material
            }}
            color={index % 2 === 0 ? '#ffffff' : colors.glow}
            transparent
            opacity={0}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </line>
      ))}
    </group>
  )
}

function Shockwave({ delay, color }: { delay: number; color: string }) {
  const ref = useRef<THREE.Mesh>(null)
  const materialRef = useRef<THREE.MeshBasicMaterial>(null)

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() % 4.8
    const p = clamp((t - delay) / 0.82)
    if (!ref.current || !materialRef.current) return
    ref.current.visible = p > 0 && p < 1
    ref.current.scale.setScalar(0.15 + easeOutCubic(p) * 3.8)
    materialRef.current.opacity = (1 - p) * 0.42
  })

  return (
    <mesh ref={ref} rotation={[Math.PI / 2.4, 0, 0]}>
      <torusGeometry args={[0.58, 0.012, 8, 96]} />
      <meshBasicMaterial
        ref={materialRef}
        color={color}
        transparent
        opacity={0}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  )
}

interface FragmentData {
  index: number
  start: THREE.Vector3
  burst: THREE.Vector3
  sink: THREE.Vector3
  delay: number
  scale: number
  spin: THREE.Vector3
  color: string
  sinkBound: boolean
}

function Fragment({ data }: { data: FragmentData }) {
  const ref = useRef<THREE.Mesh>(null)
  const trailRef = useRef<THREE.Mesh>(null)
  const materialRef = useRef<THREE.MeshBasicMaterial>(null)
  const trailMaterialRef = useRef<THREE.MeshBasicMaterial>(null)

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() % 4.8
    const p = clamp((t - 1.48 - data.delay) / 1.85)
    if (!ref.current || !trailRef.current || !materialRef.current || !trailMaterialRef.current) return

    const burstP = easeOutCubic(clamp(p / 0.42))
    const sinkP = easeInOutCubic(clamp((p - 0.38) / 0.55))
    const pos = data.start.clone().lerp(data.burst, burstP)
    if (data.sinkBound) pos.lerp(data.sink, sinkP)
    pos.y += Math.sin(p * Math.PI) * 0.45

    ref.current.visible = p > 0 && p < 1
    trailRef.current.visible = p > 0.08 && p < 0.92
    ref.current.position.copy(pos)
    ref.current.rotation.set(data.spin.x * p, data.spin.y * p, data.spin.z * p)
    ref.current.scale.setScalar(data.scale * (1 - p * 0.22))

    const alpha = data.sinkBound ? 1 - clamp((p - 0.86) / 0.12) : 1 - clamp((p - 0.62) / 0.3)
    materialRef.current.opacity = alpha * 0.88

    const direction = pos.clone().sub(data.start).normalize()
    trailRef.current.position.copy(pos.clone().sub(direction.multiplyScalar(0.22)))
    trailRef.current.lookAt(pos)
    trailRef.current.scale.set(0.018, 0.018, 0.34 + p * 0.45)
    trailMaterialRef.current.opacity = alpha * 0.2
  })

  return (
    <>
      <mesh ref={trailRef}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial
          ref={trailMaterialRef}
          color={data.color}
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      <mesh ref={ref}>
        {data.index % 3 === 0 ? <octahedronGeometry args={[0.13, 0]} /> : <tetrahedronGeometry args={[0.14, 0]} />}
        <meshBasicMaterial
          ref={materialRef}
          color={data.color}
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </>
  )
}

function MasterySequence({
  crystal,
  replayKey,
  onPhaseChange,
}: {
  crystal: Crystal
  replayKey: number
  onPhaseChange: (phase: string) => void
}) {
  const crystalRef = useRef<THREE.Group>(null)
  const flashRef = useRef<THREE.MeshBasicMaterial>(null)
  const colors = THEME_COLORS[crystal.theme]
  const fragments = useMemo<FragmentData[]>(() => {
    return Array.from({ length: 24 }, (_, index) => {
      const angle = (index / 24) * Math.PI * 2 + (seeded(index, 1) - 0.5) * 0.4
      const y = (seeded(index, 2) - 0.5) * 1.2
      const radius = 0.32 + seeded(index, 3) * 0.24
      const burstRadius = 1.55 + seeded(index, 4) * 1.75
      const sinkBound = index % 4 === 0 || index === 7 || index === 15
      return {
        index,
        start: new THREE.Vector3(Math.cos(angle) * radius, y, Math.sin(angle) * radius * 0.52),
        burst: new THREE.Vector3(Math.cos(angle) * burstRadius, y + (seeded(index, 5) - 0.35) * 1.2, Math.sin(angle) * burstRadius * 0.62),
        sink: new THREE.Vector3(-4.25 + (seeded(index, 6) - 0.5) * 0.35, -2.65 + (seeded(index, 7) - 0.5) * 0.25, 0.18),
        delay: seeded(index, 8) * 0.2,
        scale: 0.72 + seeded(index, 9) * 0.78,
        spin: new THREE.Vector3(4 + seeded(index, 10) * 8, 5 + seeded(index, 11) * 10, 3 + seeded(index, 12) * 8),
        color: index % 6 === 0 ? '#ffffff' : index % 2 === 0 ? colors.glow : colors.primary,
        sinkBound,
      }
    })
  }, [colors.glow, colors.primary, replayKey])

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() % 4.8
    const charge = clamp(t / 1.05)
    const crack = clamp((t - 0.72) / 0.72)
    const vanish = clamp((t - 1.42) / 0.18)

    if (crystalRef.current) {
      crystalRef.current.visible = t < 1.62
      const pulse = 1 + Math.sin(clock.getElapsedTime() * 16) * 0.015 * crack
      crystalRef.current.scale.setScalar((1 + easeOutCubic(charge) * 0.2 + crack * 0.14) * pulse)
      crystalRef.current.position.x = Math.sin(clock.getElapsedTime() * 42) * crack * 0.025
    }

    if (flashRef.current) {
      const flash = clamp((t - 1.48) / 0.08) * (1 - clamp((t - 1.56) / 0.22))
      flashRef.current.opacity = flash * 0.22
    }

    if (t < 0.76) onPhaseChange('蓄光')
    else if (t < 1.45) onPhaseChange('裂纹')
    else if (t < 2.36) onPhaseChange('解构')
    else if (t < 3.45) onPhaseChange('沉淀')
    else onPhaseChange('+10 碎片')

    if (vanish >= 1 && t > 4.7) {
      onPhaseChange('蓄光')
    }
  })

  return (
    <group key={replayKey}>
      <group ref={crystalRef}>
        <CrystalOrbit crystal={crystal} position={[0, 0, 0]} onClick={() => {}} />
        <CrackLines theme={crystal.theme} />
      </group>

      <Shockwave delay={1.48} color={colors.glow} />
      <Shockwave delay={1.68} color="#ffffff" />

      {fragments.map((fragment) => (
        <Fragment key={fragment.index} data={fragment} />
      ))}

      <mesh position={[0, 0, 0.8]}>
        <planeGeometry args={[18, 12]} />
        <meshBasicMaterial ref={flashRef} color="#ffffff" transparent opacity={0} depthWrite={false} />
      </mesh>

      <mesh position={[-4.25, -2.65, 0]}>
        <octahedronGeometry args={[0.12, 0]} />
        <meshBasicMaterial color={colors.glow} transparent opacity={0.65} blending={THREE.AdditiveBlending} />
        <pointLight color={colors.glow} intensity={1.8} distance={2.2} />
      </mesh>
    </group>
  )
}

function Scene({
  crystal,
  replayKey,
  onPhaseChange,
}: {
  crystal: Crystal
  replayKey: number
  onPhaseChange: (phase: string) => void
}) {
  return (
    <>
      <Starfield />
      <ambientLight intensity={0.26} />
      <pointLight position={[4, 5, 6]} intensity={1.8} color="#b8c7ff" />
      <pointLight position={[-4, -2, 4]} intensity={0.8} color={THEME_COLORS[crystal.theme].glow} />
      <fog attach="fog" args={['#02030a', 10, 32]} />
      <MasterySequence crystal={crystal} replayKey={replayKey} onPhaseChange={onPhaseChange} />
    </>
  )
}

export default function ShatterPrototypePage() {
  const [theme, setTheme] = useState<Theme>('amethyst')
  const [replayKey, setReplayKey] = useState(0)
  const [phase, setPhase] = useState('蓄光')
  const crystal = useMemo(() => ({ ...BASE_CRYSTAL, theme }), [theme])

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#02030a]">
      <Canvas
        camera={{ position: [0, 1.4, 7.6], fov: 42 }}
        gl={{ antialias: true, alpha: false, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.15 }}
        style={{ background: '#02030a' }}
      >
        <Suspense fallback={null}>
          <Scene crystal={crystal} replayKey={replayKey} onPhaseChange={setPhase} />
        </Suspense>
      </Canvas>

      <div className="pointer-events-none absolute top-8 left-0 right-0 z-10 text-center">
        <h1 className="text-white/65 text-[13px] font-bold tracking-[0.34em]">CRYSTAL SAY</h1>
        <p className="mt-1.5 text-white/20 text-[10px] tracking-[0.24em]">掌 握 碎 裂 原 型</p>
      </div>

      <p className="pointer-events-none absolute left-1/2 top-[calc(50%+150px)] -translate-x-1/2 z-10 text-white/25 text-[11px] tracking-[0.18em]">
        {phase}
      </p>

      <div className="pointer-events-none absolute left-8 bottom-7 z-10 flex items-center gap-2 text-white/25 text-xs">
        <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.35">
          <path d="M8 1.5l5.5 4-2.5 8H5l-2.5-8 5.5-4z" />
          <path d="M5 5.5h6" opacity="0.45" />
        </svg>
        <span>沉淀</span>
      </div>

      <div className="absolute bottom-7 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2">
        <button
          type="button"
          onClick={() => setReplayKey((key) => key + 1)}
          className="min-h-[40px] rounded-full border border-white/[0.14] bg-white/[0.05] px-4 text-xs tracking-wider text-white/60 transition-all hover:border-white/25 hover:bg-white/[0.08] hover:text-white/80 active:scale-95"
        >
          重播
        </button>
        {THEME_OPTIONS.map((option) => {
          const colors = THEME_COLORS[option.theme]
          const active = theme === option.theme
          return (
            <button
              key={option.theme}
              type="button"
              onClick={() => {
                setTheme(option.theme)
                setReplayKey((key) => key + 1)
              }}
              aria-label={option.label}
              className={`grid min-h-[40px] w-10 place-items-center rounded-full border transition-all active:scale-95 ${
                active ? 'border-white/30 bg-white/[0.09]' : 'border-white/[0.12] bg-white/[0.04] hover:border-white/25'
              }`}
            >
              <span className="block h-3.5 w-3.5 rounded-full" style={{ background: colors.glow, boxShadow: `0 0 14px ${colors.glow}` }} />
            </button>
          )
        })}
      </div>
    </div>
  )
}
