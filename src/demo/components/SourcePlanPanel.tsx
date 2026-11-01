import type { ChangeEventHandler } from 'react'
import { PlaybackIcon } from '../../components/PlaybackIcon'
import { LANGUAGE_CONFIG, MAX_SCRIPT_CHARS } from '../domain/motionLibrary'
import type {
  LanguageConfig,
  LanguageMode,
  PlaybackMode,
  WordMotion,
} from '../domain/motionLibrary'
import { itemDuration } from '../domain/motionPlanner'
import type { MotionPlan } from '../domain/motionPlanner'

type SourcePlanPanelProps = {
  config: LanguageConfig
  currentSign?: WordMotion
  currentWord: string
  currentWordIndex: number
  currentWordLetterIndex: number
  cursor: number
  language: LanguageMode
  plan: MotionPlan
  playbackMode: PlaybackMode
  playing: boolean
  script: string
  onChangeLanguage(language: LanguageMode): void
  onChangePlaybackMode(mode: PlaybackMode): void
  onGenerate(): void
  onLoadWordDemo(): void
  onScriptChange(value: string): void
  onSelectWord(index: number): void
  onTogglePlayback(): void
  onUpload: ChangeEventHandler<HTMLInputElement>
}

export function SourcePlanPanel({
  config,
  currentSign,
  currentWord,
  currentWordIndex,
  currentWordLetterIndex,
  cursor,
  language,
  plan,
  playbackMode,
  playing,
  script,
  onChangeLanguage,
  onChangePlaybackMode,
  onGenerate,
  onLoadWordDemo,
  onScriptChange,
  onSelectWord,
  onTogglePlayback,
  onUpload,
}: SourcePlanPanelProps) {
  const wordCoverage = plan.words.length
    ? Math.round((plan.signedWords.length / plan.words.length) * 100)
    : 0
  const progress = plan.sequence.length > 1 ? (cursor / (plan.sequence.length - 1)) * 100 : 0
  const seconds = Math.max(
    1,
    Math.ceil(plan.sequence.reduce((total, item) => total + itemDuration(item), 0) / 1000),
  )
  const playbackLabel = playing ? 'PAUSE' : cursor >= plan.sequence.length - 1 ? 'REPLAY' : 'PLAY'

  return (
    <>
      <header className="brand-block">
        <div className="eyebrow">ORCA HAND</div>
        <h1>
          ROBOTIC SIGN
          <br />
          <span>MOTION LAB</span>
        </h1>
        <p className="caveat">
          Independent educational prototype using ORCA's open model. German → DSGS and English → ASL
          follow separate verification tracks; neither is word-for-word translation.
        </p>
      </header>

      <div className="language-block">
        <div className="section-label">
          <span>00</span> SOURCE → TARGET SIGN LANGUAGE
        </div>
        <div className="language-switch" role="group" aria-label="Source and target sign language">
          {(Object.keys(LANGUAGE_CONFIG) as LanguageMode[]).map((key) => (
            <button
              aria-pressed={language === key}
              className={language === key ? 'is-active' : ''}
              key={key}
              type="button"
              onClick={() => onChangeLanguage(key)}
            >
              <b>{LANGUAGE_CONFIG[key].routeLabel}</b>
              <small>{key === 'dsgs' ? 'ZURICH' : 'USA'}</small>
            </button>
          ))}
        </div>
        <div className="language-detail">
          <strong>{config.name}</strong>
          <span>{config.region}</span>
        </div>
        <div className="playback-mode-switch" role="group" aria-label="Motion planning mode">
          <button
            aria-pressed={playbackMode === 'words'}
            className={playbackMode === 'words' ? 'is-active' : ''}
            type="button"
            onClick={() => onChangePlaybackMode('words')}
          >
            <b>WORDS + FALLBACK</b>
            <small>DUAL-HAND CUES</small>
          </button>
          <button
            aria-pressed={playbackMode === 'letters'}
            className={playbackMode === 'letters' ? 'is-active' : ''}
            type="button"
            onClick={() => onChangePlaybackMode('letters')}
          >
            <b>LETTERS ONLY</b>
            <small>FINGERSPELLING</small>
          </button>
        </div>
        <button className="demo-button" type="button" onClick={onLoadWordDemo}>
          LOAD {config.code} WORD DEMO
        </button>
      </div>

      <div className="input-block">
        <div className="section-label">
          <span>01</span> SOURCE TEXT
        </div>
        <textarea
          aria-label="Source text for motion plan"
          maxLength={MAX_SCRIPT_CHARS}
          value={script}
          onChange={(event) => onScriptChange(event.target.value)}
        />
        <div className="input-actions">
          <label className="upload-button" htmlFor="script-upload">
            UPLOAD .TXT
          </label>
          <input id="script-upload" type="file" accept=".txt,text/plain" onChange={onUpload} />
          <span>
            {script.length}/{MAX_SCRIPT_CHARS}
          </span>
        </div>
        <button className="generate-button" type="button" onClick={onGenerate}>
          GENERATE MOTION PLAN
        </button>
      </div>

      <div className="plan-block">
        <div className="section-label">
          <span>02</span> MOTION PLAN
        </div>
        <div className="current-word">
          <span>
            WORD {Math.min(currentWordIndex + 1, plan.words.length || 1)} / {plan.words.length || 1}
          </span>
          <strong className={currentSign ? 'is-sign-cue' : ''}>
            {Array.from(currentWord).map((letter, index) => (
              <i
                className={index === currentWordLetterIndex ? 'is-current' : ''}
                key={`${letter}-${index}`}
              >
                {letter}
              </i>
            ))}
          </strong>
        </div>
        <div className="word-rail">
          {plan.words.map((word, index) => (
            <button
              aria-pressed={index === currentWordIndex}
              className={`${index === currentWordIndex ? 'is-active' : ''} ${playbackMode === 'words' && plan.signedWords.includes(word) ? 'is-word-sign' : ''}`}
              key={`${word}-${index}`}
              type="button"
              onClick={() => onSelectWord(index)}
            >
              {word}
            </button>
          ))}
        </div>
        <p className="unsupported">
          {playbackMode === 'words'
            ? `${plan.translationNote ? `${plan.translationNote} · ` : ''}${plan.signedWords.length} word cue${plan.signedWords.length === 1 ? '' : 's'} · ${plan.fallbackWords.length} word${plan.fallbackWords.length === 1 ? '' : 's'} fingerspelled · ${wordCoverage}% word coverage`
            : plan.substitutions.length
              ? `Alphabet fallback: ${plan.substitutions.join(' · ')}`
              : plan.unsupported.length
                ? `Ignored punctuation: ${plan.unsupported.join(' ')}`
                : 'A–Z mechanical handshapes · spacing preserved'}
        </p>
        <p className="cue-note">
          {playbackMode === 'words'
            ? 'LEXICON-FIRST · SOURCE-CHECKED WORD CUES · UNKNOWN WORDS FALL BACK TO LETTERS'
            : config.coverage.toUpperCase()}
        </p>
      </div>

      <div className="playback-block">
        <div className="section-label">
          <span>03</span> PLAYBACK
        </div>
        <button
          className="play-button"
          type="button"
          disabled={!plan.sequence.length}
          onClick={onTogglePlayback}
        >
          {playbackLabel}{' '}
          <b>
            <PlaybackIcon playing={playing} />
          </b>
        </button>
        <div className="progress-track">
          <span style={{ width: `${progress}%` }} />
        </div>
        <div className="progress-meta">
          <span>{Math.round(progress)}%</span>
          <span>
            ~{seconds}s ·{' '}
            {playbackMode === 'words' ? 'cue-aware + fallback timing' : 'manual-alphabet timing'}
          </span>
        </div>
      </div>
    </>
  )
}
