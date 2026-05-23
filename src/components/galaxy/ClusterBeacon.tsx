import { useMemo } from 'react'
import * as THREE from 'three'

interface ClusterBeaconProps {
  position: [number, number, number]
  onClick: () => void
}

const BEACON_HEIGHT = 1.2

export default function ClusterBeacon({ position, onClick }: ClusterBeaconProps) {
  const [cx, cy, cz] = position
  const topY = cy + BEACON_HEIGHT

  const lineGeo = useMemo(() => {
    const points = [new THREE.Vector3(cx, cy, cz), new THREE.Vector3(cx, topY, cz)]
    const geo = new THREE.BufferGeometry().setFromPoints(points)
    return geo
  }, [cx, cy, cz, topY])

  return (
    <group>
      {/* Vertical connector line */}
      <lineSegments geometry={lineGeo} onClick={onClick}
        onPointerOver={() => { document.body.style.cursor = 'pointer' }}
        onPointerOut={() => { document.body.style.cursor = 'auto' }}>
        <lineBasicMaterial
          color="#667799"
          transparent
          opacity={0.25}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </lineSegments>

      {/* Beacon ring at top */}
      <mesh
        position={[cx, topY, cz]}
        rotation={[0, 0, 0]}
        onClick={onClick}
        onPointerOver={() => { document.body.style.cursor = 'pointer' }}
        onPointerOut={() => { document.body.style.cursor = 'auto' }}
      >
        <torusGeometry args={[0.12, 0.025, 8, 12]} />
        <meshBasicMaterial
          color="#8899cc"
          transparent
          opacity={0.55}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Glow dot at ring center */}
      <mesh position={[cx, topY, cz]}
        onClick={onClick}
        onPointerOver={() => { document.body.style.cursor = 'pointer' }}
        onPointerOut={() => { document.body.style.cursor = 'auto' }}>
        <sphereGeometry args={[0.05, 6, 6]} />
        <meshBasicMaterial
          color="#aabbee"
          transparent
          opacity={0.7}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}
