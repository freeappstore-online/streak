// Hook: your own grid doc — load once, then mutate via recordCheck (read-modify-write).
// Optimistically updates local state so the UI animates immediately.

import { useCallback, useEffect, useState } from 'react'
import { getFas } from './fas'
import { applyCheck, type CollectionLike, type GridDoc, recordCheck } from './grid-doc'

export function useGrid(gridDocId: string | null): {
  grid: GridDoc
  ready: boolean
  check: (habitId: string, date: string) => Promise<void>
} {
  const [grid, setGrid] = useState<GridDoc>({ checks: {} })
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!gridDocId) return
    let cancelled = false
    ;(async () => {
      const grids = getFas().db.collection('grids') as unknown as CollectionLike<GridDoc>
      const doc = await grids.get(gridDocId)
      if (cancelled) return
      setGrid({ checks: doc?.checks ?? {} })
      setReady(true)
    })()
    return () => {
      cancelled = true
    }
  }, [gridDocId])

  const check = useCallback(
    async (habitId: string, date: string) => {
      if (!gridDocId) return
      // Optimistic — animate now, sync second. Server is authoritative on conflict.
      setGrid((prev) => ({ checks: applyCheck(prev.checks, habitId, date) }))
      const grids = getFas().db.collection('grids') as unknown as CollectionLike<GridDoc>
      await recordCheck(grids, gridDocId, habitId, date)
    },
    [gridDocId],
  )

  return { grid, ready, check }
}
