import referenceCatalog from '../data/fingerspellingReferences.json'

export type FingerState = 'open' | 'bent' | 'curled' | 'hook'
export type ThumbState = 'open' | 'bent' | 'tucked'
export type Pose = Record<string, number>
export type LanguageMode = 'dsgs' | 'asl'
export type HandMode = 'one' | 'two'
export type CameraView = 'recipient' | 'side' | 'rear'
export type PlaybackMode = 'words' | 'letters'
export type FingerName = 'index' | 'middle' | 'ring' | 'pinky'
export type MotionVector = [number, number, number]
export type HandMotionFrame = {
  at: number
  poseKey: string
  offset?: MotionVector
  rotation?: MotionVector
}
export type HandMotion = { frames: HandMotionFrame[] }
export type MotionVerification = {
  handshape: string
  movement: string
  location: string
  orientation: string
  relationship: 'converging' | 'alternating' | 'one-hand'
  expectedDominantPoses: string[]
  expectedSupportPoses?: string[]
  sources: { label: string; url: string }[]
}
export type WordMotion = {
  gloss: string
  durationMs: number
  hands: 'one' | 'two'
  sourceLabel: string
  sourceUrl: string
  note: string
  left?: HandMotion
  right: HandMotion
  verification?: MotionVerification
}
export type ReferencePose = {
  file: string
  durationMs: number
  frame: number
  confidence: number
  points: [number, number][]
  extension: Record<'thumb' | FingerName, number>
}
export type PlanItem =
  | {
      kind: 'letter'
      letter: string
      word: string
      wordIndex: number
      letterIndex: number
      fallback: boolean
    }
  | { kind: 'sign'; word: string; wordIndex: number; motion: WordMotion }
  | { kind: 'gap'; wordIndex: number }

export type LanguageConfig = {
  code: string
  inputLanguage: string
  routeLabel: string
  name: string
  region: string
  defaultScript: string
  sourceLabel: string
  sourceUrl: string
  coverage: string
}

export const MODEL_URL = '/models/hand_v2/right/hand.urdf'
export const MAX_SCRIPT_CHARS = 600
export const MAX_SCRIPT_BYTES = MAX_SCRIPT_CHARS * 4
export const REFERENCE_REPOSITORY = referenceCatalog.meta.repository
export const REFERENCE_DATA = referenceCatalog.languages as unknown as Record<
  LanguageMode,
  Record<string, ReferencePose>
>
export const SCORED_FINGERS: FingerName[] = ['index', 'middle', 'ring', 'pinky']
export const HAND_EDGES: [number, number][] = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [0, 5],
  [5, 6],
  [6, 7],
  [7, 8],
  [0, 9],
  [9, 10],
  [10, 11],
  [11, 12],
  [0, 13],
  [13, 14],
  [14, 15],
  [15, 16],
  [0, 17],
  [17, 18],
  [18, 19],
  [19, 20],
  [5, 9],
  [9, 13],
  [13, 17],
]
export const LANGUAGE_CONFIG: Record<LanguageMode, LanguageConfig> = {
  dsgs: {
    code: 'DSGS',
    inputLanguage: 'German',
    routeLabel: 'GERMAN → DSGS',
    name: 'Deutschschweizer Gebärdensprache',
    region: 'German-speaking Switzerland · Zurich target',
    defaultScript: 'Ich freue mich, von dir zu hören!',
    sourceLabel: 'UZH DSGS CORPORA',
    sourceUrl: 'https://www.cl.uzh.ch/en/research-groups/accessibility/resources.html',
    coverage: 'German source text → DSGS track · mechanical alphabet fallback only',
  },
  asl: {
    code: 'ASL',
    inputLanguage: 'English',
    routeLabel: 'ENGLISH → ASL',
    name: 'American Sign Language',
    region: 'United States · separate language and grammar',
    defaultScript: 'Look forward to speaking with you!',
    sourceLabel: 'ASL SIGNBANK',
    sourceUrl: 'https://aslsignbank.com/',
    coverage: 'English source text → ASL track · mechanical alphabet fallback only',
  },
}

export const WORD_DEMOS: Record<LanguageMode, string> = {
  dsgs: 'Kleine Kinder essen Pizza',
  asl: 'Look forward to speaking with you!',
}

