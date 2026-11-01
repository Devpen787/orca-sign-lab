import referenceCatalog from '../data/dsgsWordReferences.json'

export type LandmarkPoint = [number, number, number]
export type HandSide = 'left' | 'right'
export type HandLandmarkFrame = {
  at: number
  points: LandmarkPoint[]
}
export type HandLandmarkTrace = {
  traceId: string
  side: HandSide
  frames: HandLandmarkFrame[]
}
export type TraceSet = Partial<Record<HandSide, HandLandmarkTrace>>

type ReferenceFrame = HandLandmarkFrame & { meanConfidence: number }
type DsgsWordReference = {
  sourceFile: string
  sourceSha256: string
  fps: number
  sourceFrames: number
  availableHands: HandSide[]
  hands: Record<HandSide, ReferenceFrame[]>
}

type DsgsReferenceCatalog = {
  meta: {
    repository: string
    revision: string
    license: string
    signedLanguage: string
    format: string
    samplesPerWord: number
    scope: string
  }
  words: Record<string, DsgsWordReference>
}

export type LandmarkComparison = {
  status: 'measured'
  handshapeDistance: number
  movementDistance: number
  handUseMatches: boolean
  candidateHands: HandSide[]
  referenceHands: HandSide[]
  candidateSamples: number
  referenceSamples: number
  sourceFile: string
  sourceSha256: string
  sourceRevision: string
  unsupported: string[]
}

export const ORCA_LANDMARK_LINKS = [
  'carpals',
  'thumb_ap',
  'thumb_pp',
  'thumb_dp',
  'thumb_fingertip',
  'index_ap',
  'index_pp',
  'index_fingertip_assembly',
  'index_fingertip',
  'middle_ap',
  'middle_pp',
  'middle_fingertip_assembly',
  'middle_fingertip',
  'ring_ap',
  'ring_pp',
  'ring_fingertip_assembly',
  'ring_fingertip',
  'pinky_ap',
  'pinky_pp',
  'pinky_fingertip_assembly',
  'pinky_fingertip',
] as const

export const ORCA_TRACE_SAMPLE_COUNT = referenceCatalog.meta.samplesPerWord
export const DSGS_REFERENCE_REPOSITORY = referenceCatalog.meta.repository
export const DSGS_REFERENCE_REVISION = referenceCatalog.meta.revision

const catalog = referenceCatalog as unknown as DsgsReferenceCatalog
const FINGER_CHAINS = [
  [0, 1, 2, 3, 4],
  [0, 5, 6, 7, 8],
  [0, 9, 10, 11, 12],
  [0, 13, 14, 15, 16],
  [0, 17, 18, 19, 20],
] as const
const TIP_INDICES = [4, 8, 12, 16, 20] as const

function distance(a: LandmarkPoint, b: LandmarkPoint) {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])
}

