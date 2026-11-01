import { useEffect, useState } from 'react'
import type { HandMode } from '../domain/motionLibrary'
import { itemDuration } from '../domain/motionPlanner'
import type { MotionPlan } from '../domain/motionPlanner'

export function usePlaybackController(plan: MotionPlan) {
  const [cursor, setCursor] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [handMode, setHandMode] = useState<HandMode>('two')
  const [rightManualPose, setRightManualPose] = useState<string | null>(null)
  const [leftManualPose, setLeftManualPose] = useState<string | null>(null)
  const current = plan.sequence[cursor]
  const currentSign = current?.kind === 'sign' ? current.motion : undefined
  const requiresTwoHandRig = currentSign?.hands === 'two'

  useEffect(() => {
    if (!playing || !plan.sequence.length) return
    const timer = window.setTimeout(() => {
      setRightManualPose(null)
      setLeftManualPose(null)
      if (cursor >= plan.sequence.length - 1) setPlaying(false)
      else setCursor((value) => value + 1)
    }, itemDuration(plan.sequence[cursor]))
    return () => window.clearTimeout(timer)
  }, [cursor, plan.sequence, playing])

  const reset = () => {
    setCursor(0)
    setRightManualPose(null)
    setLeftManualPose(null)
    setPlaying(false)
  }

  const toggle = () => {
    setRightManualPose(null)
    setLeftManualPose(null)
    if (!playing && cursor >= plan.sequence.length - 1) {
      setCursor(0)
      setPlaying(true)
      return
    }
    setPlaying((value) => !value)
  }

  const selectWord = (wordIndex: number) => {
    const next = plan.sequence.findIndex((item) => item.wordIndex === wordIndex)
    if (next >= 0) setCursor(next)
    setPlaying(false)
    setRightManualPose(null)
    setLeftManualPose(null)
  }

  const changeHandMode = (nextMode: HandMode) => {
    if (nextMode === 'one' && requiresTwoHandRig) return
    setPlaying(false)
    setRightManualPose(null)
    setLeftManualPose(null)
    setHandMode(nextMode)
  }

  return {
    cursor,
    current,
    currentSign,
    playing,
    handMode: requiresTwoHandRig ? 'two' : handMode,
    rightManualPose,
    leftManualPose,
    requiresTwoHandRig,
    setHandMode,
    setRightManualPose,
    setLeftManualPose,
    setPlaying,
    reset,
    toggle,
    selectWord,
    changeHandMode,
  }
}
