// GitHub-style 53-week × 7-day grid for one habit. Sun (row 0) → Sat (row 6).
// Dimmed squares for dates after `today` (so we can show the current week without
// "future days look like missed days").

import { gridWeeks } from '../lib/dates'

interface GridProps {
  checks: Record<string, 1>
  today: string
  weeks?: number
  accent?: string
  size?: 'sm' | 'md'
}

export function Grid({ checks, today, weeks = 53, accent = 'var(--accent)', size = 'md' }: GridProps) {
  const grid = gridWeeks(today, weeks)
  const cellPx = size === 'sm' ? 10 : 14
  const gapPx = 2

  return (
    <div className="overflow-x-auto">
      <div
        className="inline-grid"
        style={{
          gridTemplateRows: `repeat(7, ${cellPx}px)`,
          gridAutoColumns: `${cellPx}px`,
          gridAutoFlow: 'column',
          gap: gapPx,
        }}
      >
        {grid.flatMap((week) =>
          week.map((date) => {
            const filled = checks[date] === 1
            const isFuture = date > today
            return (
              <div
                key={date}
                title={`${date}${filled ? ' ✓' : ''}`}
                style={{
                  width: cellPx,
                  height: cellPx,
                  borderRadius: 2,
                  background: filled
                    ? accent
                    : isFuture
                      ? 'transparent'
                      : 'var(--line-strong)',
                  opacity: isFuture ? 0.3 : 1,
                  transition: 'background-color 240ms ease, transform 240ms ease',
                  border: isFuture ? '1px dashed var(--line)' : 'none',
                }}
              />
            )
          }),
        )}
      </div>
    </div>
  )
}
