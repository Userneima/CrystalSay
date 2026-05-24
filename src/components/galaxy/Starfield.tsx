import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// Soft radial gradient texture for nebula sprites
function makeNebulaTexture(): THREE.Texture {
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  gradient.addColorStop(0, 'rgba(255,255,255,1)')
  gradient.addColorStop(0.35, 'rgba(255,255,255,0.45)')
  gradient.addColorStop(0.7, 'rgba(255,255,255,0.08)')
  gradient.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

const NEBULAE: { position: [number, number, number]; color: string; scale: number; opacity: number }[] = [
  { position: [-22, 6, -28], color: '#6a3da8', scale: 38, opacity: 0.32 }, // amethyst — back-left
  { position: [26, -4, -32], color: '#1f6f7a', scale: 44, opacity: 0.28 }, // blue-green — back-right
  { position: [4, -16, -18], color: '#a06a2a', scale: 30, opacity: 0.22 }, // amber — bottom
  { position: [-8, 18, -36], color: '#3a4a8a', scale: 36, opacity: 0.24 }, // deep blue — top
]

export default function Starfield() {
  const groupRef = useRef<THREE.Group>(null)
  const nebulaTex = useMemo(() => makeNebulaTexture(), [])

  const { starsGeo, dustGeo } = useMemo(() => {
    // Bright stars - sparse
    const starCount = 800
    const starPositions = new Float32Array(starCount * 3)
    const starColors = new Float32Array(starCount * 3)
    for (let i = 0; i < starCount; i++) {
      const r = 25 + Math.random() * 35
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      starPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      starPositions[i * 3 + 2] = r * Math.cos(phi)
      // Slight color variation
      const hue = 0.55 + Math.random() * 0.2
      const col = new THREE.Color().setHSL(hue, 0.3, 0.4 + Math.random() * 0.6)
      starColors[i * 3] = col.r
      starColors[i * 3 + 1] = col.g
      starColors[i * 3 + 2] = col.b
    }
    const sGeo = new THREE.BufferGeometry()
    sGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3))
    sGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3))

    // Fine dust - dense
    const dustCount = 2500
    const dustPositions = new Float32Array(dustCount * 3)
    for (let i = 0; i < dustCount; i++) {
      const r = 15 + Math.random() * 50
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      dustPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      dustPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      dustPositions[i * 3 + 2] = r * Math.cos(phi)
    }
    const dGeo = new THREE.BufferGeometry()
    dGeo.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3))

    return { starsGeo: sGeo, dustGeo: dGeo }
  }, [])

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.01
      groupRef.current.rotation.x += delta * 0.003
    }
  })

  return (
    <group ref={groupRef}>
      {/* Nebula clouds — soft volumetric glow far behind everything */}
      {NEBULAE.map((n, i) => (
        <sprite key={i} position={n.position} scale={[n.scale, n.scale, 1]}>
          <spriteMaterial
            map={nebulaTex}
            color={n.color}
            transparent
            opacity={n.opacity}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            depthTest={false}
          />
        </sprite>
      ))}

      <points geometry={starsGeo}>
        <pointsMaterial
          size={0.12}
          vertexColors
          transparent
          opacity={0.8}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          sizeAttenuation
        />
      </points>
      <points geometry={dustGeo}>
        <pointsMaterial
          size={0.03}
          color="#8899cc"
          transparent
          opacity={0.4}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          sizeAttenuation
        />
      </points>
    </group>
  )
}