const finger = (name: string, state: FingerState): Pose => {
  const values: Record<FingerState, [number, number]> = {
    open: [0.04, 0.03],
    bent: [0.72, 0.56],
    curled: [1.42, 1.48],
    hook: [0.18, 1.48],
  }
  const [mcp, pip] = values[state]
  return { [`${name}_mcp`]: mcp, [`${name}_pip`]: pip }
}

function makePose(
  index: FingerState,
  middle: FingerState,
  ring: FingerState,
  pinky: FingerState,
  thumb: ThumbState,
  wrist = 0,
): Pose {
  const thumbValues: Record<ThumbState, Pose> = {
    open: { thumb_cmc: 0.13, thumb_abd: 0.24, thumb_mcp: 0.04, thumb_dip: 0.03 },
    bent: { thumb_cmc: 0.42, thumb_abd: 0.48, thumb_mcp: 0.72, thumb_dip: 0.55 },
    tucked: { thumb_cmc: 0.72, thumb_abd: 0.62, thumb_mcp: 1.05, thumb_dip: 0.92 },
  }
  return {
    wrist,
    index_abd: -0.04,
    middle_abd: 0,
    ring_abd: 0.02,
    pinky_abd: 0.08,
    ...finger('index', index),
    ...finger('middle', middle),
    ...finger('ring', ring),
    ...finger('pinky', pinky),
    ...thumbValues[thumb],
  }
}

export const OPEN_HAND = makePose('open', 'open', 'open', 'open', 'open')
export const FIST = makePose('curled', 'curled', 'curled', 'curled', 'tucked')
export const INDEX_POINT = makePose('open', 'curled', 'curled', 'curled', 'tucked')

// These are bounded mechanical approximations, not a certified ASL or DSGS alphabet.
// Palm orientation, contact, facial grammar and body position still require practitioner review.
export const LETTER_POSES: Record<string, Pose> = {
  A: { ...FIST, thumb_cmc: 0.18, thumb_abd: 0.24, thumb_mcp: 0.18 },
  B: { ...OPEN_HAND, thumb_cmc: 0.7, thumb_abd: 0.65, thumb_mcp: 0.9 },
  C: makePose('bent', 'bent', 'bent', 'bent', 'bent'),
  D: makePose('open', 'bent', 'bent', 'bent', 'bent'),
  E: makePose('hook', 'hook', 'hook', 'hook', 'tucked'),
  F: { ...makePose('bent', 'open', 'open', 'open', 'bent'), index_pip: 0.9 },
  G: { ...INDEX_POINT, index_abd: -0.2, thumb_abd: 0.2 },
  H: makePose('open', 'open', 'curled', 'curled', 'tucked'),
  I: makePose('curled', 'curled', 'curled', 'open', 'tucked'),
  J: makePose('curled', 'curled', 'curled', 'open', 'tucked'),
  K: { ...makePose('open', 'open', 'curled', 'curled', 'bent'), index_abd: -0.2, middle_abd: 0.16 },
  L: makePose('open', 'curled', 'curled', 'curled', 'open'),
  M: { ...FIST, thumb_mcp: 0.5, thumb_dip: 0.3 },
  N: { ...FIST, index_mcp: 1.05, middle_mcp: 1.05, thumb_mcp: 0.55 },
  O: makePose('bent', 'bent', 'bent', 'bent', 'bent'),
  P: makePose('open', 'open', 'curled', 'curled', 'bent'),
  Q: { ...INDEX_POINT, thumb_abd: 0.2 },
  R: {
    ...makePose('open', 'open', 'curled', 'curled', 'tucked'),
    index_abd: 0.11,
    middle_abd: -0.1,
  },
  S: FIST,
  T: { ...FIST, thumb_cmc: 0.46, thumb_mcp: 0.38 },
  U: {
    ...makePose('open', 'open', 'curled', 'curled', 'tucked'),
    index_abd: -0.02,
    middle_abd: 0.02,
  },
  V: {
    ...makePose('open', 'open', 'curled', 'curled', 'tucked'),
    index_abd: -0.2,
    middle_abd: 0.18,
  },
  W: { ...makePose('open', 'open', 'open', 'curled', 'tucked'), index_abd: -0.19, ring_abd: 0.16 },
  X: makePose('hook', 'curled', 'curled', 'curled', 'tucked'),
  Y: makePose('curled', 'curled', 'curled', 'open', 'open'),
  Z: INDEX_POINT,
}

