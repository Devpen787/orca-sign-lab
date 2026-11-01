import type {
  HandMotion,
  HandMotionFrame,
  LanguageMode,
  MotionVector,
  WordMotion,
} from '../../demo/domain/motionLibrary'
import type { PlannerExtensions, SourceGlossRule } from '../../demo/domain/motionPlanner'
import { validateSignPackSchema } from './signPackSchema'

export const SIGN_PACK_SCHEMA = 'signpack.v1' as const
export const MAX_SIGN_PACK_BYTES = 256 * 1024
export const SIGN_PACK_FILE_EXTENSION = '.signpack.json'

export type SignPackTrust =
  'personal-draft' | 'source-backed' | 'community-reviewed' | 'signer-verified'

export type SignPackLicense = 'CC-BY-4.0' | 'CC0-1.0' | 'MIT' | 'OTHER'
export type MotionPreset = 'still' | 'forward' | 'upward' | 'outward' | 'converging' | 'alternating'

export type SignPackV1 = {
  schemaVersion: typeof SIGN_PACK_SCHEMA
  id: string
  language: LanguageMode
  region: string
  gloss: string
  sourcePhrases: string[]
  referenceUrls: string[]
  license: SignPackLicense
  trust: SignPackTrust
  createdAt: string
  updatedAt: string
  motion: WordMotion
}

export type SignPackDraftInput = {
  id?: string
  language: LanguageMode
  region: string
  gloss: string
  sourcePhrases: string[]
  referenceUrls: string[]
  license: SignPackLicense
  hands: 'one' | 'two'
  durationMs: number
  dominantPoses: [string, string, string]
  supportPoses: [string, string, string]
  preset: MotionPreset
  createdAt?: string
}

export type SignPackValidation = {
  valid: boolean
  errors: string[]
  warnings: string[]
}

const FRAME_AT = [0, 0.5, 1] as const

const normalizeGloss = (value: string) =>
  value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

export const slugForSignPack = (language: LanguageMode, gloss: string) =>
  `${language}-${normalizeGloss(gloss).toLowerCase()}`

function validateFrameSequence(label: string, motion: HandMotion, errors: string[]) {
  let previous = -1
  motion.frames.forEach(({ at }, index) => {
    if (at < previous) {
      errors.push(`${label} frame ${index + 1} must have a sorted at value from 0 to 1.`)
    }
    previous = at
  })
  if (motion.frames[0].at !== 0) errors.push(`${label} must begin at 0.`)
  if (motion.frames.at(-1)?.at !== 1) errors.push(`${label} must end at 1.`)
}

export function validateSignPack(value: unknown): SignPackValidation {
  const errors = validateSignPackSchema(value)
  const warnings: string[] = []
  if (errors.length) return { valid: false, errors, warnings }

  const pack = value as SignPackV1
  if (pack.motion.gloss !== pack.gloss) errors.push('motion.gloss must match gloss.')
  validateFrameSequence('Dominant motion', pack.motion.right, errors)
  if (pack.motion.left) validateFrameSequence('Support motion', pack.motion.left, errors)
  if (Date.parse(pack.updatedAt) < Date.parse(pack.createdAt)) {
    errors.push('updatedAt cannot be earlier than createdAt.')
  }

  if (pack.trust === 'personal-draft')
    warnings.push(
      'Personal drafts are not linguistically verified and remain local until explicitly exported.',
    )
  if (pack.referenceUrls.length === 1)
    warnings.push('A second independent sign reference is recommended before review.')
  return { valid: errors.length === 0, errors, warnings }
}

const vector = (x = 0, y = 0, z = 0): MotionVector => [x, y, z]

