import { useFrame } from '@react-three/fiber'
import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import type { URDFRobot } from 'urdf-loader'
import { loadHandRobot } from '../../components/three/loadHandRobot'
import { MODEL_URL, OPEN_HAND } from '../domain/motionLibrary'
import type { CameraView, HandMotion, LanguageMode, Pose } from '../domain/motionLibrary'
import { ORCA_TRACE_SAMPLE_COUNT } from '../domain/landmarkValidation'
import type {
  HandLandmarkFrame,
  HandLandmarkTrace,
  LandmarkPoint,
} from '../domain/landmarkValidation'
import { orientationForPose, sampleMotion } from '../domain/motionPlanner'
import { disposeRobot, readRobotLandmarks, resolvePose, styleRobot } from '../three/handModelScene'

export function HandModel({
  poseKey,
  motion,
  motionDurationMs,
  onReady,
  side,
  twoHands,
  facing,
  language,
  motionKey,
  playing,
  traceId,
  onTraceComplete,
}: {
  poseKey: string
  motion?: HandMotion
  motionDurationMs?: number
  onReady(): void
  side: 'left' | 'right'
  twoHands: boolean
  facing: CameraView
  language: LanguageMode
  motionKey: string
  playing: boolean
  traceId?: string
  onTraceComplete?(trace: HandLandmarkTrace): void
}) {
  const [robot, setRobot] = useState<URDFRobot | null>(null)
  const values = useRef<Pose>({ ...OPEN_HAND })
  const group = useRef<THREE.Group>(null)
  const motionStart = useRef(0)
  const traceFrames = useRef<HandLandmarkFrame[]>([])
  const lastTraceBucket = useRef(-1)
  const traceSent = useRef(false)
  const traceCallback = useRef(onTraceComplete)
  const biologicalSide = side === 'right' ? 1 : -1
  const perspectiveMirror = facing === 'recipient' ? -1 : 1
  const baseX = twoHands ? biologicalSide * perspectiveMirror * 0.09 : 0

  useEffect(() => {
    motionStart.current = performance.now()
    traceFrames.current = []
    lastTraceBucket.current = -1
    traceSent.current = false
  }, [motionKey, playing])

  useEffect(() => {
    traceCallback.current = onTraceComplete
  }, [onTraceComplete])

  useEffect(() => {
    let mounted = true
    let loadedRobot: URDFRobot | null = null
    loadHandRobot(MODEL_URL).then((loaded) => {
      loadedRobot = loaded
      if (!mounted) {
        disposeRobot(loaded)
        return
      }
      styleRobot(loaded, side)
      setRobot(loaded)
      onReady()
    })
    return () => {
      mounted = false
      if (loadedRobot) disposeRobot(loadedRobot)
    }
  }, [onReady, side])

  useFrame((_state, delta) => {
    if (!robot) return
    const elapsed = (performance.now() - motionStart.current) / 1000
    const phase =
      playing && motionDurationMs
        ? THREE.MathUtils.clamp(elapsed / (motionDurationMs / 1000), 0, 1)
        : 0
    const motionFrame = sampleMotion(motion, phase)
    const activePoseKey = motionFrame?.poseKey ?? poseKey
    const target = resolvePose(activePoseKey)
    for (const [joint, baseTarget] of Object.entries(target)) {
      const next = THREE.MathUtils.damp(values.current[joint] ?? 0, baseTarget, 8, delta)
      values.current[joint] = next
      robot.joints[joint]?.setJointValue(next)
    }
    if (group.current) {
      let traceX = motionFrame?.offset?.[0] ?? 0
      let traceY = motionFrame?.offset?.[1] ?? 0
      let traceZ = motionFrame?.offset?.[2] ?? 0
      if (!motionFrame && playing && side === 'right' && poseKey === 'J') {
        const phase = THREE.MathUtils.clamp(elapsed / 0.65, 0, 1)
        traceX = Math.sin(phase * Math.PI) * 0.013
        traceZ = -phase * 0.018
      } else if (!motionFrame && playing && side === 'right' && poseKey === 'Z') {
        const phase = THREE.MathUtils.clamp(elapsed / 0.65, 0, 1)
        traceX =
          phase < 0.33
            ? phase * 0.045
            : phase < 0.66
              ? 0.015 - (phase - 0.33) * 0.09
              : -0.015 + (phase - 0.66) * 0.045
        traceZ = phase < 0.33 ? 0 : phase < 0.66 ? -(phase - 0.33) * 0.04 : -0.013
      }
      const orientation = orientationForPose(activePoseKey, language)
      const facingRotation = facing === 'recipient' ? Math.PI : facing === 'side' ? Math.PI / 2 : 0
      group.current.position.x = THREE.MathUtils.damp(
        group.current.position.x,
        baseX + traceX * perspectiveMirror,
        8,
        delta,
      )
      group.current.position.y = THREE.MathUtils.damp(group.current.position.y, traceY, 8, delta)
      group.current.position.z = THREE.MathUtils.damp(group.current.position.z, traceZ, 8, delta)
      group.current.rotation.x = THREE.MathUtils.damp(
        group.current.rotation.x,
        motionFrame?.rotation?.[0] ?? 0,
        8,
        delta,
      )
      group.current.rotation.y = THREE.MathUtils.damp(
        group.current.rotation.y,
        orientation.turn + (motionFrame?.rotation?.[1] ?? 0),
        8,
        delta,
      )
      group.current.rotation.z = THREE.MathUtils.damp(
        group.current.rotation.z,
        facingRotation + (motionFrame?.rotation?.[2] ?? 0),
        8,
        delta,
      )
    }
    if (group.current) group.current.updateMatrixWorld(true)
    else robot.updateMatrixWorld(true)

    if (playing && motion && traceId && group.current && !traceSent.current) {
      const bucket = Math.min(
        ORCA_TRACE_SAMPLE_COUNT - 1,
        Math.floor(phase * ORCA_TRACE_SAMPLE_COUNT),
      )
      if (bucket > lastTraceBucket.current) {
        const points = readRobotLandmarks(robot)
        if (points) {
          for (let sample = lastTraceBucket.current + 1; sample <= bucket; sample += 1) {
            traceFrames.current.push({
              at: sample / (ORCA_TRACE_SAMPLE_COUNT - 1),
              points: points.map((landmark) => [...landmark] as LandmarkPoint),
            })
          }
          lastTraceBucket.current = bucket
        }
      }
      if (lastTraceBucket.current === ORCA_TRACE_SAMPLE_COUNT - 1) {
        traceSent.current = true
        traceCallback.current?.({ traceId, side, frames: traceFrames.current })
      }
    }
  })

  if (!robot) return null
  return (
    <group
      ref={group}
      position={[baseX, 0, 0]}
      scale={side === 'left' ? [-1, 1, 1] : [1, 1, 1]}
      userData={{ orcaHand: true, orcaSide: side }}
    >
      <primitive object={robot} />
    </group>
  )
}
