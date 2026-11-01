import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { fitCameraToHands } from '../three/handModelScene'

type CameraControls = {
  target: THREE.Vector3
  update(): void
}

export function CameraFramer({
  frameKey,
  ready,
  twoHands,
}: {
  frameKey: string
  ready: boolean
  twoHands: boolean
}) {
  const camera = useThree((state) => state.camera) as THREE.PerspectiveCamera
  const controls = useThree((state) => state.controls) as CameraControls | null
  const scene = useThree((state) => state.scene)
  const viewportWidth = useThree((state) => state.size.width)
  const viewportHeight = useThree((state) => state.size.height)
  const settleFrames = useRef(0)

  useEffect(() => {
    settleFrames.current = ready ? 3 : 0
  }, [frameKey, ready, twoHands, viewportHeight, viewportWidth])

  useFrame(() => {
    if (!ready || !controls || settleFrames.current === 0) return
    let visibleHands = 0
    scene.traverse((object) => {
      if (object.userData.orcaHand) visibleHands += 1
    })
    if (visibleHands < (twoHands ? 2 : 1)) return

    settleFrames.current -= 1
    if (settleFrames.current > 0) return
    fitCameraToHands({
      scene,
      camera,
      controls,
      viewportWidth,
      viewportHeight,
      twoHands,
    })
  })

  return null
}
