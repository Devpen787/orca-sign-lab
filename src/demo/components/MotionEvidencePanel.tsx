import { ExternalLink } from '../../components/ExternalLink'
import {
  compareOrcaTrace,
  DSGS_REFERENCE_REPOSITORY,
  DSGS_REFERENCE_REVISION,
  getDsgsWordReference,
} from '../domain/landmarkValidation'
import type { TraceSet } from '../domain/landmarkValidation'
import { REFERENCE_DATA, REFERENCE_REPOSITORY } from '../domain/motionLibrary'
import type { LanguageConfig, LanguageMode, WordMotion } from '../domain/motionLibrary'
import { validateMotionRules } from '../domain/motionPlanner'
import { compareFlexion } from '../domain/referenceDiagnostics'
import { ReferenceHand } from './ReferenceControls'

type MotionEvidencePanelProps = {
  capturedTrace?: TraceSet
  config: LanguageConfig
  currentSign?: WordMotion
  language: LanguageMode
  playing: boolean
  rightPoseKey: string
}

export function MotionEvidencePanel({
  capturedTrace,
  config,
  currentSign,
  language,
  playing,
  rightPoseKey,
}: MotionEvidencePanelProps) {
  const referencePose = REFERENCE_DATA[language][rightPoseKey]
  const comparison = compareFlexion(rightPoseKey, referencePose)
  const motionValidation = validateMotionRules(currentSign)
  const dsgsReference =
    language === 'dsgs' && currentSign ? getDsgsWordReference(currentSign.gloss) : undefined
  const independentComparison = dsgsReference
    ? compareOrcaTrace(currentSign!.gloss, capturedTrace ?? {})
    : null
  const capturedHandCount = Object.keys(capturedTrace ?? {}).length

  if (!currentSign) {
    return (
      <div
        className="reference-card"
        aria-label="Machine-readable fingerspelling reference comparison"
      >
        <div className="reference-card-header">
          <span>{config.code} FINGERSPELLING REFERENCE</span>
          <b className={referencePose ? 'is-found' : ''}>
            {referencePose ? 'POSE FOUND' : 'MANUAL MODE'}
          </b>
        </div>
        <div className="reference-card-body">
          <ReferenceHand reference={referencePose} letter={rightPoseKey} language={language} />
          <div className="reference-metrics">
            <div>
              <span>CONTROL FIT</span>
              <strong>{comparison ? `${comparison.score}%` : '—'}</strong>
            </div>
            <div>
              <span>LANDMARKS</span>
              <strong>{referencePose ? '21' : '—'}</strong>
            </div>
            <div>
              <span>SOURCE CONF.</span>
              <strong>
                {referencePose ? `${Math.round(referencePose.confidence * 100)}%` : '—'}
              </strong>
            </div>
            <p>
              {referencePose
                ? 'Compares four-finger flexion against the reference frame. Contact, thumb placement, palm orientation and motion remain unscored.'
                : 'Select or play an A–Z letter to load its language-specific reference.'}
            </p>
          </div>
        </div>
        {comparison && (
          <div className="finger-matches" aria-label="Per-finger flexion match">
            {comparison.fingers.map(({ fingerName, match }) => (
              <div
                key={fingerName}
                title={`${fingerName}: ${Math.round(match * 100)}% flexion match`}
              >
                <span>{fingerName.slice(0, 3).toUpperCase()}</span>
                <i>
                  <b style={{ width: `${Math.round(match * 100)}%` }} />
                </i>
              </div>
            ))}
          </div>
        )}
        <p className="reference-limit">
          <b>NOT A LINGUISTIC PASS.</b> This is an automated geometry check. A Deaf {config.code}{' '}
          signer must still review readability, timing, location and grammar.
        </p>
        <div className="reference-links">
          <ExternalLink href={REFERENCE_REPOSITORY}>OPEN POSE DATA · MIT</ExternalLink>
          <ExternalLink href={config.sourceUrl}>{config.sourceLabel}</ExternalLink>
        </div>
      </div>
    )
  }

  return (
    <div className="reference-card word-motion-card" aria-label="Current word motion cue">
      <div className="reference-card-header">
        <span>{config.code} SOURCE-CHECKED MOTION</span>
        <b
          className={
            motionValidation && motionValidation.passed === motionValidation.total
              ? 'is-found'
              : 'is-review'
          }
        >
          {motionValidation
            ? `INTERNAL RULES ${motionValidation.passed}/${motionValidation.total}`
            : 'NO INTERNAL RULE SET'}
        </b>
      </div>
      <div className="word-motion-body">
        <div>
          <span>GLOSS</span>
          <strong>{currentSign.gloss}</strong>
        </div>
        <dl>
          <div>
            <dt>HAND TRACKS</dt>
            <dd>{currentSign.hands === 'two' ? 'DOMINANT + SUPPORT' : 'DOMINANT'}</dd>
          </div>
          <div>
            <dt>DURATION</dt>
            <dd>{(currentSign.durationMs / 1000).toFixed(1)}S</dd>
          </div>
          <div>
            <dt>PLAN MODE</dt>
            <dd>WORD SIGN</dd>
          </div>
        </dl>
      </div>
      {currentSign.verification && (
        <dl className="motion-parameters">
          <div>
            <dt>HANDSHAPE</dt>
            <dd>{currentSign.verification.handshape}</dd>
          </div>
          <div>
            <dt>MOVEMENT</dt>
            <dd>{currentSign.verification.movement}</dd>
          </div>
          <div>
            <dt>LOCATION</dt>
            <dd>{currentSign.verification.location}</dd>
          </div>
          <div>
            <dt>ORIENTATION</dt>
            <dd>{currentSign.verification.orientation}</dd>
          </div>
        </dl>
      )}
      {motionValidation && (
        <div className="motion-checks" aria-label="Robot motion rule checks">
          {motionValidation.checks.map((check) => (
            <span className={check.pass ? 'is-pass' : 'is-fail'} key={check.label}>
              {check.pass ? '✓' : '×'} {check.label}
            </span>
          ))}
        </div>
      )}
      {dsgsReference && (
        <section className="landmark-validation" aria-label="Independent ORCA landmark comparison">
          <div className="landmark-validation-header">
            <span>ACTUAL ORCA TRACE → PINNED DSGS POSE</span>
            <b className={independentComparison ? 'is-measured' : ''}>
              {independentComparison
                ? 'MEASURED · UNBENCHMARKED'
                : playing
                  ? `CAPTURING ${capturedHandCount}/${dsgsReference.availableHands.length} HANDS`
                  : 'PLAY TO MEASURE'}
            </b>
          </div>
          <dl>
            <div>
              <dt>HANDSHAPE DIST.</dt>
              <dd>
                {independentComparison ? independentComparison.handshapeDistance.toFixed(3) : '—'}
              </dd>
            </div>
            <div>
              <dt>MOTION DIST.</dt>
              <dd>
                {independentComparison ? independentComparison.movementDistance.toFixed(3) : '—'}
              </dd>
            </div>
            <div>
              <dt>HAND USE</dt>
              <dd>
                {independentComparison
                  ? independentComparison.handUseMatches
                    ? 'MATCH'
                    : 'MISMATCH'
                  : '—'}
              </dd>
            </div>
            <div>
              <dt>TRACE SAMPLES</dt>
              <dd>
                {independentComparison
                  ? `${independentComparison.candidateSamples} / ${independentComparison.referenceSamples}`
                  : '—'}
              </dd>
            </div>
          </dl>
          <p>
            <b>LOWER DISTANCE IS CLOSER. NO PASS THRESHOLD YET.</b> Measures rotation-invariant
            joint articulation and direction-invariant wrist dynamics from the rendered URDF.
            Absolute location, directional orientation, body/face grammar and meaning remain
            unsupported.
          </p>
          <div className="landmark-validation-source">
            <ExternalLink href={`${DSGS_REFERENCE_REPOSITORY}/tree/${DSGS_REFERENCE_REVISION}`}>
              PINNED SOURCE · {dsgsReference.sourceFile}
            </ExternalLink>
            <span>DEAF SIGNER REVIEW STILL REQUIRED</span>
          </div>
        </section>
      )}
      <p className="reference-limit">
        {currentSign.note}{' '}
        <b>
          Lexical parameters are source-checked; the phrase sequence is composed, not a
          continuous-corpus certification.
        </b>
      </p>
      <div className="reference-links">
        <div>
          {(
            currentSign.verification?.sources ?? [
              { label: currentSign.sourceLabel, url: currentSign.sourceUrl },
            ]
          ).map((source) => (
            <ExternalLink href={source.url} key={source.url}>
              {source.label}
            </ExternalLink>
          ))}
        </div>
        <span>LEXEME SOURCE-CHECKED · PHRASE COMPOSED</span>
      </div>
    </div>
  )
}
