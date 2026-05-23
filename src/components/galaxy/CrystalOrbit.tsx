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

function createWordTexture(word: string, color: string, opacity: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 128
  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  // Glow layers
  ctx.shadowColor = color
  ctx.shadowBlur = 18
  ctx.font = 'bold 32px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  // Draw multiple times for glow effect
  for (let i = 3; i >= 0; i--) {
    ctx.shadowBlur = 8 + i * 6
    ctx.fillStyle = i === 0 ? color : `rgba(255,255,255,${0.15 + i * 0.1})`
    ctx.fillText(word, 128, 64)
  }

  const tex = new THREE.CanvasTexture(canvas)
  tex.minFilter = THREE.LinearFilter
  tex.magFilter = THREE.LinearFilter
  tex.needsUpdate = true
  return tex
}

export default function CrystalOrbit({ crystal, position, onClick }: CrystalOrbitProps) {
  const groupRef = useRef<THREE.Group>(null)
  const crystalGroupRef = useRef<THREE.Group>(null)
  const colors = THEME_COLORS[crystal.theme]
  const brightness = crystal.mastered ? 1 : 0.35

  // Split into words and distribute around ellipse
  const words = useMemo(() => crystal.english.split(' '), [crystal.english])

  const wordData = useMemo(() => {
    const a = 2.0
    const b = 0.7
    const theta = 0.25
    return words.map((word, i) => {
      const angle = (i / words.length) * Math.PI * 2 - Math.PI / 2
      const x = Math.cos(angle) * a
      const y = 0
      const z = Math.sin(angle) * b
      const tex = createWordTexture(word, colors.glow, brightness)
      return { word, position: [x, y, z] as [number, number, number], angle, tex }
    })
  }, [words, colors.glow, brightness])

  const orbitGeometry = useMemo(() => {
    const a = 2.0
    const b = 0.7
    const segments = 128
    const points: THREE.Vector3[] = []
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2
      points.push(new THREE.Vector3(Math.cos(angle) * a, 0, Math.sin(angle) * b))
    }
    const curve = new THREE.CatmullRomCurve3(points, true)
    return new THREE.TubeGeometry(curve, 64, 0.012, 6, true)
  }, [])

  const particlePositions = useMemo(() => {
    const a = 2.0
    const b = 0.7
    const count = 120
    const positions: [number, number, number][] = []
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2
      const x = Math.cos(angle) * a
      const z = Math.sin(angle) * b
      positions.push([x, 0, z])
    }
    return positions
  }, [])

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.25
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
      {/* === ORBIT RING (planetary ring style) === */}
      <mesh geometry={orbitGeometry} rotation={[0.25, 0, 0.15]}>
        <meshBasicMaterial
          color={crystalColor}
          transparent
          opacity={0.18 * brightness}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Second thinner ring for depth */}
      <mesh geometry={orbitGeometry} rotation={[0.25, 0, 0.15]} scale={[1.04, 1, 1.04]}>
        <meshBasicMaterial
          color={colors.glow}
          transparent
          opacity={0.06 * brightness}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* === PARTICLE LIGHT BAND === */}
      {particlePositions.map((pos, i) => {
        const size = i % 5 === 0 ? 0.035 : i % 3 === 0 ? 0.022 : 0.012
        return (
          <mesh key={`p-${i}`} position={pos} rotation={[0.25, 0, 0.15]}>
            <sphereGeometry args={[size, 4, 4]} />
            <meshBasicMaterial
              color={i % 7 === 0 ? '#ffffff' : i % 3 === 0 ? colors.glow : colors.primary}
              transparent
              opacity={(0.3 + (i % 3) * 0.2) * brightness}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
        )
      })}

      {/* === WORD SPRITES ALONG ORBIT === */}
      {wordData.map(({ word, position: wpos, tex }) => (
        <sprite
          key={word}
          position={[wpos[0], wpos[1] + 0.06, wpos[2]]}
          scale={[1.4, 0.7, 1]}
        >
          <spriteMaterial
            map={tex}
            transparent
            opacity={0.85 * brightness}
            blending={THREE.NormalBlending}
            depthWrite={false}
            depthTest={true}
          />
        </sprite>
      ))}

      {/* === CRYSTAL CORE === */}
      <group ref={crystalGroupRef} onClick={onClick}
        onPointerOver={() => { document.body.style.cursor = 'pointer' }}
        onPointerOut={() => { document.body.style.cursor = 'auto' }}
      >
        {/* Main crystal - elongated octahedron (diamond shape) */}
        <mesh>
          <octahedronGeometry args={[0.4, 0]} />
          <meshStandardMaterial
            color={crystalColor}
            emissive={emissiveColor}
            emissiveIntensity={0.6 * brightness}
            metalness={0.1}
            roughness={0.15}
            transparent
            opacity={0.88}
          />
        </mesh>

        {/* Crystal wireframe shell */}
        <mesh scale={1.08}>
          <octahedronGeometry args={[0.4, 0]} />
          <meshBasicMaterial
            color={colors.glow}
            wireframe
            transparent
            opacity={0.4 * brightness}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>

        {/* Inner bright core */}
        <mesh scale={0.45}>
          <octahedronGeometry args={[0.35, 0]} />
          <meshBasicMaterial
            color={colors.glow}
            transparent
            opacity={0.6 * brightness}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>

        {/* Crystal shards - small floating fragments */}
        {[[0.55, 0.3, 0.2, 0.5], [-0.4, -0.45, -0.3, 0.4], [0.3, -0.5, -0.35, 0.35], [-0.5, 0.35, -0.25, 0.45]].map(([x, y, z, s], i) => (
          <mesh key={`shard-${i}`} position={[x, y, z]} rotation={[i * 0.8, i * 1.1, i * 0.5]}>
            <tetrahedronGeometry args={[0.1 * s, 0]} />
            <meshBasicMaterial
              color={i % 2 === 0 ? colors.glow : colors.primary}
              transparent
              opacity={0.5 * brightness}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
        ))}

        {/* Glow aura - transparent sphere */}
        <mesh scale={1.6}>
          <sphereGeometry args={[0.4, 16, 16]} />
          <meshBasicMaterial
            color={colors.glow}
            transparent
            opacity={0.08 * brightness}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>

        {/* Point light */}
        <pointLight
          color={colors.glow}
          intensity={1.2 * brightness}
          distance={3}
          decay={2}
        />
      </group>
    </group>
  )
}
