import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export default function Starfield() {
  const groupRef = useRef<THREE.Group>(null)

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
