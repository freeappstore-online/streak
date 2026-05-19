// React hook: read + write the private kv.config blob. Provides optimistic
// updates so screens don't have to wait for the round-trip.

import { useCallback, useEffect, useState } from 'react'
import { getFas, detectTz } from './fas'
import { EMPTY_CONFIG, type Config } from '../types'

const KV_KEY = 'config'

type Status = 'loading' | 'ready' | 'error'

export function useConfig(userId: string | null): {
  config: Config
  status: Status
  setConfig: (next: Config | ((prev: Config) => Config)) => Promise<void>
} {
  const [config, setLocal] = useState<Config>(EMPTY_CONFIG)
  const [status, setStatus] = useState<Status>('loading')

  useEffect(() => {
    if (!userId) {
      setLocal(EMPTY_CONFIG)
      setStatus('loading')
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const stored = await getFas().kv.get<Config>(KV_KEY)
        if (cancelled) return
        if (stored) {
          // Forward-compat: merge missing fields onto the loaded blob so old
          // configs don't blow up after a schema add.
          setLocal({ ...EMPTY_CONFIG, ...stored, tz: stored.tz || detectTz() })
        } else {
          const seeded: Config = { ...EMPTY_CONFIG, tz: detectTz() }
          await getFas().kv.set(KV_KEY, seeded)
          setLocal(seeded)
        }
        setStatus('ready')
      } catch (err) {
        if (cancelled) return
        console.error('useConfig load failed:', err)
        setStatus('error')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [userId])

  const setConfig = useCallback(
    async (next: Config | ((prev: Config) => Config)) => {
      // Compute next from latest local state. We accept the v1 single-device assumption
      // for kv.config — habit edits aren't realistically concurrent across devices.
      let computed: Config
      setLocal((prev) => {
        computed = typeof next === 'function' ? (next as (p: Config) => Config)(prev) : next
        return computed
      })
      // setLocal is sync; computed is assigned synchronously inside the updater.
      await getFas().kv.set(KV_KEY, computed!)
    },
    [],
  )

  return { config, status, setConfig }
}
