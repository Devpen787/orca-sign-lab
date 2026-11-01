import * as THREE from 'three'
import type { URDFRobot } from 'urdf-loader'
import { ORCA_LANDMARK_LINKS } from '../domain/landmarkValidation'
import type { LandmarkPoint } from '../domain/landmarkValidation'
import { FIST, INDEX_POINT, LETTER_POSES, OPEN_HAND } from '../domain/motionLibrary'
import type { Pose } from '../domain/motionLibrary'

type CameraControls = {
  target: THREE.Vector3
  update(): void
}

export function resolvePose(poseKey: string): Pose {
  return (
    LETTER_POSES[poseKey] ??
    (poseKey === 'FIST' ? FIST : poseKey === 'POINT' ? INDEX_POINT : OPEN_HAND)
  )
}

export function applyPose(robot: URDFRobot, pose: Pose) {
  Object.entries(pose).forEach(([joint, value]) => robot.joints[joint]?.setJointValue(value))
}

export function styleRobot(robot: URDFRobot, side: 'left' | 'right') {
  robot.traverse((object) => {
    const mesh = object as THREE.Mesh
    if (!mesh.isMesh) return
    let owner: THREE.Object3D | null = mesh
    while (owner && !(owner as THREE.Object3D & { isURDFLink?: boolean }).isURDFLink) {
      owner = owner.parent
    }
    const source = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material
    if (source instanceof THREE.MeshStandardMaterial) {
      const material = source.clone()
      material.roughness = 0.5
      material.metalness = 0.1
      material.envMapIntensity = 0.75
      // The public ORCA model is mirrored to produce a support hand. Render
      // both winding directions on that instance so it remains visible across
      // browsers and WebGL drivers.
      if (side === 'left') material.side = THREE.DoubleSide
      if (owner?.name === 'forearm') {
        material.color.lerp(new THREE.Color(side === 'left' ? '#315985' : '#263e5d'), 0.5)
        material.roughness = 0.72
      }
      if (side === 'left') {
        material.color.lerp(new THREE.Color('#6f9fd6'), 0.14)
        material.emissive.set('#6f9fd6')
        material.emissiveIntensity = 0.12
      }
      mesh.material = material
    }
    mesh.castShadow = true
    mesh.receiveShadow = true
  })
}

export function disposeRobot(robot: URDFRobot) {
  const geometries = new Set<THREE.BufferGeometry>()
  const materials = new Set<THREE.Material>()
  robot.traverse((object) => {
    const mesh = object as THREE.Mesh
    if (!mesh.isMesh) return
    geometries.add(mesh.geometry)
    const assigned = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    assigned.forEach((material) => materials.add(material))
  })
  geometries.forEach((geometry) => geometry.dispose())
  materials.forEach((material) => material.dispose())
}

export function readRobotLandmarks(robot: URDFRobot): LandmarkPoint[] | null {
  const point = new THREE.Vector3()
  const landmarks: LandmarkPoint[] = []
  for (const linkName of ORCA_LANDMARK_LINKS) {
    const link = robot.links[linkName]
    if (!link) return null
    link.getWorldPosition(point)
    landmarks.push([point.x, point.y, point.z])
  }
  return landmarks
}

export function fitCameraToHands({
  scene,
  camera,
  controls,
  viewportWidth,
  viewportHeight,
  twoHands,
}: {
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  controls: CameraControls
  viewportWidth: number
  viewportHeight: number
  twoHands: boolean
}) {
  scene.updateMatrixWorld(true)
  const bounds = new THREE.Box3()
  scene.traverse((object) => {
    if (object.userData.orcaHand) bounds.expandByObject(object, true)
  })
  if (bounds.isEmpty()) return

  const center = bounds.getCenter(new THREE.Vector3())
  const size = bounds.getSize(new THREE.Vector3())
  const aspect = Math.max(viewportWidth / viewportHeight, 0.1)
  const verticalFov = THREE.MathUtils.degToRad(camera.fov)
  const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * aspect)
  const horizontalDistance = size.x / (2 * Math.tan(horizontalFov / 2))
  const verticalDistance = size.z / (2 * Math.tan(verticalFov / 2))
  const padding = twoHands ? 1.9 : 1.65
  const distance = (Math.max(horizontalDistance, verticalDistance) + size.y / 2) * padding

  // Recipient view looks along -Y and uses -Z as screen-up. The URDF wrist
  // rig is asymmetric, so framing the rendered bounds avoids one-hand drift.
  camera.up.set(0, 0, -1)
  camera.position.copy(center).add(new THREE.Vector3(0, distance, 0))
  camera.near = Math.max(distance / 120, 0.001)
  camera.far = distance * 40
  camera.updateProjectionMatrix()
  controls.target.copy(center)
  controls.update()
  camera.updateMatrixWorld(true)
}
