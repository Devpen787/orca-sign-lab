import { useCallback, useMemo, useState } from 'react'
import type { ChangeEvent } from 'react'
import { HandViewer } from './components/HandViewer'
import { MotionEvidencePanel } from './components/MotionEvidencePanel'
import { SourcePlanPanel } from './components/SourcePlanPanel'
import type { HandLandmarkTrace, TraceSet } from './domain/landmarkValidation'
import {
  LANGUAGE_CONFIG,
  MAX_SCRIPT_BYTES,
  MAX_SCRIPT_CHARS,
  WORD_DEMOS,
} from './domain/motionLibrary'
import type { CameraView, LanguageMode, PlaybackMode } from './domain/motionLibrary'
import { buildPlan } from './domain/motionPlanner'
import { usePlaybackController } from './hooks/usePlaybackController'
import { useSignPackRegistry } from './hooks/useSignPackRegistry'
import './demo.css'

type SignDemoProps = {
  onOpenStudio(): void
  onShowAbout(): void
}

export function SignDemo({ onOpenStudio, onShowAbout }: SignDemoProps) {
  const [language, setLanguage] = useState<LanguageMode>('asl')
  const [playbackMode, setPlaybackMode] = useState<PlaybackMode>('words')
  const [script, setScript] = useState(LANGUAGE_CONFIG.asl.defaultScript)
  const [generatedScript, setGeneratedScript] = useState(LANGUAGE_CONFIG.asl.defaultScript)
  const [cameraView, setCameraView] = useState<CameraView>('recipient')
  const [capturedTraces, setCapturedTraces] = useState<Record<string, TraceSet>>({})
  const { plannerExtensions, packCount } = useSignPackRegistry()
  const config = LANGUAGE_CONFIG[language]
  const plan = useMemo(
    () => buildPlan(generatedScript, language, playbackMode, plannerExtensions),
    [generatedScript, language, playbackMode, plannerExtensions],
  )
  const playback = usePlaybackController(plan)
  const {
    cursor,
    current,
    currentSign,
    playing,
    handMode,
    rightManualPose,
    leftManualPose,
    requiresTwoHandRig,
    setHandMode,
    setRightManualPose,
    setLeftManualPose,
    setPlaying,
    reset: resetPlayback,
    toggle: togglePlayback,
    selectWord,
    changeHandMode,
  } = playback
  const currentLetter = current?.kind === 'letter' ? current.letter : ''
  const currentWord =
    current?.kind === 'letter' || current?.kind === 'sign'
      ? current.word
      : (plan.words[current?.wordIndex ?? 0] ?? '')
  const currentWordIndex = current?.wordIndex ?? 0
  const currentWordLetterIndex = current?.kind === 'letter' ? current.letterIndex : -1
  const rightPoseKey =
    rightManualPose ?? currentSign?.right.frames[0]?.poseKey ?? (currentLetter || 'OPEN')
  const traceId = `${language}:${generatedScript}:${cursor}:${currentWord}:${handMode}`

  const clearEvidenceAndPlayback = () => {
    setCapturedTraces({})
    resetPlayback()
  }

  const changeLanguage = (nextLanguage: LanguageMode) => {
    const nextConfig = LANGUAGE_CONFIG[nextLanguage]
    setLanguage(nextLanguage)
    setScript(nextConfig.defaultScript)
    setGeneratedScript(nextConfig.defaultScript)
    clearEvidenceAndPlayback()
  }

  const changePlaybackMode = (nextMode: PlaybackMode) => {
    setPlaybackMode(nextMode)
    if (nextMode === 'words') setHandMode('two')
    clearEvidenceAndPlayback()
  }

  const loadWordDemo = () => {
    const demo = WORD_DEMOS[language]
    setScript(demo)
    setGeneratedScript(demo)
    setPlaybackMode('words')
    setHandMode('two')
    clearEvidenceAndPlayback()
  }

  const generate = () => {
    setGeneratedScript(script.trim() || config.defaultScript)
    clearEvidenceAndPlayback()
  }

  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const text = (await file.slice(0, MAX_SCRIPT_BYTES).text()).slice(0, MAX_SCRIPT_CHARS)
    setScript(text)
    setGeneratedScript(text)
    clearEvidenceAndPlayback()
    event.target.value = ''
  }

  const captureTrace = useCallback((trace: HandLandmarkTrace) => {
    setCapturedTraces((existing) => ({
      ...existing,
      [trace.traceId]: {
        ...existing[trace.traceId],
        [trace.side]: trace,
      },
    }))
  }, [])

  return (
    <main className="translator-shell" data-language={language} data-perspective={cameraView}>
      <section className="script-panel" aria-label="Script and motion plan">
        <SourcePlanPanel
          config={config}
          currentSign={currentSign}
          currentWord={currentWord}
          currentWordIndex={currentWordIndex}
          currentWordLetterIndex={currentWordLetterIndex}
          cursor={cursor}
          language={language}
          plan={plan}
          playbackMode={playbackMode}
          playing={playing}
          script={script}
          onChangeLanguage={changeLanguage}
          onChangePlaybackMode={changePlaybackMode}
          onGenerate={generate}
          onLoadWordDemo={loadWordDemo}
          onScriptChange={setScript}
          onSelectWord={selectWord}
          onTogglePlayback={togglePlayback}
          onUpload={upload}
        />
        <MotionEvidencePanel
          capturedTrace={capturedTraces[traceId]}
          config={config}
          currentSign={currentSign}
          language={language}
          playing={playing}
          rightPoseKey={rightPoseKey}
        />
      </section>

      <HandViewer
        cameraView={cameraView}
        config={config}
        current={current}
        cursor={cursor}
        handMode={handMode}
        language={language}
        leftManualPose={leftManualPose}
        packCount={packCount}
        plan={plan}
        playing={playing}
        requiresTwoHandRig={requiresTwoHandRig}
        rightManualPose={rightManualPose}
        traceId={traceId}
        onCaptureTrace={captureTrace}
        onChangeCameraView={setCameraView}
        onChangeHandMode={changeHandMode}
        onOpenStudio={onOpenStudio}
        onSetLeftManualPose={setLeftManualPose}
        onSetPlaying={setPlaying}
        onSetRightManualPose={setRightManualPose}
        onShowAbout={onShowAbout}
        onTogglePlayback={togglePlayback}
      />
    </main>
  )
}
