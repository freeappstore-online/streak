import type { ReactNode } from 'react'
import { getFas } from '../lib/fas'
import type { Screen } from '../types'
import type { User } from '@freeappstore/sdk'

interface ShellProps {
  children: ReactNode
  route: Screen
  onNavigate: (s: Screen) => void
  user?: User
}

const NAV: Array<{ id: Screen; label: string; icon: string }> = [
  { id: 'today', label: 'Today', icon: '○' },
  { id: 'history', label: 'History', icon: '▦' },
  { id: 'habits', label: 'Habits', icon: '✦' },
  { id: 'buddies', label: 'Buddies', icon: '◆' },
  { id: 'room', label: 'Room', icon: '◉' },
]

/**
 * Standalone-app layout shell. Sidebar on desktop, bottom dock on mobile.
 *
 * No router — single-page apps don't need one. If you add routes later,
 * either pull react-router-dom yourself or copy the connected template's
 * Shell with NavLink wiring.
 */
export function Shell({ children, route, onNavigate, user }: ShellProps) {
  return (
    <div className="relative min-h-[100dvh]">
      <div className="mx-auto max-w-[1540px] px-2 pt-1 sm:px-4 lg:px-8 lg:py-8">
        <div className="min-h-[100dvh] pb-20 lg:grid lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-7 lg:pb-0">
          {/* Desktop sidebar */}
          <aside className="hidden lg:flex lg:min-h-[calc(100dvh-4rem)] lg:flex-col lg:gap-5 lg:rounded-[2rem] lg:border lg:border-[var(--line)] lg:bg-[var(--glass-strong)] lg:p-6 lg:shadow-[var(--shadow-soft)] lg:backdrop-blur-xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--line-strong)] bg-[var(--glass)] px-3 py-1 text-[0.65rem] font-bold uppercase tracking-[0.22em] text-[var(--accent-deep)]">
              streak
            </div>

            {user && (
              <nav className="flex flex-col gap-1">
                {NAV.map((n) => {
                  const active = n.id === route
                  return (
                    <button
                      type="button"
                      key={n.id}
                      onClick={() => onNavigate(n.id)}
                      className="flex items-center gap-3 rounded-xl px-3 py-2 text-left font-bold transition"
                      style={{
                        background: active ? 'var(--accent-soft)' : 'transparent',
                        color: active ? 'var(--accent-deep)' : 'var(--ink)',
                      }}
                    >
                      <span aria-hidden className="w-4 text-center">{n.icon}</span>
                      <span>{n.label}</span>
                    </button>
                  )
                })}
              </nav>
            )}

            <div className="mt-auto flex flex-col gap-3 text-[0.65rem] text-[var(--muted)]">
              {user && (
                <div className="flex items-center gap-2">
                  {user.avatarUrl && (
                    <img src={user.avatarUrl} alt="" width={24} height={24} className="rounded-full" />
                  )}
                  <span className="font-bold text-[var(--ink)]">@{user.login}</span>
                  <button
                    type="button"
                    onClick={() => getFas().auth.signOut()}
                    className="ml-auto underline hover:text-[var(--ink)]"
                  >
                    Sign out
                  </button>
                </div>
              )}
              Part of{' '}
              <a
                href="https://freeappstore.online"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-[var(--ink)]"
              >
                FreeAppStore
              </a>
            </div>
          </aside>

          {/* Main content */}
          <main className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</main>
        </div>
      </div>

      {/* Mobile dock */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--line)] bg-[var(--dock)]/92 px-2 pb-[calc(env(safe-area-inset-bottom)+0.25rem)] pt-1 backdrop-blur-2xl lg:hidden">
        {user ? (
          <div className="mx-auto grid max-w-md grid-cols-5">
            {NAV.map((n) => {
              const active = n.id === route
              return (
                <button
                  type="button"
                  key={n.id}
                  onClick={() => onNavigate(n.id)}
                  className="flex flex-col items-center gap-0.5 py-2 text-[0.65rem] font-bold uppercase tracking-[0.06em]"
                  style={{
                    color: active ? 'var(--accent-deep)' : 'var(--muted)',
                  }}
                >
                  <span aria-hidden>{n.icon}</span>
                  <span>{n.label}</span>
                </button>
              )
            })}
          </div>
        ) : (
          <div className="mx-auto grid max-w-xs grid-cols-1 py-2">
            <a
              href="https://freeappstore.online"
              target="_blank"
              rel="noopener noreferrer"
              className="text-center text-[0.65rem] font-bold uppercase tracking-[0.14em] text-[var(--muted)]"
            >
              Part of FreeAppStore
            </a>
          </div>
        )}
      </nav>
    </div>
  )
}
