import { describe, expect, it } from 'vitest'
import { compareOrcaTrace, getDsgsWordReference } from './landmarkValidation'
import type { HandLandmarkTrace, HandSide, TraceSet } from './landmarkValidation'

function candidateFromReference(gloss: string): TraceSet {
  const reference = getDsgsWordReference(gloss)
  if (!reference) throw new Error(`Missing test reference: ${gloss}`)
  return Object.fromEntries(
    reference.availableHands.map((side: HandSide) => [
      side,
      {
        traceId: `test-${gloss}`,
        side,
        frames: reference.hands[side].map((frame) => ({ at: frame.at, points: frame.points })),
      } satisfies HandLandmarkTrace,
    ]),
  )
}

describe('independent landmark comparison', () => {
  it('returns zero distance for the unchanged pinned reference', () => {
    const result = compareOrcaTrace('KLEINE', candidateFromReference('KLEINE'))
    expect(result?.handshapeDistance).toBeCloseTo(0, 8)
    expect(result?.movementDistance).toBeCloseTo(0, 8)
    expect(result?.handUseMatches).toBe(true)
  })

  it('separates a collapsed hand from the pinned reference', () => {
    const candidate = candidateFromReference('KLEINE')
    const right = candidate.right!
    candidate.right = {
      ...right,
      frames: right.frames.map((frame) => ({
        ...frame,
        points: frame.points.map(() => [...frame.points[0]]) as typeof frame.points,
      })),
    }
    const result = compareOrcaTrace('KLEINE', candidate)
    expect(result?.handshapeDistance).toBeGreaterThan(0.1)
  })

  it('reports a missing support hand independently of shape distance', () => {
    const candidate = candidateFromReference('KLEINE')
    delete candidate.left
    const result = compareOrcaTrace('KLEINE', candidate)
    expect(result?.handUseMatches).toBe(false)
    expect(result?.candidateSamples).toBe(15)
    expect(result?.referenceSamples).toBe(30)
  })
})
