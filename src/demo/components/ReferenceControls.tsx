import { HAND_EDGES } from '../domain/motionLibrary'
import type { LanguageMode, ReferencePose } from '../domain/motionLibrary'
import { poseLabel } from '../domain/referenceDiagnostics'

const MANUAL_POSES = [
  ['OPEN', 'OPEN'],
  ['FIST', 'FIST'],
  ['POINT', 'INDEX POINT'],
] as const

export function ReferenceHand({
  reference,
  letter,
  language,
}: {
  reference?: ReferencePose
  letter: string
  language: LanguageMode
}) {
  if (!reference) {
    return (
      <div className="reference-empty" aria-label="No reference for this manual pose">
        <strong>{poseLabel(letter)}</strong>
        <span>
          LETTER REFERENCE
          <br />
          NOT ACTIVE
        </span>
      </div>
    )
  }
  return (
    <svg
      className="reference-hand"
      viewBox="0 0 100 100"
      role="img"
      aria-label={`${language.toUpperCase()} reference landmarks for letter ${letter}`}
    >
      <g className="reference-bones">
        {HAND_EDGES.map(([start, end]) => (
          <line
            key={`${start}-${end}`}
            x1={reference.points[start][0]}
            y1={reference.points[start][1]}
            x2={reference.points[end][0]}
            y2={reference.points[end][1]}
          />
        ))}
      </g>
      <g className="reference-joints">
        {reference.points.map(([x, y], index) => (
          <circle key={index} cx={x} cy={y} r={index === 0 ? 2.1 : 1.35} />
        ))}
      </g>
      <text x="7" y="93">
        {language.toUpperCase()} · {letter}
      </text>
    </svg>
  )
}

export function PoseControls({
  value,
  onChange,
  onStop,
}: {
  value: string | null
  onChange(value: string): void
  onStop(): void
}) {
  return MANUAL_POSES.map(([key, label]) => (
    <button
      aria-pressed={value === key}
      className={value === key ? 'is-active' : ''}
      key={key}
      type="button"
      onClick={() => {
        onStop()
        onChange(key)
      }}
    >
      {label}
    </button>
  ))
}
