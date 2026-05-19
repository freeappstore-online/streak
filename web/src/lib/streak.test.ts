import { describe, expect, it } from 'vitest'
import { bestStreak, currentStreak, type Checks } from './streak'

const TODAY = '2026-05-19' // Tuesday

describe('currentStreak', () => {
  it('returns 0 for empty checks', () => {
    expect(currentStreak({}, 'pushups', TODAY)).toBe(0)
    expect(currentStreak({ pushups: {} }, 'pushups', TODAY)).toBe(0)
  })

  it('counts a contiguous run ending today', () => {
    const checks: Checks = {
      pushups: { '2026-05-19': 1, '2026-05-18': 1, '2026-05-17': 1 },
    }
    expect(currentStreak(checks, 'pushups', TODAY)).toBe(3)
  })

  it('counts back from yesterday when today is not checked yet', () => {
    const checks: Checks = {
      pushups: { '2026-05-18': 1, '2026-05-17': 1, '2026-05-16': 1 },
    }
    expect(currentStreak(checks, 'pushups', TODAY)).toBe(3)
  })

  it('returns 0 when there is a gap right before today', () => {
    const checks: Checks = {
      pushups: { '2026-05-17': 1, '2026-05-16': 1 }, // gap on 18th
    }
    // today not checked → count back from yesterday → 18th missing → 0
    expect(currentStreak(checks, 'pushups', TODAY)).toBe(0)
  })

  it('counts independently per habit', () => {
    const checks: Checks = {
      pushups: { '2026-05-19': 1, '2026-05-18': 1 },
      journal: { '2026-05-19': 1 },
    }
    expect(currentStreak(checks, 'pushups', TODAY)).toBe(2)
    expect(currentStreak(checks, 'journal', TODAY)).toBe(1)
  })
})

describe('bestStreak', () => {
  it('finds the longest contiguous run', () => {
    const checks: Checks = {
      pushups: {
        '2026-05-01': 1,
        '2026-05-02': 1,
        '2026-05-03': 1,
        // gap on 4th
        '2026-05-10': 1,
        '2026-05-11': 1,
      },
    }
    expect(bestStreak(checks, 'pushups')).toBe(3)
  })

  it('returns 1 for a single check', () => {
    expect(bestStreak({ pushups: { '2026-05-19': 1 } }, 'pushups')).toBe(1)
  })

  it('returns 0 for an empty habit', () => {
    expect(bestStreak({ pushups: {} }, 'pushups')).toBe(0)
    expect(bestStreak({}, 'pushups')).toBe(0)
  })
})