const frame = (
  at: number,
  poseKey: string,
  offset: MotionVector = [0, 0, 0],
  rotation: MotionVector = [0, 0, 0],
): HandMotionFrame => ({ at, poseKey, offset, rotation })

// A deliberately small word-level motion library. These are mechanical,
// source-adapted cues for prototyping the dual-hand renderer, not certified
// language output. Unknown words always fall back to the separate alphabet
// path. Source-backed lexical cues and composed phrase boundaries remain explicit.
export const WORD_MOTIONS: Record<LanguageMode, Record<string, WordMotion>> = {
  asl: {
    'LOOK-FORWARD-TO': {
      gloss: 'LOOK-FORWARD-TO',
      durationMs: 2050,
      hands: 'two',
      sourceLabel: 'HANDSPEAK · LOOK FORWARD TO',
      sourceUrl: 'https://www.handspeak.com/word/1307/',
      note: 'Both V hands are active. The dominant hand begins near the eye and curves toward the lower support V in forward signing space.',
      left: {
        frames: [
          frame(0, 'V', [0.002, -0.004, 0.018], [0, -0.08, 0.95]),
          frame(0.5, 'V', [0.012, 0.006, 0.026], [0, -0.04, 0.78]),
          frame(1, 'V', [0.024, 0.012, 0.034], [0, 0, 0.62]),
        ],
      },
      right: {
        frames: [
          frame(0, 'V', [-0.002, -0.004, 0.09], [0, 0.1, 0.08]),
          frame(0.5, 'V', [-0.022, 0.008, 0.06], [0, 0.06, -0.2]),
          frame(1, 'V', [-0.046, 0.018, 0.034], [0, 0, -0.48]),
        ],
      },
      verification: {
        handshape: 'BOTH V HANDS',
        movement: 'CURVED APPROACH · ONE CONTACT',
        location: 'DOMINANT AT EYE → FORWARD SPACE',
        orientation: 'ASYMMETRIC · SUPPORT V LOWER',
        relationship: 'converging',
        expectedDominantPoses: ['V'],
        expectedSupportPoses: ['V'],
        sources: [
          { label: 'HANDSPEAK · NATIVE-SIGNER VIDEO', url: 'https://www.handspeak.com/word/1307/' },
          { label: 'ASL-LEX 2.0 · PHONOLOGY', url: 'https://asl-lex.org/visualization/' },
          { label: 'SIGNASL · SECOND VIDEO', url: 'https://www.signasl.org/sign/look-forward-to' },
        ],
      },
    },
    TALK: {
      gloss: 'TALK / DIALOGUE',
      durationMs: 1750,
      hands: 'two',
      sourceLabel: 'HANDSPEAK · TALK / DIALOGUE',
      sourceUrl: 'https://www.handspeak.com/word/3919/',
      note: 'The two-handed dialogue variant keeps both index hands upright while they alternate forward in face-to-neutral signing space.',
      left: {
        frames: [
          frame(0, 'POINT', [0, -0.04, 0.024], [0.05, -0.06, -0.04]),
          frame(0.25, 'POINT', [-0.014, 0.07, 0.012], [-0.3, 0.04, -0.12]),
          frame(0.5, 'POINT', [0, -0.04, 0.024], [0.05, -0.06, -0.04]),
          frame(0.75, 'POINT', [-0.014, 0.07, 0.012], [-0.3, 0.04, -0.12]),
          frame(1, 'POINT', [0, -0.04, 0.024], [0.05, -0.06, -0.04]),
        ],
      },
      right: {
        frames: [
          frame(0, 'POINT', [0.014, 0.07, 0.012], [-0.3, -0.04, 0.12]),
          frame(0.25, 'POINT', [0, -0.04, 0.024], [0.05, 0.06, 0.04]),
          frame(0.5, 'POINT', [0.014, 0.07, 0.012], [-0.3, -0.04, 0.12]),
          frame(0.75, 'POINT', [0, -0.04, 0.024], [0.05, 0.06, 0.04]),
          frame(1, 'POINT', [0.014, 0.07, 0.012], [-0.3, -0.04, 0.12]),
        ],
      },
      verification: {
        handshape: 'BOTH 1 / INDEX HANDS',
        movement: 'ALTERNATING FORWARD · REPEATED',
        location: 'FACE / NEUTRAL SPACE',
        orientation: 'UPRIGHT INDEXES',
        relationship: 'alternating',
        expectedDominantPoses: ['POINT'],
        expectedSupportPoses: ['POINT'],
        sources: [
          {
            label: 'HANDSPEAK · TALK / DIALOGUE VIDEO',
            url: 'https://www.handspeak.com/word/3919/',
          },
        ],
      },
    },
    YOU: {
      gloss: 'YOU',
      durationMs: 1100,
      hands: 'one',
      sourceLabel: 'HANDSPEAK · YOU',
      sourceUrl: 'https://www.handspeak.com/word/2448/',
      note: 'Dominant index finger points toward the recipient, adapted from the native-signer reference.',
      right: {
        frames: [
          frame(0, 'POINT', [-0.012, -0.004, 0.018]),
          frame(0.55, 'POINT', [0, 0.018, 0.012]),
          frame(1, 'POINT', [0.012, 0.032, 0.008]),
        ],
      },
      verification: {
        handshape: 'DOMINANT 1 / INDEX HAND',
        movement: 'STRAIGHT TOWARD LISTENER',
        location: 'NEUTRAL → RECIPIENT',
        orientation: 'INDEX TARGETS LISTENER',
        relationship: 'one-hand',
        expectedDominantPoses: ['POINT'],
        sources: [
          { label: 'HANDSPEAK · YOU VIDEO', url: 'https://www.handspeak.com/word/2448/' },
          { label: 'ASL-LEX 2.0 · PHONOLOGY', url: 'https://asl-lex.org/visualization/' },
        ],
      },
    },
    HELP: {
      gloss: 'HELP',
      durationMs: 1700,
      hands: 'two',
      sourceLabel: 'ASL SIGNBANK · HELP',
      sourceUrl: 'https://aslsignbank.com/dictionary/gloss/2219.html',
      note: 'Two-hand mechanical cue: fist above an open support palm, lifting together.',
      left: {
        frames: [
          frame(0, 'OPEN', [0.044, 0, -0.026]),
          frame(0.38, 'OPEN', [0.044, 0, -0.012]),
          frame(1, 'OPEN', [0.044, 0, 0.032]),
        ],
      },
      right: {
        frames: [
          frame(0, 'A', [-0.044, -0.004, -0.002]),
          frame(0.38, 'A', [-0.044, -0.004, 0.012]),
          frame(1, 'A', [-0.044, -0.004, 0.056]),
        ],
      },
    },
    COLLABORATE: {
      gloss: 'COLLABORATE',
      durationMs: 2050,
      hands: 'two',
      sourceLabel: 'ASL SIGNBANK · COLLABORATE',
      sourceUrl: 'https://aslsignbank.com/dictionary/gloss/3954.html',
      note: 'Paired closed-hand motion cue adapted from the collaborate / work-together reference.',
      left: {
        frames: [
          frame(0, 'FIST', [0.018, 0, -0.01]),
          frame(0.25, 'FIST', [0.032, 0, 0.016], [0, 0.2, 0]),
          frame(0.5, 'FIST', [0.012, 0, 0.032], [0, 0.4, 0]),
          frame(0.75, 'FIST', [-0.008, 0, 0.012], [0, 0.2, 0]),
          frame(1, 'FIST', [0.018, 0, -0.01]),
        ],
      },
      right: {
        frames: [
          frame(0, 'FIST', [-0.018, 0, -0.01]),
          frame(0.25, 'FIST', [-0.032, 0, 0.016], [0, -0.2, 0]),
          frame(0.5, 'FIST', [-0.012, 0, 0.032], [0, -0.4, 0]),
          frame(0.75, 'FIST', [0.008, 0, 0.012], [0, -0.2, 0]),
          frame(1, 'FIST', [-0.018, 0, -0.01]),
        ],
      },
    },
    THANKS: {
      gloss: 'THANK-YOU',
      durationMs: 1450,
      hands: 'one',
      sourceLabel: 'ASL SIGNBANK · THANK-YOU',
      sourceUrl: 'https://aslsignbank.com/dictionary/gloss/1198.html',
      note: 'Open-hand outward movement cue adapted from the THANK-YOU reference.',
      right: {
        frames: [
          frame(0, 'B', [-0.035, -0.008, 0.056], [0.08, 0, 0]),
          frame(0.42, 'B', [-0.012, -0.002, 0.038], [0.02, 0, 0]),
          frame(1, 'B', [0.02, 0.012, 0.005], [-0.08, 0, 0]),
        ],
      },
    },
  },
  dsgs: {
    KLEINE: {
      gloss: 'KLEINE',
      durationMs: 1650,
      hands: 'two',
      sourceLabel: 'ZURICHNLP DSGS POSE · KLEINE',
      sourceUrl: 'https://github.com/sign-language-processing/spoken-to-signed-translation',
      note: 'Mechanical cue staged from the bundled DSGS dummy-lexicon pose sequence.',
      left: {
        frames: [
          frame(0, 'C', [0.018, 0, 0.025]),
          frame(0.5, 'C', [0.038, 0, -0.005]),
          frame(1, 'C', [0.018, 0, -0.025]),
        ],
      },
      right: {
        frames: [
          frame(0, 'C', [-0.018, 0, 0.025]),
          frame(0.5, 'C', [-0.038, 0, -0.005]),
          frame(1, 'C', [-0.018, 0, -0.025]),
        ],
      },
    },
    KINDER: {
      gloss: 'KINDER',
      durationMs: 1500,
      hands: 'one',
      sourceLabel: 'ZURICHNLP DSGS POSE · KINDER',
      sourceUrl: 'https://github.com/sign-language-processing/spoken-to-signed-translation',
      note: 'One-hand mechanical cue staged from the bundled DSGS dummy-lexicon pose sequence.',
      right: {
        frames: [
          frame(0, 'OPEN', [-0.025, 0, 0.04]),
          frame(0.5, 'OPEN', [0, 0, 0.004]),
          frame(1, 'OPEN', [0.026, 0, -0.028]),
        ],
      },
    },
    ESSEN: {
      gloss: 'ESSEN',
      durationMs: 1750,
      hands: 'two',
      sourceLabel: 'ZURICHNLP DSGS POSE · ESSEN',
      sourceUrl: 'https://github.com/sign-language-processing/spoken-to-signed-translation',
      note: 'Two-hand mechanical cue staged from the bundled DSGS dummy-lexicon pose sequence.',
      left: {
        frames: [
          frame(0, 'B', [0.018, 0, -0.02]),
          frame(0.45, 'O', [0.038, -0.005, 0.035]),
          frame(1, 'O', [0.048, -0.008, 0.058]),
        ],
      },
      right: {
        frames: [
          frame(0, 'B', [-0.018, 0, -0.02]),
          frame(0.45, 'O', [-0.038, -0.005, 0.035]),
          frame(1, 'O', [-0.048, -0.008, 0.058]),
        ],
      },
    },
    PIZZA: {
      gloss: 'PIZZA',
      durationMs: 1900,
      hands: 'two',
      sourceLabel: 'ZURICHNLP DSGS POSE · PIZZA',
      sourceUrl: 'https://github.com/sign-language-processing/spoken-to-signed-translation',
      note: 'Two-hand mechanical cue staged from the bundled DSGS dummy-lexicon pose sequence.',
      left: {
        frames: [
          frame(0, 'OPEN', [0.028, 0, -0.022]),
          frame(0.5, 'C', [0.012, 0, 0.012], [0, 0.18, 0]),
          frame(1, 'OPEN', [0.034, 0, 0.035]),
        ],
      },
      right: {
        frames: [
          frame(0, 'POINT', [-0.02, 0, -0.018]),
          frame(0.33, 'POINT', [0.02, 0, 0.008]),
          frame(0.66, 'POINT', [-0.02, 0, 0.026]),
          frame(1, 'POINT', [0.02, 0, 0.044]),
        ],
      },
    },
  },
}

WORD_MOTIONS.asl.THANK = WORD_MOTIONS.asl.THANKS
WORD_MOTIONS.asl.TOGETHER = WORD_MOTIONS.asl.COLLABORATE
