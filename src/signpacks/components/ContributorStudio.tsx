import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { LANGUAGE_CONFIG } from '../../demo/domain/motionLibrary'
import type { LanguageMode } from '../../demo/domain/motionLibrary'
import {
  parseSignPack,
  serializeSignPack,
  SIGN_PACK_FILE_EXTENSION,
  slugForSignPack,
  validateSignPack,
} from '../domain/signPack'
import type { SignPackLicense, SignPackV1 } from '../domain/signPack'
import {
  editorToSignPack,
  INITIAL_SIGN_PACK_EDITOR,
  signPackToEditor,
} from '../domain/signPackEditor'
import type { SignPackEditorState } from '../domain/signPackEditor'
import {
  deleteLocalSignPack,
  listLocalSignPacks,
  saveLocalSignPack,
} from '../storage/signPackStore'
import { SignPackPreview } from './SignPackPreview'
import { SignPackMotionEditor } from './SignPackMotionEditor'
import './studio.css'

export function ContributorStudio({
  onOpenLab,
  onShowAbout,
}: {
  onOpenLab(): void
  onShowAbout(): void
}) {
  const [editor, setEditor] = useState<SignPackEditorState>(INITIAL_SIGN_PACK_EDITOR)
  const [drafts, setDrafts] = useState<SignPackV1[]>([])
  const [playing, setPlaying] = useState(false)
  const [notice, setNotice] = useState('DRAFTS STAY IN THIS BROWSER UNTIL YOU EXPORT THEM')
  const [error, setError] = useState('')
  const fileInput = useRef<HTMLInputElement>(null)
  const pack = useMemo(() => editorToSignPack(editor), [editor])
  const validation = useMemo(() => validateSignPack(pack), [pack])
  const currentId = editor.id ?? slugForSignPack(editor.language, editor.gloss)

  const refreshDrafts = useCallback(async () => {
    try {
      setDrafts(await listLocalSignPacks())
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not read local drafts.')
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => void refreshDrafts(), 0)
    return () => window.clearTimeout(timer)
  }, [refreshDrafts])

  useEffect(() => {
    if (!playing) return
    const timer = window.setTimeout(() => setPlaying(false), pack.motion.durationMs + 120)
    return () => window.clearTimeout(timer)
  }, [pack.motion.durationMs, playing])

  const setField = <Key extends keyof SignPackEditorState>(
    key: Key,
    value: SignPackEditorState[Key],
  ) => {
    setEditor((current) => ({ ...current, [key]: value }))
    setError('')
  }

  const updatePose = (side: 'dominantPoses' | 'supportPoses', index: number, value: string) => {
    setEditor((current) => {
      const next = [...current[side]] as [string, string, string]
      next[index] = value
      return { ...current, [side]: next }
    })
    setPlaying(false)
  }

  const preview = () => {
    setPlaying(false)
    window.requestAnimationFrame(() => setPlaying(true))
    setNotice('PREVIEWING MECHANICAL CUE · NOT A LINGUISTIC PASS')
  }

  const ensureValid = () => {
    if (validation.valid) return true
    setError(validation.errors.join(' '))
    return false
  }

  const save = async () => {
    if (!ensureValid()) return
    try {
      await saveLocalSignPack(pack)
      setEditor((current) => ({ ...current, id: pack.id, createdAt: pack.createdAt }))
      await refreshDrafts()
      setNotice('SAVED PRIVATELY IN THIS BROWSER · NOTHING WAS UPLOADED')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not save the local draft.')
    }
  }

  const download = () => {
    if (!ensureValid()) return
    const blob = new Blob([serializeSignPack(pack)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${pack.id}${SIGN_PACK_FILE_EXTENSION}`
    link.click()
    URL.revokeObjectURL(url)
    setNotice(`EXPORTED ${link.download.toUpperCase()} · REVIEW BEFORE SHARING`)
  }

  const importPack = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      const imported = parseSignPack(await file.text())
      const localDraft: SignPackV1 = {
        ...imported,
        trust: 'personal-draft',
        updatedAt: new Date().toISOString(),
      }
      await saveLocalSignPack(localDraft)
      setEditor(signPackToEditor(localDraft))
      await refreshDrafts()
      setNotice(`IMPORTED ${localDraft.id.toUpperCase()} AS A PRIVATE, UNREVIEWED DRAFT`)
      setError('')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not import the Sign Pack.')
    }
  }

  const prepareContribution = async () => {
    if (!ensureValid()) return
    try {
      await navigator.clipboard.writeText(serializeSignPack(pack))
      setNotice('PACK JSON COPIED · REVIEW CONTRIBUTING.md BEFORE SHARING · NOTHING WAS UPLOADED')
    } catch {
      setError('Clipboard access was blocked. Export the Sign Pack, then read CONTRIBUTING.md.')
    }
  }

  const removeDraft = async (id: string) => {
    await deleteLocalSignPack(id)
    await refreshDrafts()
    if (currentId === id) setEditor(INITIAL_SIGN_PACK_EDITOR)
    setNotice('LOCAL DRAFT REMOVED FROM THIS BROWSER')
  }

  return (
    <main className="studio-shell">
      <header className="studio-topbar">
        <button type="button" onClick={onOpenLab}>
          ← MOTION LAB
        </button>
        <div>
          <span>ORCA HAND</span>
          <strong>SIGN PACK CONTRIBUTOR STUDIO</strong>
        </div>
        <div className="studio-top-actions">
          <button type="button" onClick={onShowAbout}>
            ABOUT + SOURCES
          </button>
          <span>LOCAL-FIRST · V1</span>
        </div>
      </header>

      <section className="studio-metadata" aria-label="Sign Pack metadata and drafts">
        <div className="studio-section-heading">
          <span>00</span>
          <b>PACK METADATA</b>
        </div>
        <p>
          Build a private mechanical cue, attach source evidence, then choose if it should leave
          your browser.
        </p>
        <div className="studio-language-switch" role="group" aria-label="Sign language">
          {(['asl', 'dsgs'] as LanguageMode[]).map((language) => (
            <button
              aria-pressed={editor.language === language}
              className={editor.language === language ? 'is-active' : ''}
              key={language}
              type="button"
              onClick={() => {
                setEditor((current) => ({
                  ...current,
                  language,
                  region: language === 'asl' ? 'United States' : 'German-speaking Switzerland',
                  id: undefined,
                }))
              }}
            >
              {LANGUAGE_CONFIG[language].code}
              <small>{language === 'asl' ? 'ENGLISH SOURCE' : 'GERMAN SOURCE'}</small>
            </button>
          ))}
        </div>
        <label>
          <span>REGION</span>
          <input
            value={editor.region}
            onChange={(event) => setField('region', event.target.value)}
          />
        </label>
        <label>
          <span>SOURCE PHRASE(S)</span>
          <textarea
            value={editor.sourcePhrases}
            onChange={(event) => setField('sourcePhrases', event.target.value)}
            placeholder="One phrase per line"
          />
        </label>
        <label>
          <span>GLOSS</span>
          <input
            value={editor.gloss}
            onChange={(event) => setField('gloss', event.target.value.toUpperCase())}
            placeholder="HELLO"
          />
        </label>
        <label>
          <span>REFERENCE URL(S)</span>
          <textarea
            value={editor.referenceUrls}
            onChange={(event) => setField('referenceUrls', event.target.value)}
            placeholder="One HTTPS URL per line"
          />
        </label>
        <label>
          <span>LICENSE</span>
          <select
            value={editor.license}
            onChange={(event) => setField('license', event.target.value as SignPackLicense)}
          >
            <option>CC-BY-4.0</option>
            <option>CC0-1.0</option>
            <option>MIT</option>
            <option>OTHER</option>
          </select>
        </label>
        <div className="studio-trust">
          <span>TRUST STATUS</span>
          <strong>PERSONAL / UNREVIEWED</strong>
          <small>Cannot be promoted inside this browser.</small>
        </div>

        <div className="studio-section-heading studio-drafts-heading">
          <span>01</span>
          <b>PRIVATE DRAFTS</b>
        </div>
        <div className="studio-import-row">
          <button type="button" onClick={() => fileInput.current?.click()}>
            IMPORT PACK
          </button>
          <input
            aria-label="Import Sign Pack JSON"
            ref={fileInput}
            type="file"
            accept={SIGN_PACK_FILE_EXTENSION + ',application/json'}
            onChange={importPack}
          />
          <span>{drafts.length} LOCAL</span>
        </div>
        <div className="studio-draft-list">
          {drafts.length === 0 ? (
            <p>NO LOCAL DRAFTS YET</p>
          ) : (
            drafts.map((draft) => (
              <div className={draft.id === currentId ? 'is-selected' : ''} key={draft.id}>
                <button type="button" onClick={() => setEditor(signPackToEditor(draft))}>
                  <b>{draft.gloss}</b>
                  <span>
                    {draft.language.toUpperCase()} ·{' '}
                    {new Date(draft.updatedAt).toLocaleDateString()}
                  </span>
                </button>
                <button
                  aria-label={`Delete ${draft.gloss} local draft`}
                  className="studio-delete"
                  type="button"
                  onClick={() => void removeDraft(draft.id)}
                >
                  ×
                </button>
              </div>
            ))
          )}
        </div>
      </section>

      <SignPackPreview editor={editor} pack={pack} playing={playing} onPreview={preview} />

      <SignPackMotionEditor
        editor={editor}
        error={error}
        notice={notice}
        validation={validation}
        onDownload={download}
        onDurationChange={(value) => setField('durationMs', value)}
        onHandsChange={(value) => setField('hands', value)}
        onPrepareContribution={() => void prepareContribution()}
        onPresetChange={(value) => setField('preset', value)}
        onPreview={preview}
        onSave={() => void save()}
        onUpdatePose={updatePose}
      />
    </main>
  )
}