function presetVectors(preset: MotionPreset, side: 'support' | 'dominant'): MotionVector[] {
  const direction = side === 'support' ? -1 : 1
  switch (preset) {
    case 'forward':
      return [vector(0, 0, 0), vector(0, 0.01, 0.03), vector(0, 0.018, 0.06)]
    case 'upward':
      return [vector(0, -0.025, 0), vector(0, 0.015, 0), vector(0, 0.055, 0)]
    case 'outward':
      return [
        vector(0, 0, 0),
        vector(direction * 0.018, 0.005, 0.01),
        vector(direction * 0.045, 0.01, 0.02),
      ]
    case 'converging':
      return [
        vector(direction * 0.04, 0, 0.015),
        vector(direction * 0.018, 0.006, 0.02),
        vector(0, 0.012, 0.025),
      ]
    case 'alternating':
      return side === 'support'
        ? [vector(0, -0.018, 0), vector(0, 0.025, 0.018), vector(0, -0.018, 0)]
        : [vector(0, 0.025, 0.018), vector(0, -0.018, 0), vector(0, 0.025, 0.018)]
    default:
      return [vector(), vector(), vector()]
  }
}

function buildMotion(
  poses: [string, string, string],
  preset: MotionPreset,
  side: 'support' | 'dominant',
): HandMotion {
  const offsets = presetVectors(preset, side)
  const frames: HandMotionFrame[] = FRAME_AT.map((at, index) => ({
    at,
    poseKey: poses[index],
    offset: offsets[index],
    rotation: vector(),
  }))
  return { frames }
}

export function createSignPack(input: SignPackDraftInput): SignPackV1 {
  const now = new Date().toISOString()
  const gloss = normalizeGloss(input.gloss)
  const referenceUrls = input.referenceUrls.map((url) => url.trim()).filter(Boolean)
  const sourcePhrases = input.sourcePhrases.map((phrase) => phrase.trim()).filter(Boolean)
  const motion: WordMotion = {
    gloss,
    durationMs: Math.round(input.durationMs),
    hands: input.hands,
    sourceLabel: 'CONTRIBUTOR-SUPPLIED REFERENCE',
    sourceUrl: referenceUrls[0] ?? 'https://example.invalid/',
    note: 'Unreviewed contributor-authored mechanical cue. Meaning, grammar, orientation, location and readability require qualified signer review.',
    ...(input.hands === 'two'
      ? { left: buildMotion(input.supportPoses, input.preset, 'support') }
      : {}),
    right: buildMotion(input.dominantPoses, input.preset, 'dominant'),
  }
  return {
    schemaVersion: SIGN_PACK_SCHEMA,
    id: input.id ?? slugForSignPack(input.language, gloss),
    language: input.language,
    region: input.region.trim(),
    gloss,
    sourcePhrases,
    referenceUrls,
    license: input.license,
    trust: 'personal-draft',
    createdAt: input.createdAt ?? now,
    updatedAt: now,
    motion,
  }
}

export function parseSignPack(text: string): SignPackV1 {
  if (new TextEncoder().encode(text).byteLength > MAX_SIGN_PACK_BYTES)
    throw new Error('Sign Pack exceeds the 256 KB limit.')
  let candidate: unknown
  try {
    candidate = JSON.parse(text)
  } catch {
    throw new Error('Sign Pack is not valid JSON.')
  }
  const validation = validateSignPack(candidate)
  if (!validation.valid) throw new Error(validation.errors.join(' '))
  return candidate as SignPackV1
}

export const serializeSignPack = (pack: SignPackV1) => `${JSON.stringify(pack, null, 2)}\n`

export function compileSignPacks(packs: SignPackV1[]): PlannerExtensions {
  const extensions: PlannerExtensions = {
    motions: { asl: {}, dsgs: {} },
    rules: { asl: [], dsgs: [] },
  }
  packs.forEach((pack) => {
    extensions.motions![pack.language]![pack.gloss] = pack.motion
    const rules = extensions.rules![pack.language] as SourceGlossRule[]
    pack.sourcePhrases.forEach((phrase) => {
      const source =
        phrase
          .toUpperCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .match(/[A-Z]+/g) ?? []
      if (source.length) rules.push({ source, glosses: [pack.gloss] })
    })
  })
  return extensions
}

export async function loadApprovedSignPacks(): Promise<SignPackV1[]> {
  try {
    const response = await fetch('/signpacks/index.json', { cache: 'no-store' })
    if (!response.ok) return []
    const candidate: unknown = await response.json()
    if (!Array.isArray(candidate)) return []
    return candidate.flatMap((item) => (validateSignPack(item).valid ? [item as SignPackV1] : []))
  } catch {
    return []
  }
}
