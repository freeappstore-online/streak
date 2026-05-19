// Habits: CRUD up to 5 habits. Writes back to kv.config.

import { useState } from 'react'
import { todayInTz } from '../lib/dates'
import type { Config, Habit } from '../types'

const MAX_HABITS = 5
const DEFAULT_EMOJI = '✦'

interface HabitsProps {
  config: Config
  setConfig: (next: Config | ((prev: Config) => Config)) => Promise<void>
}

export function Habits({ config, setConfig }: HabitsProps) {
  const [draftName, setDraftName] = useState('')
  const [draftEmoji, setDraftEmoji] = useState(DEFAULT_EMOJI)
  const today = todayInTz(config.tz)

  const add = async () => {
    const name = draftName.trim()
    if (!name) return
    if (config.habits.length >= MAX_HABITS) return
    const habit: Habit = {
      id: `h-${Date.now().toString(36)}`,
      name,
      emoji: draftEmoji || DEFAULT_EMOJI,
      created: today,
    }
    await setConfig((prev) => ({ ...prev, habits: [...prev.habits, habit] }))
    setDraftName('')
    setDraftEmoji(DEFAULT_EMOJI)
  }

  const remove = async (id: string) => {
    await setConfig((prev) => ({ ...prev, habits: prev.habits.filter((h) => h.id !== id) }))
  }

  const move = async (id: string, dir: -1 | 1) => {
    await setConfig((prev) => {
      const idx = prev.habits.findIndex((h) => h.id === id)
      if (idx < 0) return prev
      const next = [...prev.habits]
      const tgt = idx + dir
      if (tgt < 0 || tgt >= next.length) return prev
      ;[next[idx], next[tgt]] = [next[tgt]!, next[idx]!]
      return { ...prev, habits: next }
    })
  }

  return (
    <div className="flex flex-col gap-6 px-2 pt-4 lg:pt-0">
      <header>
        <p className="text-[0.7rem] font-bold uppercase tracking-[0.18em] text-[var(--muted)]">
          {config.habits.length} of {MAX_HABITS}
        </p>
        <h1 className="display-font mt-2 text-4xl font-bold text-[var(--ink)] lg:text-5xl">Habits</h1>
        <p className="mt-2 text-[var(--muted)]">Five daily habits, one streak each. Less is more.</p>
      </header>

      <ul className="flex flex-col gap-2">
        {config.habits.map((h, i) => (
          <li key={h.id} className="flex items-center justify-between gap-3 rounded-2xl border px-4 py-3"
            style={{ borderColor: 'var(--line)', background: 'var(--panel)' }}>
            <span className="flex items-center gap-3">
              <span className="text-2xl" aria-hidden>{h.emoji}</span>
              <span className="font-bold text-[var(--ink)]">{h.name}</span>
            </span>
            <span className="flex gap-1 text-[var(--muted)]">
              <button type="button" disabled={i === 0} onClick={() => move(h.id, -1)} aria-label="move up"
                className="rounded-lg px-2 py-1 disabled:opacity-30">↑</button>
              <button type="button" disabled={i === config.habits.length - 1} onClick={() => move(h.id, 1)} aria-label="move down"
                className="rounded-lg px-2 py-1 disabled:opacity-30">↓</button>
              <button type="button" onClick={() => remove(h.id)} aria-label="remove"
                className="rounded-lg px-2 py-1 hover:text-[var(--error)]">✕</button>
            </span>
          </li>
        ))}
      </ul>

      {config.habits.length < MAX_HABITS && (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void add()
          }}
          className="flex flex-col gap-2 rounded-2xl border p-4 sm:flex-row sm:items-center"
          style={{ borderColor: 'var(--line)', background: 'var(--panel)' }}
        >
          <input
            value={draftEmoji}
            onChange={(e) => setDraftEmoji(e.target.value.slice(0, 4))}
            aria-label="emoji"
            className="rounded-lg border px-3 py-2 text-center text-xl sm:w-16"
            style={{ borderColor: 'var(--line-strong)', background: 'var(--paper)', color: 'var(--ink)' }}
            maxLength={4}
          />
          <input
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            placeholder="New habit (e.g., push-ups)"
            aria-label="new habit name"
            className="flex-1 rounded-lg border px-3 py-2"
            style={{ borderColor: 'var(--line-strong)', background: 'var(--paper)', color: 'var(--ink)' }}
            maxLength={40}
          />
          <button
            type="submit"
            disabled={!draftName.trim()}
            className="rounded-lg px-4 py-2 font-bold text-white disabled:opacity-40"
            style={{ background: 'var(--accent)' }}
          >
            Add
          </button>
        </form>
      )}
    </div>
  )
}
