import { Grid, OrbitControls } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { useCallback, useState } from 'react'
import { CameraFramer } from '../../demo/components/CameraFramer'
import { HandModel } from '../../demo/components/HandModel'
import type { CameraView } from '../../demo/domain/motionLibrary'
import type { SignPackV1 } from '../domain/signPack'
import type { SignPackEditorState } from '../domain/signPackEditor'

type SignPackPreviewProps = {
  editor: SignPackEditorState
  pack: SignPackV1
  playing: boolean
  onPreview(): void
}

export function SignPackPreview({ editor, pack, playing, onPreview }: SignPackPreviewProps) {
  const [readyHands, setReadyHands] = useState(0)
  const [cameraView, setCameraView] = useState<CameraView>('recipient')
  const modelReady = useCallback(() => setReadyHands((count) => Math.min(2, count + 1)), [])

  return (
    <section className="studio-preview" aria-label="ORCA Sign Pack preview">
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
        <OrbitControls makeDefault enablePan={false} enableRotate enableZoom={false} />
        <CameraFramer
          frameKey={`${editor.hands}-${cameraView}-${pack.updatedAt}`}
          ready={readyHands >= (editor.hands === 'two' ? 2 : 1)}
          twoHands={editor.hands === 'two'}
        />
        {editor.hands === 'two' ? (
          <HandModel
            poseKey={editor.supportPoses[0]}
            motion={pack.motion.left}
            motionDurationMs={editor.durationMs}
            onReady={modelReady}
            side="left"
            twoHands
            facing={cameraView}
            language={editor.language}
            motionKey={`studio-left-${pack.updatedAt}`}
            playing={playing}
          />
        ) : null}
        <HandModel
          poseKey={editor.dominantPoses[0]}
          motion={pack.motion.right}
          motionDurationMs={editor.durationMs}
          onReady={modelReady}
          side="right"
          twoHands={editor.hands === 'two'}
          facing={cameraView}
          language={editor.language}
          motionKey={`studio-right-${pack.updatedAt}`}
          playing={playing}
        />
      </Canvas>
      <div className="studio-preview-shade" aria-hidden="true" />
      <div className="studio-preview-header">
        <span>
          <i className={readyHands >= (editor.hands === 'two' ? 2 : 1) ? 'is-ready' : ''} />
          ORCA MODEL {readyHands ? 'READY' : 'LOADING'}
        </span>
        <span>{editor.language.toUpperCase()} DRAFT · LOCAL PROCESSING</span>
      </div>
      <div className="studio-view-switch" role="group" aria-label="Preview angle">
        {(
          [
            ['recipient', 'PALM'],
            ['side', 'ANGLE'],
            ['rear', 'BACK'],
          ] as [CameraView, string][]
        ).map(([view, label]) => (
          <button
            aria-pressed={cameraView === view}
            className={cameraView === view ? 'is-active' : ''}
            key={view}
            type="button"
            onClick={() => setCameraView(view)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="studio-preview-status">
        <small>UNREVIEWED SIGN PACK</small>
        <strong>{pack.gloss || 'UNTITLED'}</strong>
        <span>
          {editor.hands.toUpperCase()} HAND · {editor.preset.toUpperCase()} ·{' '}
          {(editor.durationMs / 1000).toFixed(1)}S
        </span>
      </div>
      <button className="studio-preview-play" type="button" onClick={onPreview}>
        {playing ? 'PLAYING MOTION' : '▶ PREVIEW MOTION'}
        <span>{editor.dominantPoses.join(' → ')}</span>
      </button>
      <div className="studio-preview-footer">
        <span>ACTUAL ORCA UI MODEL · DRAG TO INSPECT ANGLE</span>
        <b>NOT SIGNER VERIFIED</b>
      </div>
    </section>
  )
}
