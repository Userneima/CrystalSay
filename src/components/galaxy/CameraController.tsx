import { useRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'

interface ClusterPosition {
  id: string
  position: [number, number, number]
}

interface CameraControllerProps {
  targetPosition?: [number, number, number] | null
  onTargetReached?: () => void
  clusterPositions?: ClusterPosition[]
  onActiveClusterChange?: (clusterId: string | null) => void
}

const PROXIMITY_THRESHOLD = 3

export default function CameraController({
  targetPosition,
  onTargetReached,
  clusterPositions,
  onActiveClusterChange,
}: CameraControllerProps) {
  const controlsRef = useRef<any>(null)
  const { camera } = useThree()
  const animating = useRef(false)
  const lastActiveId = useRef<string | null>(null)

  useEffect(() => {
    if (targetPosition) {
      animating.current = true
    }
  }, [targetPosition])

  useFrame((_, delta) => {
    if (animating.current && targetPosition && controlsRef.current) {
      const target = new THREE.Vector3(...targetPosition)
      const current = controlsRef.current.target as THREE.Vector3
      current.lerp(target, 0.05)
      controlsRef.current.update()

      if (current.distanceTo(target) < 0.1) {
        current.copy(target)
        animating.current = false
        onTargetReached?.()
      }
    }

    // Cluster proximity tracking
    if (clusterPositions && onActiveClusterChange && controlsRef.current) {
      const camTarget = controlsRef.current.target as THREE.Vector3
      let closestId: string | null = null
      let closestDist = Infinity

      for (const cp of clusterPositions) {
        const dist = camTarget.distanceToSquared(new THREE.Vector3(...cp.position))
        if (dist < PROXIMITY_THRESHOLD * PROXIMITY_THRESHOLD && dist < closestDist) {
          closestDist = dist
          closestId = cp.id
        }
      }

      if (lastActiveId.current !== closestId) {
        lastActiveId.current = closestId
        onActiveClusterChange(closestId)
      }
    }
  })

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.08}
      minDistance={4}
      maxDistance={25}
      maxPolarAngle={Math.PI * 0.7}
      enablePan
      panSpeed={0.7}
      screenSpacePanning
      autoRotate
      autoRotateSpeed={0.15}
      target={[0, 0, 0]}
    />
  )
}
