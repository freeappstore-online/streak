// Tiny hash-based router. URLs are #today, #history, #habits, #buddies, #room.
// No deps. Survives reload, shareable, no server config.

import { useEffect, useState } from 'react'
import type { Screen } from '../types'

const VALID: Screen[] = ['today', 'history', 'habits', 'buddies', 'room']

function readHash(): Screen {
  const raw = window.location.hash.replace(/^#/, '')
  return (VALID as string[]).includes(raw) ? (raw as Screen) : 'today'
}

export function useHashRoute(): [Screen, (s: Screen) => void] {
  const [screen, setScreen] = useState<Screen>(() => (typeof window === 'undefined' ? 'today' : readHash()))

  useEffect(() => {
    const onChange = () => setScreen(readHash())
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])

  const navigate = (s: Screen) => {
    window.location.hash = s
  }

  return [screen, navigate]
}
