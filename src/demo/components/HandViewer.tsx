import { Grid, OrbitControls } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { useCallback, useState } from 'react'
import { ExternalLink } from '../../components/ExternalLink'
import { PlaybackIcon } from '../../components/PlaybackIcon'
import type { HandLandmarkTrace } from '../domain/landmarkValidation'
import { getDsgsWordReference } from '../domain/landmarkValidation'
import type {
  CameraView,
  HandMode,
  LanguageConfig,
  LanguageMode,
  PlanItem,
} from '../domain/motionLibrary'
import { orientationForPose } from '../domain/motionPlanner'
import type { MotionPlan } from '../domain/motionPlanner'
import { poseLabel } from '../domain/referenceDiagnostics'
import { CameraFramer } from './CameraFramer'
import { HandModel } from './HandModel'
import { PoseControls } from './ReferenceControls'

type HandViewerProps = {
  cameraView: CameraView
  config: LanguageConfig
  current?: PlanItem
  cursor: number
  handMode: HandMode
  language: LanguageMode
  leftManualPose: string | null
  packCount: number
  plan: MotionPlan
  playing: boolean
  requiresTwoHandRig: boolean
  rightManualPose: string | null
  traceId: string
  onCaptureTrace(trace: HandLandmarkTrace): void
  onChangeCameraView(view: CameraView): void
  onChangeHandMode(mode: HandMode): void
  onOpenStudio(): void
  onSetLeftManualPose(pose: string | null): void
  onSetPlaying(playing: boolean): void
  onSetRightManualPose(pose: string | null): void
  onShowAbout(): void
  onTogglePlayback(): void
}

