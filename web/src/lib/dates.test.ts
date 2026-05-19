import { describe, expect, it } from 'vitest'
import { addDays, gridWeeks, lastNDays, parseDate, todayInTz } from './dates'

describe('todayInTz', () => {
  it('returns YYYY-MM-DD in the requested tz', () => {
    // 2026-05-19 10:00 UTC = same day everywhere except deep west tz before the date line
    const noonUtc = new Date(Date.UTC(2026, 4, 19, 10, 0, 0))
    expect(todayInTz('UTC', noonUtc)).toBe('2026-05-19')
    expect(todayInTz('Australia/Melbourne', noonUtc)).toBe('2026-05-19') // UTC+10 in May
  })

  it('crosses tz boundaries at the day line', () => {
    // 2026-05-19 23:00 UTC = 2026-05-20 09:00 in Melbourne (+10), 2026-05-19 19:00 in NYC
    const lateUtc = new Date(Date.UTC(2026, 4, 19, 23, 0, 0))
    expect(todayInTz('Australia/Melbourne', lateUtc)).toBe('2026-05-20')
    expect(todayInTz('America/New_York', lateUtc)).toBe('2026-05-19')
    expect(todayInTz('UTC', lateUtc)).toBe('2026-05-19')
  })

  it('handles DST transition correctly (Melbourne Apr 5, 2026 — daylight ends)', () => {
    // Pick a time clearly on each side of the DST roll. DST in Melbourne ends ~3am Apr 5 2026.
    const beforeDst = new Date(Date.UTC(2026, 3, 4, 16, 0, 0)) // Apr 4 16:00 UTC = Apr 5 03:00 AEDT/02:00 AEST
    expect(todayInTz('Australia/Melbourne', beforeDst)).toBe('2026-04-05')
  })
})

describe('parseDate', () => {
  it('round-trips a normal date', () => {
    const d = parseDate('2026-05-19')!
    expect(d.getFullYear()).toBe(2026)
    expect(d.getMonth()).toBe(4)
    expect(d.getDate()).toBe(19)
  })

  it('rejects malformed and overflow dates', () => {
    expect(parseDate('2026-13-01')).toBeNull()
    expect(parseDate('2026-02-30')).toBeNull()
    expect(parseDate('not-a-date')).toBeNull()
    expect(parseDate('2026-5-19')).toBeNull() // single-digit month rejected
  })
})

describe('addDays', () => {
  it('adds and subtracts across month boundaries', () => {
    expect(addDays('2026-05-19', 1)).toBe('2026-05-20')
    expect(addDays('2026-05-19', -1)).toBe('2026-05-18')
    expect(addDays('2026-05-01', -1)).toBe('2026-04-30')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
  })

  it('handles leap year', () => {
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29')
    expect(addDays('2028-02-29', 1)).toBe('2028-03-01')
  })
})

describe('lastNDays', () => {
  it('returns oldest-first array of length n ending on today', () => {
    const got = lastNDays('2026-05-19', 5)
    expect(got).toEqual(['2026-05-15', '2026-05-16', '2026-05-17', '2026-05-18', '2026-05-19'])
  })
})

describe('gridWeeks', () => {
  it('returns 53 weeks of 7 days each by default', () => {
    const grid = gridWeeks('2026-05-19')
    expect(grid).toHaveLength(53)
    for (const week of grid) expect(week).toHaveLength(7)
  })

  it('ends on the Saturday of the current week', () => {
    // 2026-05-19 is a Tuesday. Week ends Sat 2026-05-23.
    const grid = gridWeeks('2026-05-19', 2)
    const lastWeek = grid[grid.length - 1]!
    expect(lastWeek[6]).toBe('2026-05-23')
    expect(lastWeek[0]).toBe('2026-05-17') // Sunday
  })
})
