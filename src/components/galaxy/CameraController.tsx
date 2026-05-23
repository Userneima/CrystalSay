import { useRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'

interface CameraControllerProps {
  targetPosition?: [number, number, number] | null
  onTargetReached?: () => void
}

export default function CameraController({ targetPosition, onTargetReached }: CameraControllerProps) {
  const controlsRef = useRef<any>(null)
  const { camera } = useThree()
  const animating = useRef(false)

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
  })

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.08}
      minDistance={4}
      maxDistance={25}
      maxPolarAngle={Math.PI * 0.7}
      autoRotate
      autoRotateSpeed={0.15}
      target={[0, 0, 0]}
    />
  )
}
