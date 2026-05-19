// Pure date helpers. No I/O, no SDK. Date strings are always YYYY-MM-DD in the
// user's captured timezone — never recomputed across timezones at read time.

/** YYYY-MM-DD for `now` in `tz`. `tz` is an IANA name like 'Australia/Melbourne'. */
export function todayInTz(tz: string, now: Date = new Date()): string {
  // Intl.DateTimeFormat with 'en-CA' produces ISO YYYY-MM-DD in the requested tz.
  // 'en-CA' is the canonical "ISO date" locale — every modern browser supports it.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

/** Parse YYYY-MM-DD into a Date at local midnight. Returns null on malformed input. */
export function parseDate(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)
  if (!m) return null
  const y = Number(m[1])
  const mo = Number(m[2])
  const d = Number(m[3])
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null
  const date = new Date(y, mo - 1, d)
  // Validate: JS Date silently rolls over (Feb 30 → Mar 2). Reject that.
  if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d) return null
  return date
}

/** YYYY-MM-DD `n` days before/after `s`. Negative `n` goes backwards. */
export function addDays(s: string, n: number): string {
  const d = parseDate(s)
  if (!d) throw new Error(`addDays: invalid date ${s}`)
  d.setDate(d.getDate() + n)
  const y = d.getFullYear()
  const mo = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${mo}-${day}`
}

/** YYYY-MM-DD `n` days back from `today` (inclusive). Returns oldest-first array of length `n`. */
export function lastNDays(today: string, n: number): string[] {
  const out: string[] = []
  for (let i = n - 1; i >= 0; i--) out.push(addDays(today, -i))
  return out
}

/**
 * Returns weeks-back grid: 53 weeks × 7 days, ending on `today`.
 * Each week is an array of 7 YYYY-MM-DD strings (Sun → Sat).
 * The very last week may include "future" days after `today` — caller can dim those.
 */
export function gridWeeks(today: string, weeks: number = 53): string[][] {
  const todayDate = parseDate(today)
  if (!todayDate) throw new Error(`gridWeeks: invalid today ${today}`)
  // Find the Saturday that ends the current week (or today if today is Saturday).
  const todayDow = todayDate.getDay() // 0=Sun, 6=Sat
  const daysToSat = 6 - todayDow
  const endDate = addDays(today, daysToSat)
  // First Sunday of the grid: endDate - (weeks*7 - 1) days, then back to Sunday.
  const start = addDays(endDate, -(weeks * 7 - 1))
  const out: string[][] = []
  for (let w = 0; w < weeks; w++) {
    const week: string[] = []
    for (let d = 0; d < 7; d++) week.push(addDays(start, w * 7 + d))
    out.push(week)
  }
  return out
}