function jointAngle(a: LandmarkPoint, b: LandmarkPoint, c: LandmarkPoint) {
  const ab: LandmarkPoint = [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
  const cb: LandmarkPoint = [c[0] - b[0], c[1] - b[1], c[2] - b[2]]
  const denominator = Math.hypot(...ab) * Math.hypot(...cb)
  if (denominator < 1e-9) return 0
  const cosine = Math.max(
    -1,
    Math.min(1, (ab[0] * cb[0] + ab[1] * cb[1] + ab[2] * cb[2]) / denominator),
  )
  return Math.acos(cosine) / Math.PI
}

function handshapeVector(points: LandmarkPoint[]) {
  if (points.length !== ORCA_LANDMARK_LINKS.length) return []
  const scale = Math.max(distance(points[0], points[9]), 1e-6)
  const angles = FINGER_CHAINS.flatMap((chain) => [
    jointAngle(points[chain[0]], points[chain[1]], points[chain[2]]),
    jointAngle(points[chain[1]], points[chain[2]], points[chain[3]]),
    jointAngle(points[chain[2]], points[chain[3]], points[chain[4]]),
  ])
  const reach = TIP_INDICES.map((index) => distance(points[0], points[index]) / scale)
  const spread = TIP_INDICES.slice(1).map(
    (index, offset) => distance(points[TIP_INDICES[offset]], points[index]) / scale,
  )
  return [...angles, ...reach, ...spread]
}

function vectorDistance(a: number[], b: number[]) {
  if (!a.length || a.length !== b.length) return Number.POSITIVE_INFINITY
  let squared = 0
  for (let index = 0; index < a.length; index += 1) squared += (a[index] - b[index]) ** 2
  return Math.sqrt(squared / a.length)
}

function dtwDistance(a: number[][], b: number[][]) {
  if (!a.length || !b.length) return Number.POSITIVE_INFINITY
  const costs = Array.from({ length: a.length + 1 }, () =>
    Array(b.length + 1).fill(Number.POSITIVE_INFINITY),
  )
  const steps = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0))
  costs[0][0] = 0
  for (let row = 1; row <= a.length; row += 1) {
    for (let column = 1; column <= b.length; column += 1) {
      const candidates: [number, number, number][] = [
        [costs[row - 1][column], steps[row - 1][column], 0],
        [costs[row][column - 1], steps[row][column - 1], 1],
        [costs[row - 1][column - 1], steps[row - 1][column - 1], 2],
      ]
      candidates.sort((left, right) => left[0] - right[0] || left[2] - right[2])
      costs[row][column] = candidates[0][0] + vectorDistance(a[row - 1], b[column - 1])
      steps[row][column] = candidates[0][1] + 1
    }
  }
  return costs[a.length][b.length] / Math.max(steps[a.length][b.length], 1)
}

function movementVector(frames: HandLandmarkFrame[]) {
  if (!frames.length) return []
  const scaleValues = frames
    .map((frame) => distance(frame.points[0], frame.points[9]))
    .filter((value) => value > 1e-6)
  const scale = scaleValues.reduce((sum, value) => sum + value, 0) / Math.max(scaleValues.length, 1)
  const wrists = frames.map((frame) => frame.points[0])
  const speeds = wrists.map((wrist, index) =>
    index === 0 ? 0 : distance(wrist, wrists[index - 1]) / Math.max(scale, 1e-6),
  )
  const total = speeds.reduce((sum, value) => sum + value, 0)
  let travelled = 0
  return wrists.map((wrist, index) => {
    travelled += speeds[index]
    return [
      total > 1e-6 ? speeds[index] / total : 0,
      total > 1e-6 ? travelled / total : 0,
      distance(wrist, wrists[0]) / Math.max(scale, 1e-6),
    ]
  })
}

function average(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1)
}

export function getDsgsWordReference(gloss: string) {
  return catalog.words[gloss]
}

export function compareOrcaTrace(gloss: string, candidate: TraceSet): LandmarkComparison | null {
  const reference = getDsgsWordReference(gloss)
  if (!reference) return null
  const candidateHands = (['left', 'right'] as const).filter((side) => Boolean(candidate[side]))
  const comparableHands = reference.availableHands.filter((side) => candidate[side]?.frames.length)
  if (!comparableHands.length) return null

  const handshapeDistances = comparableHands.map((side) =>
    dtwDistance(
      candidate[side]!.frames.map((frame) => handshapeVector(frame.points)),
      reference.hands[side].map((frame) => handshapeVector(frame.points)),
    ),
  )
  const movementDistances = comparableHands.map((side) =>
    dtwDistance(movementVector(candidate[side]!.frames), movementVector(reference.hands[side])),
  )

  return {
    status: 'measured',
    handshapeDistance: average(handshapeDistances),
    movementDistance: average(movementDistances),
    handUseMatches:
      candidateHands.length === reference.availableHands.length &&
      candidateHands.every((side) => reference.availableHands.includes(side)),
    candidateHands,
    referenceHands: [...reference.availableHands],
    candidateSamples: candidateHands.reduce((sum, side) => sum + candidate[side]!.frames.length, 0),
    referenceSamples: reference.availableHands.reduce(
      (sum, side) => sum + reference.hands[side].length,
      0,
    ),
    sourceFile: reference.sourceFile,
    sourceSha256: reference.sourceSha256,
    sourceRevision: catalog.meta.revision,
    unsupported: [
      'absolute signing location',
      'directional orientation',
      'body and face grammar',
      'linguistic correctness',
    ],
  }
}