export function HandViewer({
  cameraView,
  config,
  current,
  cursor,
  handMode,
  language,
  leftManualPose,
  packCount,
  plan,
  playing,
  requiresTwoHandRig,
  rightManualPose,
  traceId,
  onCaptureTrace,
  onChangeCameraView,
  onChangeHandMode,
  onOpenStudio,
  onSetLeftManualPose,
  onSetPlaying,
  onSetRightManualPose,
  onShowAbout,
  onTogglePlayback,
}: HandViewerProps) {
  const [rightReady, setRightReady] = useState(false)
  const [leftReady, setLeftReady] = useState(false)
  const currentLetter = current?.kind === 'letter' ? current.letter : ''
  const currentSign = current?.kind === 'sign' ? current.motion : undefined
  const currentWord =
    current?.kind === 'letter' || current?.kind === 'sign'
      ? current.word
      : (plan.words[current?.wordIndex ?? 0] ?? '')
  const currentWordIndex = current?.wordIndex ?? 0
  const rightPoseKey =
    rightManualPose ?? currentSign?.right.frames[0]?.poseKey ?? (currentLetter || 'OPEN')
  const leftPoseKey = leftManualPose ?? currentSign?.left?.frames[0]?.poseKey ?? 'OPEN'
  const rightMotion = rightManualPose ? undefined : currentSign?.right
  const leftMotion = leftManualPose ? undefined : currentSign?.left
  const activeOrientation = orientationForPose(rightPoseKey, language)
  const progress = plan.sequence.length > 1 ? (cursor / (plan.sequence.length - 1)) * 100 : 0
  const playbackLabel = playing ? 'PAUSE' : cursor >= plan.sequence.length - 1 ? 'REPLAY' : 'PLAY'
  const rightModelReady = useCallback(() => setRightReady(true), [])
  const leftModelReady = useCallback(() => setLeftReady(true), [])
  const ready = rightReady && (handMode === 'one' || leftReady)
  const traceEnabled =
    language === 'dsgs' &&
    currentSign !== undefined &&
    getDsgsWordReference(currentSign.gloss) !== undefined
  const viewDescription =
    cameraView === 'recipient'
      ? 'Palm-facing recipient view'
      : cameraView === 'side'
        ? 'Side-angle orientation check'
        : 'Back-of-hand rig inspection'

  return (
    <section className="hand-panel" aria-label="ORCA robotic hand playback">
      <Canvas
        dpr={[1, 2]}
        camera={{ fov: 28, position: [0.25, 0.18, 0.55], near: 0.001, far: 20 }}
        gl={{ antialias: true, alpha: false }}
        shadows="basic"
      >
        <color attach="background" args={['#06080b']} />
        <ambientLight intensity={0.7} color="#cad7e7" />
        <directionalLight position={[0.45, 0.7, 0.55]} intensity={2.5} color="#ffffff" castShadow />
        <directionalLight position={[-0.35, 0.3, -0.3]} intensity={1.2} color="#4d9cff" />
        <pointLight position={[0.1, -0.05, 0.28]} intensity={0.9} color="#ffffff" />
        <Grid
          position={[0, -0.06, 0]}
          args={[1.4, 1.4]}
          cellSize={0.025}
          cellColor="#151a22"
          sectionSize={0.1}
          sectionColor="#253044"
          fadeDistance={0.85}
          fadeStrength={1.6}
          infiniteGrid
        />
        <OrbitControls makeDefault enablePan={false} enableRotate={false} enableZoom={false} />
        <CameraFramer
          frameKey={`${handMode}-${cameraView}-${cursor}-${rightPoseKey}-${leftPoseKey}`}
          ready={ready}
          twoHands={handMode === 'two'}
        />
        {handMode === 'two' && (
          <HandModel
            poseKey={leftPoseKey}
            motion={leftMotion}
            motionDurationMs={currentSign?.durationMs}
            onReady={leftModelReady}
            side="left"
            twoHands
            facing={cameraView}
            language={language}
            motionKey={`left-${cursor}-${currentWord}-${leftPoseKey}-${cameraView}`}
            playing={playing && Boolean(leftMotion)}
            traceId={traceEnabled && leftMotion ? traceId : undefined}
            onTraceComplete={onCaptureTrace}
          />
        )}
        <HandModel
          poseKey={rightPoseKey}
          motion={rightMotion}
          motionDurationMs={currentSign?.durationMs}
          onReady={rightModelReady}
          side="right"
          twoHands={handMode === 'two'}
          facing={cameraView}
          language={language}
          motionKey={`${cursor}-${currentWord}-${cameraView}`}
          playing={playing}
          traceId={traceEnabled && rightMotion ? traceId : undefined}
          onTraceComplete={onCaptureTrace}
        />
      </Canvas>
      <div className="viewer-shade" aria-hidden="true" />
      <div className="viewer-header">
        <span>
          <i className={ready ? 'is-ready' : ''} />
          {ready ? 'ORCA MODEL READY' : 'LOADING ORCA MODEL'}
        </span>
        <span>{config.code} TARGET · LOCAL PROCESSING</span>
      </div>
      <div className="view-mode" role="group" aria-label="Viewing perspective">
        <button
          aria-pressed={cameraView === 'recipient'}
          className={cameraView === 'recipient' ? 'is-active' : ''}
          type="button"
          onClick={() => onChangeCameraView('recipient')}
        >
          PALM / RECIPIENT
        </button>
        <button
          aria-pressed={cameraView === 'side'}
          className={cameraView === 'side' ? 'is-active' : ''}
          type="button"
          onClick={() => onChangeCameraView('side')}
        >
          SIDE / ANGLE
        </button>
        <button
          aria-pressed={cameraView === 'rear'}
          className={cameraView === 'rear' ? 'is-active' : ''}
          type="button"
          onClick={() => onChangeCameraView('rear')}
        >
          BACK / RIG
        </button>
      </div>
      <div className="hand-mode" role="group" aria-label="Hand mode">
        <button
          className={handMode === 'one' ? 'is-active' : ''}
          type="button"
          aria-pressed={handMode === 'one'}
          disabled={requiresTwoHandRig}
          title={
            requiresTwoHandRig
              ? `${currentSign?.gloss ?? 'This cue'} requires both hands`
              : 'Inspect the dominant hand only'
          }
          onClick={() => {
            setLeftReady(false)
            onChangeHandMode('one')
          }}
        >
          ONE HAND
        </button>
        <button
          aria-pressed={handMode === 'two'}
          className={handMode === 'two' ? 'is-active' : ''}
          type="button"
          onClick={() => {
            if (handMode !== 'two') setLeftReady(false)
            onChangeHandMode('two')
          }}
        >
          TWO-HAND RIG
        </button>
      </div>
      {handMode === 'one' ? (
        <div className="viewer-status is-single">
          <small>
            {rightManualPose
              ? 'MANUAL POSE'
              : currentSign
                ? `${config.code} WORD MOTION`
                : current?.kind === 'gap'
                  ? 'WORD GAP'
                  : 'NOW FINGERSPELLING'}
          </small>
          <strong>
            {rightManualPose
              ? rightManualPose === 'POINT'
                ? 'INDEX'
                : rightManualPose
              : (currentSign?.gloss ?? rightPoseKey)}
          </strong>
          <span>
            {rightManualPose
              ? 'Manual articulation preview · playback paused'
              : currentSign
                ? `${currentSign.hands === 'two' ? 'Two-hand cue requires the two-hand rig' : 'One-hand word cue'} · review required`
                : current?.kind === 'letter'
                  ? `${current.word} · ${current.letterIndex + 1}/${current.word.length}`
                  : 'Ready to play'}
          </span>
          <em>
            ANGLE NOTE ·{' '}
            {rightManualPose
              ? activeOrientation.label
              : (currentSign?.verification?.orientation ?? activeOrientation.label)}
          </em>
        </div>
      ) : (
        <div className="viewer-status is-dual">
          <small>
            {currentSign
              ? `WORD MOTION · ${config.code} TARGET · LEXEME SOURCE-CHECKED`
              : `${current?.kind === 'letter' && current.fallback ? 'FINGERSPELLING FALLBACK' : 'DOMINANT-HAND FINGERSPELLING'} · ${config.code} TARGET`}
          </small>
          <strong>{playing ? (currentSign?.gloss ?? (currentLetter || 'GAP')) : 'READY'}</strong>
          <span>
            {playing
              ? currentSign
                ? `${currentSign.hands === 'two' ? 'dominant + support motion tracks active' : 'dominant-hand word track active'} · source-backed lexical cue`
                : `${activeOrientation.label} · right hand active · support hand idle by design`
              : `${viewDescription} · both hands independently controllable`}
          </span>
          <em>
            INTENDED ORIENTATION ·{' '}
            {currentSign?.verification?.orientation ?? activeOrientation.label}
          </em>
        </div>
      )}
      <div className="viewer-playback" aria-label="Playback beside robotic hands">
        <button
          type="button"
          disabled={!plan.sequence.length}
          onClick={onTogglePlayback}
          aria-label={`${playbackLabel} ${Math.min(currentWordIndex + 1, plan.words.length || 1)}/${plan.words.length || 1} motion beside robotic hands`}
        >
          <PlaybackIcon playing={playing} />
          <span>{playbackLabel}</span>{' '}
          <b>
            {Math.min(currentWordIndex + 1, plan.words.length || 1)}/{plan.words.length || 1}
          </b>
        </button>
        <div className="viewer-progress" aria-hidden="true">
          <span style={{ width: `${progress}%` }} />
        </div>
      </div>
      <div className={`manual-controls ${handMode === 'two' ? 'is-dual' : ''}`}>
        {handMode === 'one' ? (
          <>
            <span>MANUAL POSES</span>
            <PoseControls
              value={rightManualPose}
              onChange={onSetRightManualPose}
              onStop={() => onSetPlaying(false)}
            />
          </>
        ) : (
          <>
            <div className="hand-control-row">
              <span>SUPPORT HAND</span>
              <b>{poseLabel(leftPoseKey)}</b>
              <PoseControls
                value={leftManualPose}
                onChange={onSetLeftManualPose}
                onStop={() => onSetPlaying(false)}
              />
            </div>
            <div className="hand-control-row">
              <span>DOMINANT HAND</span>
              <b>{poseLabel(rightPoseKey)}</b>
              <PoseControls
                value={rightManualPose}
                onChange={onSetRightManualPose}
                onStop={() => onSetPlaying(false)}
              />
            </div>
          </>
        )}
      </div>
      <footer className="viewer-footer">
        <span>ACTUAL ORCA UI MODEL · WRIST RIG SHOWN FOR ANGLE CONTEXT</span>
        <div>
          <button type="button" onClick={onOpenStudio}>
            ADD WORD · {packCount} PACK{packCount === 1 ? '' : 'S'}
          </button>
          <button type="button" onClick={onShowAbout}>
            ABOUT + SOURCES
          </button>
          <ExternalLink href="https://github.com/orcahand/orca_ui">MIT SOURCE</ExternalLink>
        </div>
      </footer>
    </section>
  )
}
