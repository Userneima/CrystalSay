import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { THEME_COLORS } from '../../utils/themeMapping'
import type { Crystal } from '../../types'

function parseHex(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  return [r, g, b]
}

function createCrystalPattern(
  difficulty: string,
  primaryRgb: [number, number, number],
  glowRgb: [number, number, number],
): THREE.CanvasTexture {
  const S = 256
  const canvas = document.createElement('canvas')
  canvas.width = S
  canvas.height = S
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = 'rgba(0,0,0,0.5)'
  ctx.fillRect(0, 0, S, S)

  const primaryStr = `rgba(${Math.round(primaryRgb[0] * 255)},${Math.round(primaryRgb[1] * 255)},${Math.round(primaryRgb[2] * 255)}`
  const glowStr = `rgba(${Math.round(glowRgb[0] * 255)},${Math.round(glowRgb[1] * 255)},${Math.round(glowRgb[2] * 255)}`

  const seed = (x: number, y: number) => {
    let h = (x * 374761393 + y * 668265263 + 1274126177) | 0
    h = ((h ^ (h >>> 13)) * 1274126177) | 0
    return (h ^ (h >>> 16)) / 2147483647
  }

  const cellCount = difficulty === '简单' ? 2 : difficulty === '中等' ? 4 : 7
  const lineCount = difficulty === '简单' ? 6 : difficulty === '中等' ? 16 : 35
  const glowAlpha = difficulty === '简单' ? 0.08 : difficulty === '中等' ? 0.2 : 0.4
  const primaryAlpha = difficulty === '简单' ? 0.12 : difficulty === '中等' ? 0.3 : 0.55

  const grid = cellCount + 2
  const cellSize = S / grid
  for (let gx = 0; gx < grid; gx++) {
    for (let gy = 0; gy < grid; gy++) {
      const cx = gx * cellSize + cellSize * 0.5 + (seed(gx, gy) - 0.5) * cellSize * 0.5
      const cy = gy * cellSize + cellSize * 0.5 + (seed(gy, gx + 100) - 0.5) * cellSize * 0.5
      const n = 3 + Math.floor(seed(gx + 200, gy) * 3)
      const r = cellSize * (0.5 + seed(gx, gy + 300) * 0.5)
      ctx.beginPath()
      for (let v = 0; v <= n; v++) {
        const angle = (v / n) * Math.PI * 2 + seed(gx, gy) * 0.4
        if (v === 0) ctx.moveTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r)
        else ctx.lineTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r)
      }
      ctx.closePath()
      if (seed(gx + 400, gy) < glowAlpha * 0.5) {
        ctx.fillStyle = `${glowStr},${glowAlpha * 0.4})`
        ctx.fill()
      }
    }
  }

  for (let i = 0; i < lineCount; i++) {
    const sx = seed(i, 0) * S
    const sy = seed(i, 1) * S
    const angle = seed(i, 2) * Math.PI
    const len = S * (0.25 + seed(i, 3) * 1)
    ctx.beginPath()
    ctx.moveTo(sx, sy)
    ctx.lineTo(sx + Math.cos(angle) * len, sy + Math.sin(angle) * len)
    ctx.strokeStyle = i % 3 === 0 ? `${glowStr},${glowAlpha})` : `${primaryStr},${primaryAlpha})`
    ctx.lineWidth = i % 5 === 0 ? 2 : 1.2
    ctx.stroke()
  }

  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.RepeatWrapping
  tex.minFilter = THREE.LinearMipmapLinearFilter
  tex.magFilter = THREE.LinearFilter
  tex.generateMipmaps = true
  tex.needsUpdate = true
  return tex
}

const SHARD_PRESETS: Record<string, [number, number, number, number][]> = {
  '简单': [[0.5, 0.35, 0.2, 0.35]],
  '中等': [
    [0.55, 0.3, 0.2, 0.5], [-0.4, -0.45, -0.3, 0.4],
    [0.3, -0.5, -0.35, 0.35], [-0.5, 0.35, -0.25, 0.45],
  ],
  '较难': [
    [0.6, 0.35, 0.25, 0.45], [-0.45, -0.5, -0.35, 0.4],
    [0.35, -0.55, -0.4, 0.38], [-0.55, 0.4, -0.3, 0.42],
    [0.15, 0.6, 0.45, 0.35], [-0.2, -0.6, 0.4, 0.33],
    [0.6, -0.15, -0.5, 0.36], [-0.6, -0.1, -0.45, 0.34],
  ],
}

