import { LETTER_POSES } from '../../demo/domain/motionLibrary'
import type { MotionPreset, SignPackValidation } from '../domain/signPack'
import type { SignPackEditorState } from '../domain/signPackEditor'

const POSE_OPTIONS = ['OPEN', 'FIST', 'POINT', ...Object.keys(LETTER_POSES)]

function PoseSelect({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange(value: string): void
}) {
  return (
    <label className="studio-pose-select">
      <span>{label}</span>
      <select aria-label={label} value={value} onChange={(event) => onChange(event.target.value)}>
        {POSE_OPTIONS.map((pose) => (
          <option key={pose} value={pose}>
            {pose}
          </option>
        ))}
      </select>
    </label>
  )
}

type SignPackMotionEditorProps = {
  editor: SignPackEditorState
  error: string
  notice: string
  validation: SignPackValidation
  onDownload(): void
  onDurationChange(value: number): void
  onHandsChange(value: 'one' | 'two'): void
  onPrepareContribution(): void
  onPresetChange(value: MotionPreset): void
  onPreview(): void
  onSave(): void
  onUpdatePose(side: 'dominantPoses' | 'supportPoses', index: number, value: string): void
}

export function SignPackMotionEditor({
  editor,
  error,
  notice,
  validation,
  onDownload,
  onDurationChange,
  onHandsChange,
  onPrepareContribution,
  onPresetChange,
  onPreview,
  onSave,
  onUpdatePose,
}: SignPackMotionEditorProps) {
  return (
    <section className="studio-editor" aria-label="Motion editor and actions">
      <div className="studio-section-heading">
        <span>02</span>
        <b>MOTION EDITOR</b>
      </div>
      <p>
        Three keyframes make a bounded mechanical cue. They do not certify language, grammar or
        meaning.
      </p>
      <div className="studio-hand-switch" role="group" aria-label="Hand count">
        <button
          aria-pressed={editor.hands === 'one'}
          className={editor.hands === 'one' ? 'is-active' : ''}
          type="button"
          onClick={() => onHandsChange('one')}
        >
          ONE HAND
        </button>
        <button
          aria-pressed={editor.hands === 'two'}
          className={editor.hands === 'two' ? 'is-active' : ''}
          type="button"
          onClick={() => onHandsChange('two')}
        >
          TWO-HAND RIG
        </button>
      </div>
      <label>
        <span>MOVEMENT PRESET</span>
        <select
          value={editor.preset}
          onChange={(event) => onPresetChange(event.target.value as MotionPreset)}
        >
          <option value="still">STILL</option>
          <option value="forward">FORWARD</option>
          <option value="upward">UPWARD</option>
          <option value="outward">OUTWARD</option>
          <option value="converging">CONVERGING</option>
          <option value="alternating">ALTERNATING</option>
        </select>
      </label>
      <fieldset>
        <legend>DOMINANT HAND · 3 KEYFRAMES</legend>
        <div className="studio-pose-grid">
          {editor.dominantPoses.map((pose, index) => (
            <PoseSelect
              key={`dominant-${index}`}
              label={`0${index + 1}`}
              value={pose}
              onChange={(value) => onUpdatePose('dominantPoses', index, value)}
            />
          ))}
        </div>
      </fieldset>
      {editor.hands === 'two' ? (
        <fieldset>
          <legend>SUPPORT HAND · 3 KEYFRAMES</legend>
          <div className="studio-pose-grid">
            {editor.supportPoses.map((pose, index) => (
              <PoseSelect
                key={`support-${index}`}
                label={`0${index + 1}`}
                value={pose}
                onChange={(value) => onUpdatePose('supportPoses', index, value)}
              />
            ))}
          </div>
        </fieldset>
      ) : null}
      <label>
        <span>DURATION · {editor.durationMs}MS</span>
        <input
          type="range"
          min="500"
          max="5000"
          step="100"
          value={editor.durationMs}
          onChange={(event) => onDurationChange(Number(event.target.value))}
        />
      </label>

      <div className={`studio-validation ${validation.valid ? 'is-valid' : 'is-invalid'}`}>
        <strong>
          {validation.valid
            ? 'STRUCTURE VALID'
            : `${validation.errors.length} ISSUE${validation.errors.length === 1 ? '' : 'S'}`}
        </strong>
        <span>{validation.valid ? validation.warnings.join(' ') : validation.errors[0]}</span>
      </div>
      {error ? (
        <div className="studio-error" role="alert">
          {error}
        </div>
      ) : null}
      <div className="studio-notice" role="status">
        {notice}
      </div>
      <div className="studio-actions">
        <button className="is-primary" type="button" onClick={onPreview}>
          PREVIEW
        </button>
        <button type="button" onClick={onSave}>
          SAVE LOCAL DRAFT
        </button>
        <button type="button" onClick={onDownload}>
          EXPORT SIGN PACK
        </button>
        <button type="button" onClick={onPrepareContribution}>
          COPY CONTRIBUTION JSON
        </button>
      </div>
      <div className="studio-privacy">
        <b>PRIVATE BY DEFAULT</b>
        <span>
          No name, email, video or account identifier is stored in a Sign Pack. IndexedDB stays in
          this browser. Export and clipboard preparation require separate clicks.
        </span>
      </div>
    </section>
  )
}
