import * as THREE from 'three'
import { WORD_MOTIONS } from './motionLibrary'
import type {
  HandMotion,
  HandMotionFrame,
  LanguageMode,
  MotionVector,
  MotionVerification,
  PlanItem,
  PlaybackMode,
  WordMotion,
} from './motionLibrary'

type PoseOrientation = { label: string; turn: number }
export type SourceGlossRule = {
  source: string[]
  glosses: string[]
}

export type PlannerExtensions = {
  motions?: Partial<Record<LanguageMode, Record<string, WordMotion>>>
  rules?: Partial<Record<LanguageMode, SourceGlossRule[]>>
}

const DEFAULT_ORIENTATION: PoseOrientation = { label: 'PALM MOSTLY FORWARD', turn: 0 }
const POSE_ORIENTATIONS: Record<string, PoseOrientation> = {
  G: { label: 'SIDE ORIENTATION', turn: -Math.PI / 2 },
  H: { label: 'SIDE ORIENTATION', turn: -Math.PI / 2 },
  P: { label: 'DOWNWARD ORIENTATION', turn: Math.PI },
  Q: { label: 'DOWNWARD ORIENTATION', turn: Math.PI },
}

// These rules only reuse source-backed motions that already exist in the local
// library. They do not claim to translate arbitrary English into ASL grammar.
// Longer source phrases are checked first so a known phrase is not split into
// smaller word aliases before the composed motion sequence can be selected.
const SOURCE_GLOSS_RULES: Record<LanguageMode, SourceGlossRule[]> = {
  asl: [
    {
      source: ['I', 'LOOK', 'FORWARD', 'TO', 'SPEAKING', 'WITH', 'YOU'],
      glosses: ['LOOK-FORWARD-TO', 'TALK', 'YOU'],
    },
    {
      source: ['I', 'LOOK', 'FORWARD', 'TO', 'TALKING', 'WITH', 'YOU'],
      glosses: ['LOOK-FORWARD-TO', 'TALK', 'YOU'],
    },
    {
      source: ['LOOK', 'FORWARD', 'TO', 'SPEAKING', 'WITH', 'YOU'],
      glosses: ['LOOK-FORWARD-TO', 'TALK', 'YOU'],
    },
    {
      source: ['LOOK', 'FORWARD', 'TO', 'TALKING', 'WITH', 'YOU'],
      glosses: ['LOOK-FORWARD-TO', 'TALK', 'YOU'],
    },
    {
      source: ['LOOK', 'FORWARD', 'TO', 'SPEAK', 'WITH', 'YOU'],
      glosses: ['LOOK-FORWARD-TO', 'TALK', 'YOU'],
    },
    {
      source: ['LOOK', 'FORWARD', 'TO', 'TALK', 'WITH', 'YOU'],
      glosses: ['LOOK-FORWARD-TO', 'TALK', 'YOU'],
    },
    { source: ['LOOK', 'FORWARD', 'TO'], glosses: ['LOOK-FORWARD-TO'] },
    { source: ['WORK', 'TOGETHER'], glosses: ['COLLABORATE'] },
    { source: ['THANK', 'YOU'], glosses: ['THANKS'] },
    { source: ['SPEAKING'], glosses: ['TALK'] },
    { source: ['TALKING'], glosses: ['TALK'] },
    { source: ['SPEAK'], glosses: ['TALK'] },
  ],
  dsgs: [],
}

export const orientationForPose = (poseKey: string, language: LanguageMode) =>
  language === 'asl' ? (POSE_ORIENTATIONS[poseKey] ?? DEFAULT_ORIENTATION) : DEFAULT_ORIENTATION

function normalizeForPlan(script: string, language: LanguageMode) {
  const replacements: Array<[RegExp, string, string]> =
    language === 'dsgs'
      ? [
          [/Ä/g, 'AE', 'Ä → AE'],
          [/Ö/g, 'OE', 'Ö → OE'],
          [/Ü/g, 'UE', 'Ü → UE'],
          [/ẞ|ß/g, 'SS', 'ß → SS'],
        ]
      : []
  let normalized = script.toUpperCase()
  const substitutions: string[] = []
  replacements.forEach(([pattern, replacement, label]) => {
    if (pattern.test(normalized)) substitutions.push(label)
    normalized = normalized.replace(pattern, replacement)
  })
  normalized = normalized.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  return { normalized, substitutions }
}

