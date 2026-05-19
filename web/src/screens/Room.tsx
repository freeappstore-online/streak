// Room: live tile of buddies' today-rows. Subscribes to one room per buddy
// (streak-pulse-${buddyLogin}). On pulse, re-fetches that buddy's grid doc
// and animates the changed square. Own square animates from local state in
// Today, not here.

import { useEffect, useMemo, useState } from 'react'
import { getFas } from '../lib/fas'
import { todayInTz, lastNDays } from '../lib/dates'
import { type CollectionLike, type GridDoc } from '../lib/grid-doc'
import type { Config, BuddyRef } from '../types'

interface BuddyState {
  ref: BuddyRef
  checks: Record<string, Record<string, 1>>
  loading: boolean
}

interface RoomProps {
  config: Config
}

export function Room({ config }: RoomProps) {
  const today = todayInTz(config.tz)
  const lastWeek = useMemo(() => lastNDays(today, 7), [today])
  const [buddies, setBuddies] = useState<BuddyState[]>(() =>
    config.buddies.map((ref) => ({ ref, checks: {}, loading: true })),
  )

  // Fetch each buddy's grid once on mount. Cheap: 1 doc per buddy, ~25KB max.
  useEffect(() => {
    let cancelled = false
    const grids = getFas().db.collection('grids') as unknown as CollectionLike<GridDoc>
    ;(async () => {
      for (let i = 0; i < config.buddies.length; i++) {
        const b = config.buddies[i]!
        if (!b.gridDocId) {
          if (!cancelled) {
            setBuddies((prev) => prev.map((s, idx) => (idx === i ? { ...s, loading: false } : s)))
          }
          continue
        }
        try {
          const doc = await grids.get(b.gridDocId)
          if (cancelled) return
          setBuddies((prev) =>
            prev.map((s, idx) => (idx === i ? { ...s, checks: doc?.checks ?? {}, loading: false } : s)),
          )
        } catch (err) {
          console.error(`fetch grid for ${b.login} failed:`, err)
          if (!cancelled) {
            setBuddies((prev) => prev.map((s, idx) => (idx === i ? { ...s, loading: false } : s)))
          }
        }
      }
    })()
    return () => {
      cancelled = true
    }
    // Re-fetch when the buddy list changes shape, not on every re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.buddies.map((b) => b.gridDocId).join('|')])

  // Subscribe to each buddy's pulse room. On any pulse, re-fetch that buddy's doc.
  useEffect(() => {
    const grids = getFas().db.collection('grids') as unknown as CollectionLike<GridDoc>
    const rooms = config.buddies
      .filter((b) => b.ownerId) // skip ghost slots
      .map((b) => {
        const room = getFas().rooms.join(`streak-pulse-${b.login}`)
        const off = room.onMessage(async () => {
          if (!b.gridDocId) return
          try {
            const fresh = await grids.get(b.gridDocId)
            setBuddies((prev) =>
              prev.map((s) => (s.ref.login === b.login ? { ...s, checks: fresh?.checks ?? {} } : s)),
            )
          } catch (err) {
            console.error(`refresh after pulse from ${b.login} failed:`, err)
          }
        })
        return { room, off }
      })
    return () => {
      for (const { room, off } of rooms) {
        off()
        room.close()
      }
    }
  }, [config.buddies])

  return (
    <div className="flex flex-col gap-6 px-2 pt-4 lg:pt-0">
      <header>
        <p className="text-[0.7rem] font-bold uppercase tracking-[0.18em] text-[var(--muted)]">
          Last 7 days · live
        </p>
        <h1 className="display-font mt-2 text-4xl font-bold text-[var(--ink)] lg:text-5xl">Room</h1>
        <p className="mt-2 text-[var(--muted)]">
          When a buddy checks off a habit, their square lights up here in real time.
        </p>
      </header>

      {config.buddies.length === 0 ? (
        <p className="text-[var(--muted)]">No buddies yet. Add some on the Buddies tab.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {buddies.map(({ ref, checks, loading }) => {
            const checkedDays = new Set(
              Object.values(checks).flatMap((perHabit) => Object.keys(perHabit)),
            )
            return (
              <li key={ref.login} className="flex flex-col gap-3 rounded-2xl border p-5"
                style={{ borderColor: 'var(--line)', background: 'var(--panel)' }}>
                <div className="flex items-center gap-3">
                  {ref.avatarUrl && (
                    <img src={ref.avatarUrl} alt="" width={32} height={32}
                      className="rounded-full"
                      style={{ border: '1px solid var(--line-strong)' }} />
                  )}
                  <span className="font-bold text-[var(--ink)]">@{ref.login}</span>
                  {!ref.ownerId && (
                    <span className="text-[0.75rem] text-[var(--muted)]">(not on Streak yet)</span>
                  )}
                  {loading && <span className="text-[0.75rem] text-[var(--muted)]">loading…</span>}
                </div>
                <div className="flex gap-1.5">
                  {lastWeek.map((day) => {
                    const lit = checkedDays.has(day)
                    return (
                      <div
                        key={day}
                        title={`${day}${lit ? ' ✓' : ''}`}
                        className="grid h-8 w-8 place-items-center rounded-lg text-[0.7rem]"
                        style={{
                          background: lit ? 'var(--accent)' : 'var(--line)',
                          color: lit ? 'white' : 'var(--muted)',
                          transition: 'background-color 240ms ease',
                          opacity: day > today ? 0.3 : 1,
                        }}
                      >
                        {day.slice(8)}
                      </div>
                    )
                  })}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
