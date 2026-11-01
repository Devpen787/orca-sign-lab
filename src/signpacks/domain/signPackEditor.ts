import type { LanguageMode } from '../../demo/domain/motionLibrary'
import { createSignPack } from './signPack'
import type { MotionPreset, SignPackLicense, SignPackV1 } from './signPack'

export type SignPackEditorState = {
  language: LanguageMode
  region: string
  sourcePhrases: string
  gloss: string
  referenceUrls: string
  license: SignPackLicense
  hands: 'one' | 'two'
  dominantPoses: [string, string, string]
  supportPoses: [string, string, string]
  durationMs: number
  preset: MotionPreset
  id?: string
  createdAt?: string
}

export const INITIAL_SIGN_PACK_EDITOR: SignPackEditorState = {
  language: 'asl',
  region: 'United States',
  sourcePhrases: 'hello',
  gloss: 'HELLO',
  referenceUrls: 'https://www.handspeak.com/word/1015/',
  license: 'CC-BY-4.0',
  hands: 'one',
  dominantPoses: ['OPEN', 'OPEN', 'OPEN'],
  supportPoses: ['OPEN', 'OPEN', 'OPEN'],
  durationMs: 1500,
  preset: 'forward',
}

function splitLines(value: string) {
  return value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

export function editorToSignPack(editor: SignPackEditorState) {
  return createSignPack({
    id: editor.id,
    language: editor.language,
    region: editor.region,
    sourcePhrases: splitLines(editor.sourcePhrases),
    gloss: editor.gloss,
    referenceUrls: splitLines(editor.referenceUrls),
    license: editor.license,
    hands: editor.hands,
    durationMs: editor.durationMs,
    dominantPoses: editor.dominantPoses,
    supportPoses: editor.supportPoses,
    preset: editor.preset,
    createdAt: editor.createdAt,
  })
}

export function signPackToEditor(pack: SignPackV1): SignPackEditorState {
  const poseAt = (frames: { poseKey: string }[], index: number) =>
    frames[Math.min(index, frames.length - 1)]?.poseKey ?? 'OPEN'
  return {
    language: pack.language,
    region: pack.region,
    sourcePhrases: pack.sourcePhrases.join('\n'),
    gloss: pack.gloss,
    referenceUrls: pack.referenceUrls.join('\n'),
    license: pack.license,
    hands: pack.motion.hands,
    dominantPoses: [
      poseAt(pack.motion.right.frames, 0),
      poseAt(pack.motion.right.frames, 1),
      poseAt(pack.motion.right.frames, 2),
    ],
    supportPoses: pack.motion.left
      ? [
          poseAt(pack.motion.left.frames, 0),
          poseAt(pack.motion.left.frames, 1),
          poseAt(pack.motion.left.frames, 2),
        ]
      : ['OPEN', 'OPEN', 'OPEN'],
    durationMs: pack.motion.durationMs,
    preset: 'still',
    id: pack.id,
    createdAt: pack.createdAt,
  }
}