function sourceMatchesAt(words: string[], index: number, source: string[]) {
  if (index + source.length > words.length) return false
  return source.every((word, offset) => words[index + offset] === word)
}

function translatePhraseToGlosses(
  normalized: string,
  language: LanguageMode,
  playbackMode: PlaybackMode,
  extensions?: PlannerExtensions,
) {
  const sourceWords: string[] = normalized.match(/[A-Z]+/g) ?? []
  if (playbackMode === 'letters') return { words: sourceWords, translationNote: '' }

  const rules = [
    ...(extensions?.rules?.[language] ?? []),
    ...SOURCE_GLOSS_RULES[language],
  ].toSorted((a, b) => b.source.length - a.source.length)
  const words: string[] = []
  const appliedRules: string[] = []
  let sourceIndex = 0

  while (sourceIndex < sourceWords.length) {
    const rule = rules.find((candidate) =>
      sourceMatchesAt(sourceWords, sourceIndex, candidate.source),
    )
    if (!rule) {
      words.push(sourceWords[sourceIndex])
      sourceIndex += 1
      continue
    }

    words.push(...rule.glosses)
    appliedRules.push(`${rule.source.join(' ')} → ${rule.glosses.join(' · ')}`)
    sourceIndex += rule.source.length
  }

  return {
    words,
    translationNote: appliedRules.length
      ? `SOURCE-CHECKED LEXICON MATCH${appliedRules.length === 1 ? '' : 'ES'} · ${appliedRules.join(' · ')}`
      : '',
  }
}

export function buildPlan(
  script: string,
  language: LanguageMode,
  playbackMode: PlaybackMode,
  extensions?: PlannerExtensions,
) {
  const { normalized, substitutions } = normalizeForPlan(script, language)
  const { words, translationNote } = translatePhraseToGlosses(
    normalized,
    language,
    playbackMode,
    extensions,
  )
  const sequence: PlanItem[] = []
  const signedWords: string[] = []
  const fallbackWords: string[] = []
  words.forEach((word, wordIndex) => {
    const motion =
      playbackMode === 'words'
        ? (extensions?.motions?.[language]?.[word] ?? WORD_MOTIONS[language][word])
        : undefined
    if (motion) {
      signedWords.push(word)
      sequence.push({ kind: 'sign', word, wordIndex, motion })
    } else {
      if (playbackMode === 'words') fallbackWords.push(word)
      Array.from(word).forEach((letter, letterIndex) => {
        sequence.push({
          kind: 'letter',
          letter,
          word,
          wordIndex,
          letterIndex,
          fallback: playbackMode === 'words',
        })
      })
    }
    if (wordIndex < words.length - 1) sequence.push({ kind: 'gap', wordIndex })
  })
  const unsupported = Array.from(new Set(normalized.replace(/[A-Z\s]/g, '')))
  return {
    words,
    sequence,
    unsupported,
    substitutions,
    signedWords,
    fallbackWords,
    translationNote,
  }
}

export type MotionPlan = ReturnType<typeof buildPlan>

export const SIGN_REVIEW_HOLD_MS = 500
export const TRANSITION_GAP_MS = 80

export const itemDuration = (item: PlanItem | undefined) =>
  item?.kind === 'gap'
    ? TRANSITION_GAP_MS
    : item?.kind === 'sign'
      ? item.motion.durationMs + SIGN_REVIEW_HOLD_MS
      : 760