function CrystalMesh({ crystal, animateBright }: { crystal: Crystal; animateBright: boolean }) {
  const groupRef = useRef<THREE.Group>(null)
  const mainMatRef = useRef<THREE.MeshStandardMaterial>(null)
  const wfMatRef = useRef<THREE.MeshBasicMaterial>(null)
  const wf2MatRef = useRef<THREE.MeshBasicMaterial>(null)
  const innerMatRef = useRef<THREE.MeshBasicMaterial>(null)
  const lightRef = useRef<THREE.PointLight>(null)
  const shardMatsRef = useRef<THREE.MeshBasicMaterial[]>([])
  const glowRef = useRef<THREE.Mesh>(null)

  const colors = THEME_COLORS[crystal.theme]
  const difficulty = crystal.difficulty
  const reuseValue = crystal.reuseValue
  const coreSize = 0.28 + reuseValue * 0.08

  const targetBrightness = animateBright ? 1.0 : (crystal.mastered ? 1.0 : 0.35)
  const bRef = useRef(crystal.mastered ? 1.0 : 0.35)

  const geometryDetail = difficulty === '简单' ? 0 : difficulty === '中等' ? 0 : 1
  const wireframeDetail = difficulty === '简单' ? 0 : difficulty === '中等' ? 1 : 2
  const shardDefs = SHARD_PRESETS[difficulty] ?? SHARD_PRESETS['中等']

  const primaryRgb = useMemo(() => parseHex(colors.primary), [colors.primary])
  const glowRgb = useMemo(() => parseHex(colors.glow), [colors.glow])
  const patternTex = useMemo(() => createCrystalPattern(difficulty, primaryRgb, glowRgb), [difficulty, primaryRgb, glowRgb])

  const crystalColor = new THREE.Color(colors.primary)
  const emissiveColor = new THREE.Color(colors.glow)

  const b = bRef.current

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.6
      groupRef.current.rotation.z += delta * 0.15
    }
    // Smooth brightness lerp
    bRef.current += (targetBrightness - bRef.current) * Math.min(delta * 3, 1)
    const bv = bRef.current

    // Directly update material properties for smooth animation
    if (mainMatRef.current) {
      mainMatRef.current.emissiveIntensity = 0.4 * bv
    }
    if (wfMatRef.current) {
      wfMatRef.current.opacity = (difficulty === '较难' ? 0.4 : difficulty === '中等' ? 0.25 : 0.12) * bv
    }
    if (wf2MatRef.current) {
      wf2MatRef.current.opacity = (difficulty === '较难' ? 0.16 : 0.07) * bv
    }
    if (innerMatRef.current) {
      innerMatRef.current.opacity = 0.5 * bv
    }
    shardMatsRef.current.forEach((mat, i) => {
      if (mat) mat.opacity = (difficulty === '较难' ? 0.55 : 0.35) * bv
    })
    if (lightRef.current) {
      const pulse = crystal.mastered ? (1 + Math.sin(Date.now() * 0.003) * 0.2) : 1
      lightRef.current.intensity = 1.2 * bv * pulse
    }
    // Pulsing glow aura when mastered
    if (glowRef.current && crystal.mastered) {
      const pulse = 1 + Math.sin(Date.now() * 0.003) * 0.15
      glowRef.current.scale.setScalar(1.8 * pulse)
      ;(glowRef.current.material as THREE.MeshBasicMaterial).opacity = 0.05 * pulse
    }
  })

  return (
    <group ref={groupRef}>
      {/* Main crystal with pattern */}
      <mesh>
        <octahedronGeometry args={[coreSize, geometryDetail]} />
        <meshStandardMaterial
          ref={mainMatRef}
          map={patternTex}
          color={crystalColor}
          emissive={emissiveColor}
          emissiveIntensity={0.4 * b}
          metalness={difficulty === '较难' ? 0.2 : 0.06}
          roughness={difficulty === '较难' ? 0.1 : difficulty === '中等' ? 0.15 : 0.22}
          transparent opacity={0.92}
        />
      </mesh>

      {/* Wireframe */}
      <mesh scale={1.08}>
        <octahedronGeometry args={[coreSize, wireframeDetail]} />
        <meshBasicMaterial
          ref={wfMatRef}
          color={colors.glow} wireframe transparent
          opacity={(difficulty === '较难' ? 0.4 : difficulty === '中等' ? 0.25 : 0.12) * b}
          blending={THREE.AdditiveBlending} depthWrite={false}
        />
      </mesh>

      {(difficulty === '中等' || difficulty === '较难') && (
        <mesh scale={1.16} rotation={[0.15, 0.3, 0.08]}>
          <octahedronGeometry args={[coreSize, wireframeDetail]} />
          <meshBasicMaterial
            ref={wf2MatRef}
            color="#ffffff" wireframe transparent
            opacity={(difficulty === '较难' ? 0.16 : 0.07) * b}
            blending={THREE.AdditiveBlending} depthWrite={false}
          />
        </mesh>
      )}

      {difficulty === '较难' && (
        <mesh scale={0.62} rotation={[0.3, 0.45, 0.15]}>
          <octahedronGeometry args={[coreSize, 1]} />
          <meshBasicMaterial
            color={emissiveColor} wireframe transparent
            opacity={0.22 * b}
            blending={THREE.AdditiveBlending} depthWrite={false}
          />
        </mesh>
      )}

      {/* Inner core */}
      <mesh scale={0.38}>
        <octahedronGeometry args={[coreSize * 0.9, difficulty === '较难' ? 1 : 0]} />
        <meshBasicMaterial
          ref={innerMatRef}
          color={colors.glow} transparent opacity={0.5 * b}
          blending={THREE.AdditiveBlending} depthWrite={false}
        />
      </mesh>

      {/* Shards */}
      {shardDefs.map(([x, y, z, s], i) => (
        <mesh key={`shard-${i}`} position={[x * coreSize, y * coreSize, z * coreSize]} rotation={[i * 0.8, i * 1.1, i * 0.5]}>
          <tetrahedronGeometry args={[coreSize * s * 0.6, difficulty === '较难' ? 1 : 0]} />
          <meshBasicMaterial
            ref={(el) => { if (el) shardMatsRef.current[i] = el }}
            color={i % 2 === 0 ? colors.glow : colors.primary} transparent
            opacity={(difficulty === '较难' ? 0.55 : 0.35) * b}
            blending={THREE.AdditiveBlending} depthWrite={false}
          />
        </mesh>
      ))}

      {/* Ambient particles */}
      {Array.from({ length: 12 }).map((_, i) => {
        const angle = (i / 12) * Math.PI * 2
        const r = coreSize * 1.8
        return (
          <mesh key={`p-${i}`} position={[Math.cos(angle) * r, (Math.sin(i * 3) * 0.6) * coreSize, Math.sin(angle) * r]}>
            <sphereGeometry args={[0.03, 4, 4]} />
            <meshBasicMaterial
              color={i % 3 === 0 ? colors.glow : colors.primary} transparent
              opacity={0.4 * b}
              blending={THREE.AdditiveBlending} depthWrite={false}
            />
          </mesh>
        )
      })}

      {/* Point light */}
      <pointLight ref={lightRef} color={colors.glow} intensity={1.5 * b} distance={coreSize * 8} decay={2} />
    </group>
  )
}

export default function CrystalHero({ crystal, animateBright = false }: { crystal: Crystal; animateBright?: boolean }) {
  return (
    <div className="w-full flex justify-center">
      <div className="relative w-32 h-32 sm:w-36 sm:h-36">
        <Canvas
          camera={{ position: [0, 0.2, 2.8], fov: 35 }}
          gl={{ antialias: true, alpha: true, premultipliedAlpha: false }}
          style={{ background: 'transparent' }}
          onCreated={({ gl }) => { gl.setClearColor(0x000000, 0) }}
        >
          <ambientLight intensity={0.3} />
          <CrystalMesh crystal={crystal} animateBright={animateBright} />
        </Canvas>
      </div>
    </div>
  )
}
