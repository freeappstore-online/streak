// Today: tap a habit to check it off. Reads habits from kv.config, writes checks
// through useGrid.check (which does read-modify-write + broadcasts a room pulse).

import { useEffect, useMemo, useRef } from 'react'
import { getFas } from '../lib/fas'
import { todayInTz } from '../lib/dates'
import { currentStreak } from '../lib/streak'
import { useGrid } from '../lib/use-grid'
import type { Config } from '../types'

interface TodayProps {
  config: Config
  userId: string
  login: string
}

export function Today({ config, userId, login }: TodayProps) {
  const today = todayInTz(config.tz)
  const { grid, check } = useGrid(config.gridDocId)

  // Pulse channel — open exactly once per session. Send-only; we listen on
  // buddies' rooms in the Room screen.
  const roomRef = useRef<ReturnType<typeof getFas>['rooms']['join'] extends (id: string) => infer R ? R : never>(undefined as never)
  useEffect(() => {
    const r = getFas().rooms.join(`streak-pulse-${login}`)
    roomRef.current = r
    return () => r.close()
  }, [login])

  const onCheck = async (habitId: string) => {
    if (grid.checks[habitId]?.[today] === 1) return // already done today
    await check(habitId, today)
    roomRef.current?.send({ habitId, date: today, by: login })
  }

  const hint = useMemo(() => {
    if (config.habits.length === 0) {
      return 'Add your first habit in Habits to start a streak.'
    }
    const allDone = config.habits.every((h) => grid.checks[h.id]?.[today] === 1)
    return allDone ? 'All done today. See you tomorrow.' : `Hi @${login} — what did you do today?`
  }, [config.habits, grid.checks, today, login])

  // userId is intentionally unused in the JSX — kept in the signature because the
  // hook contract for future room-listening additions reads it. Suppress noise:
  void userId

  return (
    <div className="flex flex-col gap-6 px-2 pt-4 lg:pt-0">
      <header>
        <p className="text-[0.7rem] font-bold uppercase tracking-[0.18em] text-[var(--muted)]">
          {today}
        </p>
        <h1 className="display-font mt-2 text-4xl font-bold text-[var(--ink)] lg:text-5xl">Today</h1>
        <p className="mt-2 text-[var(--muted)]">{hint}</p>
      </header>

      <ul className="flex flex-col gap-3">
        {config.habits.map((h) => {
          const done = grid.checks[h.id]?.[today] === 1
          const streak = currentStreak(grid.checks, h.id, today)
          return (
            <li key={h.id}>
              <button
                type="button"
                onClick={() => onCheck(h.id)}
                disabled={done}
                aria-pressed={done}
                className="flex w-full items-center justify-between gap-4 rounded-2xl border px-5 py-4 text-left"
                style={{
                  borderColor: done ? 'var(--accent)' : 'var(--line-strong)',
                  background: done ? 'var(--accent-soft)' : 'var(--panel)',
                  color: 'var(--ink)',
                  cursor: done ? 'default' : 'pointer',
                }}
              >
                <span className="flex items-center gap-3">
                  <span className="text-2xl" aria-hidden>{h.emoji}</span>
                  <span className="font-bold">{h.name}</span>
                </span>
                <span className="flex items-center gap-3 text-[0.85rem] text-[var(--muted)]">
                  {streak > 0 && (
                    <span style={{ color: done ? 'var(--accent-deep)' : 'var(--ink)' }}>
                      {streak}d
                    </span>
                  )}
                  <span
                    aria-hidden
                    className="grid h-7 w-7 place-items-center rounded-full"
                    style={{
                      background: done ? 'var(--accent)' : 'transparent',
                      color: done ? 'white' : 'var(--muted)',
                      border: done ? 'none' : '1px solid var(--line-strong)',
                    }}
                  >
                    {done ? '✓' : '+'}
                  </span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
