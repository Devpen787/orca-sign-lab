import * as THREE from 'three'
import { LETTER_POSES, SCORED_FINGERS } from './motionLibrary'
import type { FingerName, ReferencePose } from './motionLibrary'

export const poseLabel = (pose: string) => (pose === 'POINT' ? 'INDEX' : pose)

function robotExtension(poseKey: string, fingerName: FingerName) {
  const pose = LETTER_POSES[poseKey]
  if (!pose) return null
  const meanFlexion = ((pose[`${fingerName}_mcp`] ?? 0) + (pose[`${fingerName}_pip`] ?? 0)) / 2
  return THREE.MathUtils.clamp(1 - (meanFlexion / 1.48) * 0.52, 0, 1)
}

export function compareFlexion(poseKey: string, reference: ReferencePose | undefined) {
  if (!reference) return null
  const fingers = SCORED_FINGERS.map((fingerName) => {
    const robot = robotExtension(poseKey, fingerName)
    if (robot === null) return null
    const target = reference.extension[fingerName]
    // This scale makes visibly different flexion states fail instead of
    // producing deceptively high percentages from raw normalized distance.
    const match = THREE.MathUtils.clamp(1 - Math.abs(robot - target) / 0.45, 0, 1)
    return { fingerName, robot, target, match }
  }).filter((item): item is NonNullable<typeof item> => item !== null)
  if (!fingers.length) return null
  const score = Math.round(
    (fingers.reduce((sum, item) => sum + item.match, 0) / fingers.length) * 100,
  )
  return { score, fingers }
}
