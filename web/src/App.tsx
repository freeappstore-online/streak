import { useEffect, useState } from 'react'
import { Shell } from './components/Shell'
import { getFas } from './lib/fas'
import { useBootstrap } from './lib/use-bootstrap'
import { useConfig } from './lib/use-config'
import { useHashRoute } from './lib/use-hash-route'
import { Today } from './screens/Today'
import { History } from './screens/History'
import { Habits } from './screens/Habits'
import { Buddies } from './screens/Buddies'
import { Room } from './screens/Room'
import type { User } from '@freeappstore/sdk'

export default function App() {
  const [user, setUser] = useState<User | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [route, navigate] = useHashRoute()

  useEffect(() => {
    const fas = getFas()
    // Capture OAuth callback (if returning from GitHub), then subscribe.
    void fas.auth.init().then(() => setAuthReady(true))
    const off = fas.auth.onChange((u) => setUser(u))
    return off
  }, [])

  const { config, status, setConfig } = useConfig(user?.id ?? null)
  const { booted, error } = useBootstrap(user?.id ?? null, user?.login ?? null, config, setConfig, status)

  if (!authReady) {
    return (
      <Shell route={route} onNavigate={navigate}>
        <div className="grid flex-1 place-items-center text-[var(--muted)]">…</div>
      </Shell>
    )
  }

  if (!user) {
    return (
      <Shell route={route} onNavigate={navigate}>
        <SignIn />
      </Shell>
    )
  }

  if (status === 'loading' || !booted) {
    return (
      <Shell route={route} onNavigate={navigate}>
        <div className="grid flex-1 place-items-center text-[var(--muted)]">
          {error ?? 'Loading your streak…'}
        </div>
      </Shell>
    )
  }

  return (
    <Shell route={route} onNavigate={navigate} user={user}>
      {route === 'today' && <Today config={config} userId={user.id} login={user.login} />}
      {route === 'history' && <History config={config} />}
      {route === 'habits' && <Habits config={config} setConfig={setConfig} />}
      {route === 'buddies' && <Buddies config={config} setConfig={setConfig} />}
      {route === 'room' && <Room config={config} />}
    </Shell>
  )
}

function SignIn() {
  return (
    <div className="grid flex-1 place-items-center px-4 py-12">
      <div className="flex max-w-md flex-col items-center gap-6 text-center">
        <p className="text-[0.7rem] font-bold uppercase tracking-[0.18em] text-[var(--muted)]">
          streak
        </p>
        <h1 className="display-font text-5xl font-bold text-[var(--ink)] lg:text-6xl">
          Daily habits, live with friends.
        </h1>
        <p className="text-[var(--muted)]">
          Pick five habits. Tap to check them off. When your buddies check off theirs, their squares
          light up on your screen in real time.
        </p>
        <button
          type="button"
          onClick={() => getFas().auth.signIn('github')}
          className="rounded-full px-6 py-3 font-bold text-white"
          style={{ background: 'var(--ink)' }}
        >
          Sign in with GitHub
        </button>
        <button
          type="button"
          onClick={() => getFas().auth.signIn('google')}
          className="rounded-full px-6 py-3 font-bold text-white"
          style={{ background: 'var(--ink)' }}
        >
          Sign in with Google
        </button>
        <p className="text-[0.75rem] text-[var(--muted)]">
          Free forever. MIT-licensed. No tracking. Part of{' '}
          <a href="https://freeappstore.online" target="_blank" rel="noopener noreferrer" className="underline">
            FreeAppStore
          </a>
          .
        </p>
      </div>
    </div>
  )
}