export function sampleMotion(motion: HandMotion | undefined, phase: number) {
  if (!motion?.frames.length) return null
  const frames = motion.frames
  const nextIndex = frames.findIndex((candidate) => candidate.at >= phase)
  if (nextIndex <= 0) return frames[0]
  if (nextIndex === -1) return frames[frames.length - 1]
  const previous = frames[nextIndex - 1]
  const next = frames[nextIndex]
  const localPhase = THREE.MathUtils.inverseLerp(previous.at, next.at, phase)
  const interpolateVector = (
    a: MotionVector | undefined,
    b: MotionVector | undefined,
  ): MotionVector => {
    const from = a ?? [0, 0, 0]
    const to = b ?? [0, 0, 0]
    return [
      THREE.MathUtils.lerp(from[0], to[0], localPhase),
      THREE.MathUtils.lerp(from[1], to[1], localPhase),
      THREE.MathUtils.lerp(from[2], to[2], localPhase),
    ]
  }
  return {
    at: phase,
    poseKey: localPhase < 0.5 ? previous.poseKey : next.poseKey,
    offset: interpolateVector(previous.offset, next.offset),
    rotation: interpolateVector(previous.rotation, next.rotation),
  }
}

function motionDistance(motion: HandMotion | undefined) {
  if (!motion || motion.frames.length < 2) return 0
  return motion.frames.slice(1).reduce((total, frame, index) => {
    const previous = motion.frames[index].offset ?? [0, 0, 0]
    const next = frame.offset ?? [0, 0, 0]
    return total + Math.hypot(next[0] - previous[0], next[1] - previous[1], next[2] - previous[2])
  }, 0)
}

function trackSeparation(left: HandMotionFrame, right: HandMotionFrame) {
  const leftOffset = left.offset ?? [0, 0, 0]
  const rightOffset = right.offset ?? [0, 0, 0]
  const leftX = -0.075 + leftOffset[0]
  const rightX = 0.075 + rightOffset[0]
  return Math.hypot(rightX - leftX, rightOffset[1] - leftOffset[1], rightOffset[2] - leftOffset[2])
}

function followsRelationship(motion: WordMotion, relationship: MotionVerification['relationship']) {
  if (relationship === 'one-hand') return motion.hands === 'one' && !motion.left
  if (!motion.left) return false
  if (relationship === 'converging') {
    const leftStart = motion.left.frames[0]
    const leftEnd = motion.left.frames.at(-1)
    const rightStart = motion.right.frames[0]
    const rightEnd = motion.right.frames.at(-1)
    return Boolean(
      leftEnd &&
      rightEnd &&
      trackSeparation(leftEnd, rightEnd) < trackSeparation(leftStart, rightStart) * 0.75,
    )
  }
  const count = Math.min(motion.left.frames.length, motion.right.frames.length)
  if (count < 2) return false
  for (let index = 1; index < count; index += 1) {
    const leftPrevious = motion.left.frames[index - 1].offset?.[1] ?? 0
    const leftNext = motion.left.frames[index].offset?.[1] ?? 0
    const rightPrevious = motion.right.frames[index - 1].offset?.[1] ?? 0
    const rightNext = motion.right.frames[index].offset?.[1] ?? 0
    if ((leftNext - leftPrevious) * (rightNext - rightPrevious) >= 0) return false
  }
  return true
}

export function validateMotionRules(motion: WordMotion | undefined) {
  if (!motion?.verification) return null
  const dominantPoses = new Set(motion.right.frames.map((item) => item.poseKey))
  const supportPoses = new Set(motion.left?.frames.map((item) => item.poseKey) ?? [])
  const expected = motion.verification
  const checks = [
    { label: 'HAND COUNT', pass: motion.hands === (motion.left ? 'two' : 'one') },
    {
      label: 'DOMINANT SHAPE',
      pass: expected.expectedDominantPoses.every((pose) => dominantPoses.has(pose)),
    },
    ...(expected.expectedSupportPoses
      ? [
          {
            label: 'SUPPORT SHAPE',
            pass: expected.expectedSupportPoses.every((pose) => supportPoses.has(pose)),
          },
        ]
      : []),
    { label: 'DOMINANT PATH', pass: motionDistance(motion.right) >= 0.01 },
    ...(motion.hands === 'two'
      ? [{ label: 'SUPPORT PATH', pass: motionDistance(motion.left) >= 0.005 }]
      : []),
    {
      label: expected.relationship.toUpperCase(),
      pass: followsRelationship(motion, expected.relationship),
    },
    { label: 'REFERENCE', pass: expected.sources.length > 0 },
  ]
  return { checks, passed: checks.filter((check) => check.pass).length, total: checks.length }
}
