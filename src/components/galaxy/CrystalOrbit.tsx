import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { THEME_COLORS } from '../../utils/themeMapping'
import type { Crystal } from '../../types'

interface CrystalOrbitProps {
  crystal: Crystal
  position: [number, number, number]
  onClick: () => void
}

// --- helpers ---

function parseHex(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  return [r, g, b]
}

function createWordTexture(word: string, color: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 128
  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.shadowColor = color
  ctx.shadowBlur = 14
  ctx.font = 'bold 27px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  for (let i = 3; i >= 0; i--) {
    ctx.shadowBlur = 6 + i * 5
    ctx.fillStyle = i === 0 ? color : `rgba(255,255,255,${0.12 + i * 0.08})`
    ctx.fillText(word, 128, 64)
  }
  const tex = new THREE.CanvasTexture(canvas)
  tex.minFilter = THREE.LinearFilter
  tex.magFilter = THREE.LinearFilter
  tex.needsUpdate = true
  return tex
}

/**
 * Draw a crystal-like faceted pattern on canvas.
 * Density of facets and linework scales with difficulty.
 */
function createCrystalPattern(
  difficulty: string,
  primaryRgb: [number, number, number],
  glowRgb: [number, number, number],
): THREE.CanvasTexture {
  const S = 512
  const canvas = document.createElement('canvas')
  canvas.width = S
  canvas.height = S
  const ctx = canvas.getContext('2d')!

  // dark translucent base so the material color still dominates
  ctx.fillStyle = 'rgba(0,0,0,0.55)'
  ctx.fillRect(0, 0, S, S)

  const primaryStr = `rgba(${Math.round(primaryRgb[0] * 255)},${Math.round(primaryRgb[1] * 255)},${Math.round(primaryRgb[2] * 255)}`
  const glowStr = `rgba(${Math.round(glowRgb[0] * 255)},${Math.round(glowRgb[1] * 255)},${Math.round(glowRgb[2] * 255)}`

  const seed = (x: number, y: number) => {
    let h = (x * 374761393 + y * 668265263 + 1274126177) | 0
    h = ((h ^ (h >>> 13)) * 1274126177) | 0
    return (h ^ (h >>> 16)) / 2147483647
  }

  // --- facet polygons: draw irregular triangles across the canvas ---
  const cellCount = difficulty === '简单' ? 2 : difficulty === '中等' ? 4 : 8
  const lineCount = difficulty === '简单' ? 8 : difficulty === '中等' ? 22 : 55
  const glowAlpha = difficulty === '简单' ? 0.08 : difficulty === '中等' ? 0.2 : 0.4
  const primaryAlpha = difficulty === '简单' ? 0.12 : difficulty === '中等' ? 0.3 : 0.55

  // --- facet polygons (fills) ---
  const grid = cellCount + 2
  const cellSize = S / grid
  for (let gx = 0; gx < grid; gx++) {
    for (let gy = 0; gy < grid; gy++) {
      const cx = gx * cellSize + cellSize * 0.5 + (seed(gx, gy) - 0.5) * cellSize * 0.6
      const cy = gy * cellSize + cellSize * 0.5 + (seed(gy, gx + 100) - 0.5) * cellSize * 0.6
      const n = 3 + Math.floor(seed(gx + 200, gy) * 4) // 3-6 vertices
      const r = cellSize * (0.6 + seed(gx, gy + 300) * 0.6)

      ctx.beginPath()
      for (let v = 0; v <= n; v++) {
        const angle = (v / n) * Math.PI * 2 + seed(gx, gy) * 0.5
        const x = cx + Math.cos(angle) * r
        const y = cy + Math.sin(angle) * r
        if (v === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.closePath()

      const fillChoice = seed(gx + 400, gy)
      if (fillChoice < glowAlpha * 0.5) {
        ctx.fillStyle = `${glowStr},${glowAlpha * 0.4})`
        ctx.fill()
      } else if (fillChoice < glowAlpha) {
        ctx.fillStyle = `${primaryStr},${primaryAlpha * 0.35})`
        ctx.fill()
      }
    }
  }

  // --- fracture lines ---
  for (let i = 0; i < lineCount; i++) {
    const sx = seed(i, 0) * S
    const sy = seed(i, 1) * S
    const angle = seed(i, 2) * Math.PI
    const len = S * (0.3 + seed(i, 3) * 1.2)
    const ex = sx + Math.cos(angle) * len
    const ey = sy + Math.sin(angle) * len

    ctx.beginPath()
    ctx.moveTo(sx, sy)
    ctx.lineTo(ex, ey)
    ctx.strokeStyle = i % 3 === 0 ? `${glowStr},${glowAlpha})` : `${primaryStr},${primaryAlpha})`
    ctx.lineWidth = i % 7 === 0 ? 2.5 : i % 4 === 0 ? 1.8 : 1.2
    ctx.stroke()

    // branch lines for harder difficulties
    if (difficulty !== '简单' && i % 3 === 0) {
      const bx = sx + (ex - sx) * (0.4 + seed(i, 5) * 0.4)
      const by = sy + (ey - sy) * (0.4 + seed(i, 5) * 0.4)
      const bAngle = angle + (seed(i, 6) - 0.5) * 1.2
      const bLen = len * (0.2 + seed(i, 7) * 0.4)
      ctx.beginPath()
      ctx.moveTo(bx, by)
      ctx.lineTo(bx + Math.cos(bAngle) * bLen, by + Math.sin(bAngle) * bLen)
      ctx.strokeStyle = `${primaryStr},${primaryAlpha * 0.6})`
      ctx.lineWidth = 1
      ctx.stroke()
    }
  }

  // --- 较难: extra concentric detail rings ---
  if (difficulty === '较难') {
    for (let r = 0; r < 4; r++) {
      const radius = S * (0.25 + r * 0.12)
      const cx = S * 0.5 + (seed(r, 10) - 0.5) * S * 0.15
      const cy = S * 0.5 + (seed(r, 11) - 0.5) * S * 0.15
      ctx.beginPath()
      for (let a = 0; a < 8; a++) {
        const angle = (a / 8) * Math.PI * 2 + seed(r, 12) * 0.3
        const x = cx + Math.cos(angle) * radius
        const y = cy + Math.sin(angle) * radius
        if (a === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.closePath()
      ctx.strokeStyle = `${glowStr},${0.15})`
      ctx.lineWidth = 1 + r * 0.3
      ctx.stroke()
    }
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

// --- shard presets ---
const SHARD_PRESETS: Record<string, { positions: [number, number, number, number][]; shardScale: number }> = {
  '简单': {
    shardScale: 0.3,
    positions: [[0.5, 0.35, 0.2, 0.35]],
  },
  '中等': {
    shardScale: 0.5,
    positions: [
      [0.55, 0.3, 0.2, 0.5],
      [-0.4, -0.45, -0.3, 0.4],
      [0.3, -0.5, -0.35, 0.35],
      [-0.5, 0.35, -0.25, 0.45],
    ],
  },
  '较难': {
    shardScale: 0.65,
    positions: [
      [0.6, 0.35, 0.25, 0.45],
      [-0.45, -0.5, -0.35, 0.4],
      [0.35, -0.55, -0.4, 0.38],
      [-0.55, 0.4, -0.3, 0.42],
      [0.15, 0.6, 0.45, 0.35],
      [-0.2, -0.6, 0.4, 0.33],
      [0.6, -0.15, -0.5, 0.36],
      [-0.6, -0.1, -0.45, 0.34],
    ],
  },
}

export default function CrystalOrbit({ crystal, position, onClick }: CrystalOrbitProps) {
  const groupRef = useRef<THREE.Group>(null)
  const crystalGroupRef = useRef<THREE.Group>(null)
  const colors = THEME_COLORS[crystal.theme]

  // --- visual mappings ---
  const reuseValue = crystal.reuseValue
  const difficulty = crystal.difficulty
  const brightness = crystal.mastered ? 1.0 : 0.3
  const coreSize = 0.22 + reuseValue * 0.08

  // difficulty → geometry detail
  const geometryDetail = difficulty === '简单' ? 0 : difficulty === '中等' ? 0 : 1
  const wireframeDetail = difficulty === '简单' ? 0 : difficulty === '中等' ? 1 : 2
  const shardDef = SHARD_PRESETS[difficulty] ?? SHARD_PRESETS['中等']

  // orbit size
  const orbitA = 1.1 + reuseValue * 0.08
  const orbitB = orbitA * 0.36

  // --- pattern texture (memoized) ---
  const primaryRgb = useMemo(() => parseHex(colors.primary), [colors.primary])
  const glowRgb = useMemo(() => parseHex(colors.glow), [colors.glow])
  const patternTex = useMemo(
    () => createCrystalPattern(difficulty, primaryRgb, glowRgb),
    [difficulty, primaryRgb, glowRgb],
  )

  // --- orbit words ---
  const words = useMemo(() => crystal.english.split(' '), [crystal.english])

  const wordData = useMemo(() => {
    return words.map((word, i) => {
      const angle = (i / words.length) * Math.PI * 2 - Math.PI / 2
      const x = Math.cos(angle) * orbitA
      const z = Math.sin(angle) * orbitB
      const tex = createWordTexture(word, colors.glow)
      return { word, position: [x, 0, z] as [number, number, number], tex }
    })
  }, [words, colors.glow, orbitA, orbitB])

  // --- orbit ring geometry ---
  const orbitGeometry = useMemo(() => {
    const segments = 128
    const points: THREE.Vector3[] = []
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2
      points.push(new THREE.Vector3(Math.cos(angle) * orbitA, 0, Math.sin(angle) * orbitB))
    }
    const curve = new THREE.CatmullRomCurve3(points, true)
    return new THREE.TubeGeometry(curve, 56, 0.008, 6, true)
  }, [orbitA, orbitB])

  // --- orbit particle band ---
  const particlePositions = useMemo(() => {
    const count = 80
    const positions: [number, number, number][] = []
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2
      positions.push([Math.cos(angle) * orbitA, 0, Math.sin(angle) * orbitB])
    }
    return positions
  }, [orbitA, orbitB])

  const rotationSpeed = 0.22 + reuseValue * 0.03 + (difficulty === '较难' ? 0.08 : difficulty === '中等' ? 0.04 : 0)

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * rotationSpeed
    }
    if (crystalGroupRef.current) {
      crystalGroupRef.current.rotation.y += delta * 0.4
      crystalGroupRef.current.rotation.z += delta * 0.2
    }
  })

  const crystalColor = new THREE.Color(colors.primary)
  const emissiveColor = new THREE.Color(colors.glow)

  return (
    <group ref={groupRef} position={position}>
      {/* === ORBIT RING === */}
      <mesh geometry={orbitGeometry} rotation={[0.25, 0, 0.15]}>
        <meshBasicMaterial
          color={crystalColor}
          transparent
          opacity={0.15 * brightness}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      <mesh geometry={orbitGeometry} rotation={[0.25, 0, 0.15]} scale={[1.05, 1, 1.05]}>
        <meshBasicMaterial
          color={colors.glow}
          transparent
          opacity={0.05 * brightness}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* === PARTICLE BAND === */}
      {particlePositions.map((pos, i) => {
        const size = i % 5 === 0 ? 0.028 : i % 3 === 0 ? 0.018 : 0.01
        return (
          <mesh key={`p-${i}`} position={pos} rotation={[0.25, 0, 0.15]}>
            <sphereGeometry args={[size, 4, 4]} />
            <meshBasicMaterial
              color={i % 7 === 0 ? '#ffffff' : i % 3 === 0 ? colors.glow : colors.primary}
              transparent
              opacity={(0.25 + (i % 3) * 0.15) * brightness}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
        )
      })}

      {/* === WORD SPRITES === */}
      {wordData.map(({ word, position: wpos, tex }, i) => (
        <sprite key={`${word}-${i}`} position={[wpos[0], wpos[1] + 0.04, wpos[2]]} scale={[1.1, 0.55, 1]}>
          <spriteMaterial
            map={tex}
            transparent
            opacity={0.75 * brightness}
            blending={THREE.NormalBlending}
            depthWrite={false}
            depthTest={true}
          />
        </sprite>
      ))}

      {/* === CRYSTAL CORE === */}
      <group
        ref={crystalGroupRef}
        onPointerOver={() => { document.body.style.cursor = 'pointer' }}
        onPointerOut={() => { document.body.style.cursor = 'auto' }}
      >
        {/* Invisible tap target — large enough for finger taps */}
        <mesh onClick={onClick}>
          <sphereGeometry args={[coreSize * 1.8, 8, 8]} />
          <meshBasicMaterial visible={false} depthWrite={false} />
        </mesh>
        {/* Main crystal — surface pattern via map */}
        <mesh>
          <octahedronGeometry args={[coreSize, geometryDetail]} />
          <meshStandardMaterial
            map={patternTex}
            color={crystalColor}
            emissive={emissiveColor}
            emissiveIntensity={0.35 * brightness}
            metalness={difficulty === '较难' ? 0.25 : 0.08}
            roughness={difficulty === '较难' ? 0.1 : difficulty === '中等' ? 0.15 : 0.22}
            transparent
            opacity={0.92}
          />
        </mesh>

        {/* Wireframe overlay — detail varies by difficulty */}
        <mesh scale={1.08}>
          <octahedronGeometry args={[coreSize, wireframeDetail]} />
          <meshBasicMaterial
            color={colors.glow}
            wireframe
            transparent
            opacity={(difficulty === '较难' ? 0.35 : difficulty === '中等' ? 0.22 : 0.1) * brightness}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>

        {/* 中等+: extra white wireframe ring */}
        {(difficulty === '中等' || difficulty === '较难') && (
          <mesh scale={1.16} rotation={[0.15, 0.3, 0.08]}>
            <octahedronGeometry args={[coreSize, wireframeDetail]} />
            <meshBasicMaterial
              color="#ffffff"
              wireframe
              transparent
              opacity={(difficulty === '较难' ? 0.14 : 0.06) * brightness}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
        )}

        {/* 较难: inner stellated crystal */}
        {difficulty === '较难' && (
          <mesh scale={0.62} rotation={[0.3, 0.45, 0.15]}>
            <octahedronGeometry args={[coreSize, 1]} />
            <meshBasicMaterial
              color={emissiveColor}
              wireframe
              transparent
              opacity={0.2 * brightness}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
        )}

        {/* Inner bright core */}
        <mesh scale={0.4}>
          <octahedronGeometry args={[coreSize * 0.9, difficulty === '较难' ? 1 : 0]} />
          <meshBasicMaterial
            color={colors.glow}
            transparent
            opacity={0.45 * brightness}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>

        {/* Shards */}
        {shardDef.positions.map(([x, y, z, s], i) => (
          <mesh
            key={`shard-${i}`}
            position={[x * coreSize, y * coreSize, z * coreSize]}
            rotation={[i * 0.8, i * 1.1, i * 0.5]}
          >
            <tetrahedronGeometry args={[coreSize * s * shardDef.shardScale, difficulty === '较难' ? 1 : 0]} />
            <meshBasicMaterial
              color={i % 2 === 0 ? colors.glow : colors.primary}
              transparent
              opacity={(difficulty === '较难' ? 0.55 : 0.35) * brightness}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
        ))}

        {/* Glow aura */}
        <mesh scale={2.2}>
          <sphereGeometry args={[coreSize, 16, 16]} />
          <meshBasicMaterial
            color={colors.glow}
            transparent
            opacity={0.05 * brightness}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>

        {/* Point light */}
        <pointLight
          color={colors.glow}
          intensity={1.2 * brightness}
          distance={coreSize * 7}
          decay={2}
        />
      </group>
    </group>
  )
}
