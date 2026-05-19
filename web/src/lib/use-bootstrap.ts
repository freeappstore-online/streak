// Hook: ensure the user has a profile + grid doc, cache their ids into kv.config.
// Runs once after first sign-in or whenever the cached ids drift.

import { useEffect, useState } from 'react'
import { avatarUrlFor, getFas } from './fas'
import { findOrCreateGridDoc, findOrCreateProfileDoc, type CollectionLike, type GridDoc, type ProfileDoc } from './grid-doc'
import type { Config } from '../types'

export function useBootstrap(
  userId: string | null,
  login: string | null,
  config: Config,
  setConfig: (next: Config | ((prev: Config) => Config)) => Promise<void>,
  status: 'loading' | 'ready' | 'error',
): { booted: boolean; error: string | null } {
  const [booted, setBooted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (status !== 'ready' || !userId || !login) return
    if (booted) return
    let cancelled = false
    ;(async () => {
      try {
        const fas = getFas()
        const grids = fas.db.collection('grids') as unknown as CollectionLike<GridDoc>
        const profiles = fas.db.collection('profiles') as unknown as CollectionLike<ProfileDoc>

        let gridDocId = config.gridDocId
        if (!gridDocId) {
          const { id } = await findOrCreateGridDoc(grids, userId)
          gridDocId = id
        }

        let profileDocId = config.profileDocId
        const avatarUrl = avatarUrlFor(login)
        if (!profileDocId) {
          const { id } = await findOrCreateProfileDoc(profiles, userId, login, gridDocId, avatarUrl)
          profileDocId = id
        }

        if (cancelled) return
        if (gridDocId !== config.gridDocId || profileDocId !== config.profileDocId) {
          await setConfig((prev) => ({ ...prev, gridDocId, profileDocId }))
        }
        setBooted(true)
      } catch (err) {
        if (cancelled) return
        console.error('bootstrap failed:', err)
        setError(err instanceof Error ? err.message : String(err))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [status, userId, login, config.gridDocId, config.profileDocId, booted, setConfig])

  return { booted, error }
}
