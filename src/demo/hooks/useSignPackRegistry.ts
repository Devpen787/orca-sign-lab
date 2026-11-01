import { useEffect, useState } from 'react'
import type { PlannerExtensions } from '../domain/motionPlanner'

export function useSignPackRegistry() {
  const [plannerExtensions, setPlannerExtensions] = useState<PlannerExtensions>()
  const [packCount, setPackCount] = useState(0)

  useEffect(() => {
    let active = true

    async function loadRegistry() {
      const [{ compileSignPacks, loadApprovedSignPacks }, { listLocalSignPacks }] =
        await Promise.all([
          import('../../signpacks/domain/signPack'),
          import('../../signpacks/storage/signPackStore'),
        ])
      const [approved, local] = await Promise.all([
        loadApprovedSignPacks(),
        listLocalSignPacks().catch(() => []),
      ])
      if (!active) return
      const packs = [...approved, ...local]
      setPlannerExtensions(compileSignPacks(packs))
      setPackCount(packs.length)
    }

    void loadRegistry().catch(() => {
      if (!active) return
      setPlannerExtensions(undefined)
      setPackCount(0)
    })

    return () => {
      active = false
    }
  }, [])

  return { plannerExtensions, packCount }
}
