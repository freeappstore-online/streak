// History: full 53-week grid per habit, plus current-streak summary.

import { todayInTz } from '../lib/dates'
import { bestStreak, currentStreak } from '../lib/streak'
import { useGrid } from '../lib/use-grid'
import { Grid } from '../components/Grid'
import type { Config } from '../types'

interface HistoryProps {
  config: Config
}

export function History({ config }: HistoryProps) {
  const today = todayInTz(config.tz)
  const { grid } = useGrid(config.gridDocId)

  return (
    <div className="flex flex-col gap-6 px-2 pt-4 lg:pt-0">
      <header>
        <p className="text-[0.7rem] font-bold uppercase tracking-[0.18em] text-[var(--muted)]">
          Last 53 weeks · {config.tz}
        </p>
        <h1 className="display-font mt-2 text-4xl font-bold text-[var(--ink)] lg:text-5xl">History</h1>
      </header>

      {config.habits.length === 0 ? (
        <p className="text-[var(--muted)]">No habits yet. Add some in Habits.</p>
      ) : (
        <ul className="flex flex-col gap-6">
          {config.habits.map((h) => {
            const checks = grid.checks[h.id] ?? {}
            const cur = currentStreak(grid.checks, h.id, today)
            const best = bestStreak(grid.checks, h.id)
            return (
              <li key={h.id} className="flex flex-col gap-3 rounded-2xl border p-5"
                style={{ borderColor: 'var(--line)', background: 'var(--panel)' }}>
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <span className="flex items-center gap-3">
                    <span className="text-2xl" aria-hidden>{h.emoji}</span>
                    <span className="font-bold text-[var(--ink)]">{h.name}</span>
                  </span>
                  <span className="text-[0.85rem] text-[var(--muted)]">
                    Current <strong style={{ color: 'var(--ink)' }}>{cur}d</strong> · Best <strong style={{ color: 'var(--ink)' }}>{best}d</strong>
                  </span>
                </div>
                <Grid checks={checks} today={today} />
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
