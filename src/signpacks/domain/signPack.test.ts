import { describe, expect, it } from 'vitest'
import { buildPlan } from '../../demo/domain/motionPlanner'
import {
  compileSignPacks,
  createSignPack,
  parseSignPack,
  serializeSignPack,
  validateSignPack,
} from './signPack'

const makePack = () =>
  createSignPack({
    language: 'asl',
    region: 'United States',
    gloss: 'ROBOT-HELLO',
    sourcePhrases: ['robot hello', 'hello robot'],
    referenceUrls: ['https://example.com/sign-reference'],
    license: 'CC-BY-4.0',
    hands: 'two',
    durationMs: 1600,
    dominantPoses: ['OPEN', 'POINT', 'OPEN'],
    supportPoses: ['OPEN', 'FIST', 'OPEN'],
    preset: 'alternating',
  })

describe('Sign Pack v1', () => {
  it('creates a private, valid, PII-free draft', () => {
    const pack = makePack()
    const validation = validateSignPack(pack)

    expect(validation.valid).toBe(true)
    expect(pack.trust).toBe('personal-draft')
    expect(pack.id).toBe('asl-robot-hello')
    expect(Object.keys(pack)).not.toContain('email')
    expect(Object.keys(pack)).not.toContain('contributorName')
    expect(Object.keys(pack)).not.toContain('accountId')
  })

  it('round-trips a valid exported pack', () => {
    const pack = makePack()
    expect(parseSignPack(serializeSignPack(pack))).toEqual(pack)
  })

  it('rejects an untrusted HTTP reference', () => {
    const pack = makePack()
    pack.referenceUrls = ['http://example.com/reference']
    expect(validateSignPack(pack).errors).toContain('referenceUrls must contain 1–10 HTTPS URLs.')
  })

  it('enforces the one-hand and two-hand schema contract', () => {
    const pack = makePack()
    pack.motion.hands = 'one'

    expect(validateSignPack(pack).valid).toBe(false)
  })

  it('rejects fields outside the portable schema', () => {
    const pack = { ...makePack(), contributorIdentity: 'redacted' }

    expect(validateSignPack(pack).errors).toContain('Sign Pack contains an unsupported property.')
  })

  it('rejects an update timestamp earlier than creation', () => {
    const pack = makePack()
    pack.createdAt = '2026-08-31T12:00:00.000Z'
    pack.updatedAt = '2026-08-31T11:59:59.000Z'

    expect(validateSignPack(pack).errors).toContain('updatedAt cannot be earlier than createdAt.')
  })

  it('rejects motion frames that are out of order', () => {
    const pack = makePack()
    pack.motion.right.frames[1].at = 0.75
    pack.motion.right.frames[2].at = 0.5

    expect(validateSignPack(pack).errors).toContain(
      'Dominant motion frame 3 must have a sorted at value from 0 to 1.',
    )
  })

  it('compiles source aliases into a word-level planner motion', () => {
    const pack = makePack()
    const plan = buildPlan('A robot hello from Zurich', 'asl', 'words', compileSignPacks([pack]))

    expect(plan.words).toEqual(['A', 'ROBOT-HELLO', 'FROM', 'ZURICH'])
    expect(plan.signedWords).toEqual(['ROBOT-HELLO'])
    expect(
      plan.sequence.some((item) => item.kind === 'sign' && item.motion.gloss === 'ROBOT-HELLO'),
    ).toBe(true)
  })
})
