import { describe, expect, it } from 'vitest'
import { WORD_MOTIONS } from './motionLibrary'
import {
  buildPlan,
  itemDuration,
  sampleMotion,
  SIGN_REVIEW_HOLD_MS,
  TRANSITION_GAP_MS,
  validateMotionRules,
} from './motionPlanner'

describe('motion planning', () => {
  it('maps the example phrase to three source-backed ASL cues', () => {
    const plan = buildPlan('Look forward to speaking with you!', 'asl', 'words')

    expect(plan.words).toEqual(['LOOK-FORWARD-TO', 'TALK', 'YOU'])
    expect(plan.signedWords).toEqual(plan.words)
    expect(plan.fallbackWords).toEqual([])
    expect(plan.sequence.filter((item) => item.kind === 'sign')).toHaveLength(3)
  })

  it('finds a known phrase inside otherwise new English text', () => {
    const plan = buildPlan(
      'Tomorrow I look forward to speaking with you about robots.',
      'asl',
      'words',
    )

    expect(plan.words).toEqual(['TOMORROW', 'LOOK-FORWARD-TO', 'TALK', 'YOU', 'ABOUT', 'ROBOTS'])
    expect(plan.signedWords).toEqual(['LOOK-FORWARD-TO', 'TALK', 'YOU'])
    expect(plan.fallbackWords).toEqual(['TOMORROW', 'ABOUT', 'ROBOTS'])
    expect(plan.translationNote).toContain(
      'I LOOK FORWARD TO SPEAKING WITH YOU → LOOK-FORWARD-TO · TALK · YOU',
    )
  })

  it('uses the longest matching source phrase before smaller aliases', () => {
    const plan = buildPlan('Thank you. Let us work together.', 'asl', 'words')

    expect(plan.words).toEqual(['THANKS', 'LET', 'US', 'COLLABORATE'])
    expect(plan.signedWords).toEqual(['THANKS', 'COLLABORATE'])
    expect(plan.fallbackWords).toEqual(['LET', 'US'])
  })

  it('falls back to fingerspelling when a word has no motion track', () => {
    const plan = buildPlan('ORCA', 'asl', 'words')

    expect(plan.fallbackWords).toEqual(['ORCA'])
    expect(plan.sequence.filter((item) => item.kind === 'letter')).toHaveLength(4)
    expect(plan.sequence.every((item) => item.kind !== 'letter' || item.fallback)).toBe(true)
  })

  it('normalizes German umlauts for the mechanical alphabet path', () => {
    const plan = buildPlan('Bär', 'dsgs', 'letters')

    expect(plan.words).toEqual(['BAER'])
    expect(plan.substitutions).toContain('Ä → AE')
  })

  it('keeps letters-only mode literal even when word motions exist', () => {
    const plan = buildPlan('Thank you', 'asl', 'letters')

    expect(plan.words).toEqual(['THANK', 'YOU'])
    expect(plan.signedWords).toEqual([])
    expect(plan.fallbackWords).toEqual([])
    expect(plan.sequence.filter((item) => item.kind === 'letter')).toHaveLength(8)
    expect(plan.sequence.every((item) => item.kind !== 'letter' || !item.fallback)).toBe(true)
  })

  it('uses available DSGS word motions and letters for unsupported words', () => {
    const plan = buildPlan('Kleine Roboter essen Pizza', 'dsgs', 'words')

    expect(plan.words).toEqual(['KLEINE', 'ROBOTER', 'ESSEN', 'PIZZA'])
    expect(plan.signedWords).toEqual(['KLEINE', 'ESSEN', 'PIZZA'])
    expect(plan.fallbackWords).toEqual(['ROBOTER'])
    expect(plan.sequence.filter((item) => item.kind === 'letter')).toHaveLength(7)
  })

  it('prefers a runtime Sign Pack rule and motion over letter fallback', () => {
    const customMotion = WORD_MOTIONS.asl.YOU
    const plan = buildPlan('custom greeting', 'asl', 'words', {
      motions: { asl: { 'CUSTOM-GREETING': customMotion } },
      rules: { asl: [{ source: ['CUSTOM', 'GREETING'], glosses: ['CUSTOM-GREETING'] }] },
    })

    expect(plan.words).toEqual(['CUSTOM-GREETING'])
    expect(plan.signedWords).toEqual(['CUSTOM-GREETING'])
    expect(plan.fallbackWords).toEqual([])
  })
})

describe('motion rules', () => {
  it('passes every encoded check for the example phrase cues', () => {
    for (const key of ['LOOK-FORWARD-TO', 'TALK', 'YOU'] as const) {
      const result = validateMotionRules(WORD_MOTIONS.asl[key])
      expect(result).not.toBeNull()
      expect(result?.passed).toBe(result?.total)
    }
  })

  it('interpolates a motion and preserves explicit timing', () => {
    const motion = WORD_MOTIONS.asl.YOU.right
    const frame = sampleMotion(motion, 0.5)

    expect(frame?.at).toBe(0.5)
    expect(frame?.offset?.[1]).toBeGreaterThan(0)
    expect(itemDuration({ kind: 'gap', wordIndex: 0 })).toBe(TRANSITION_GAP_MS)
    expect(
      itemDuration({
        kind: 'sign',
        word: 'YOU',
        wordIndex: 0,
        motion: WORD_MOTIONS.asl.YOU,
      }),
    ).toBe(WORD_MOTIONS.asl.YOU.durationMs + SIGN_REVIEW_HOLD_MS)
  })
})
