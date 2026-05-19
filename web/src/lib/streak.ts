import { addDays } from './dates'

/** Sparse per-habit checks: { habitId: { 'YYYY-MM-DD': 1 } }. Missing = not checked. */
export type Checks = Record<string, Record<string, 1>>

/**
 * Current streak count for a habit as of `today`.
 *
 * Semantics:
 * - If today IS checked: streak includes today, count back day-by-day until a gap.
 * - If today is NOT checked yet: streak counts back from YESTERDAY until a gap (today
 *   doesn't break the streak yet — you still have time to check it off).
 * - Streaks are contiguous; a single missing day resets to 0 for any date before it.
 *
 * @returns number of consecutive checked days; 0 if no streak.
 */
export function currentStreak(checks: Checks, habitId: string, today: string): number {
  const habit = checks[habitId]
  if (!habit) return 0
  let cursor = habit[today] === 1 ? today : addDays(today, -1)
  let count = 0
  // Walk backwards while each day is checked. Cap at 365 to avoid pathological
  // loops if the grid blob is somehow malformed; 365 also matches the doc-size budget.
  for (let i = 0; i < 365; i++) {
    if (habit[cursor] !== 1) break
    count++
    cursor = addDays(cursor, -1)
  }
  return count
}

/**
 * Best streak ever for a habit (longest contiguous run of checked days in the blob).
 * Useful for the History screen header. Not required for v1 — keep available.
 */
export function bestStreak(checks: Checks, habitId: string): number {
  const habit = checks[habitId]
  if (!habit) return 0
  const dates = Object.keys(habit).sort()
  if (dates.length === 0) return 0
  let best = 1
  let run = 1
  for (let i = 1; i < dates.length; i++) {
    const prev = dates[i - 1]!
    const cur = dates[i]!
    if (addDays(prev, 1) === cur) {
      run++
      if (run > best) best = run
    } else {
      run = 1
    }
  }
  return best
}
