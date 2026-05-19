// Buddies: paste a GitHub login → resolve to their profile doc → cache locally.
// Ghost slot + invite link when the login isn't on Streak yet.

import { useState } from 'react'
import { avatarUrlFor, getFas } from '../lib/fas'
import { type CollectionLike, type ProfileDoc, resolveBuddyByLogin } from '../lib/grid-doc'
import { todayInTz } from '../lib/dates'
import type { BuddyRef, Config } from '../types'

const MAX_BUDDIES = 10
const INVITE_URL = 'https://streak.freeappstore.online'

interface BuddiesProps {
  config: Config
  setConfig: (next: Config | ((prev: Config) => Config)) => Promise<void>
}

export function Buddies({ config, setConfig }: BuddiesProps) {
  const [draft, setDraft] = useState('')
  const [pending, setPending] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const today = todayInTz(config.tz)

  const add = async () => {
    const login = draft.trim().replace(/^@/, '')
    if (!login) return
    if (config.buddies.length >= MAX_BUDDIES) {
      setMsg(`You can only have ${MAX_BUDDIES} buddies.`)
      return
    }
    if (config.buddies.some((b) => b.login.toLowerCase() === login.toLowerCase())) {
      setMsg(`${login} is already a buddy.`)
      return
    }
    setPending(true)
    setMsg(null)
    try {
      const profiles = getFas().db.collection('profiles') as unknown as CollectionLike<ProfileDoc>
      const resolved = await resolveBuddyByLogin(profiles, login)
      if (!resolved) {
        // Ghost slot — still add them; the Room/grid views will show an empty
        // square until they sign up and create a profile.
        const ghost: BuddyRef = {
          login,
          ownerId: '',
          gridDocId: '',
          avatarUrl: avatarUrlFor(login),
          addedAt: today,
        }
        await setConfig((prev) => ({ ...prev, buddies: [...prev.buddies, ghost] }))
        setMsg(`Added @${login} — not on Streak yet. Send them ${INVITE_URL}.`)
      } else {
        const ref: BuddyRef = {
          login: resolved.profile.login,
          ownerId: resolved.ownerId,
          gridDocId: resolved.profile.gridDocId,
          avatarUrl: resolved.profile.avatarUrl ?? avatarUrlFor(resolved.profile.login),
          addedAt: today,
        }
        await setConfig((prev) => ({ ...prev, buddies: [...prev.buddies, ref] }))
        setMsg(`Added @${resolved.profile.login}.`)
      }
      setDraft('')
    } catch (err) {
      console.error('add buddy failed:', err)
      setMsg('Something went wrong. Try again.')
    } finally {
      setPending(false)
    }
  }

  const remove = async (login: string) => {
    await setConfig((prev) => ({ ...prev, buddies: prev.buddies.filter((b) => b.login !== login) }))
  }

  return (
    <div className="flex flex-col gap-6 px-2 pt-4 lg:pt-0">
      <header>
        <p className="text-[0.7rem] font-bold uppercase tracking-[0.18em] text-[var(--muted)]">
          {config.buddies.length} of {MAX_BUDDIES}
        </p>
        <h1 className="display-font mt-2 text-4xl font-bold text-[var(--ink)] lg:text-5xl">Buddies</h1>
        <p className="mt-2 text-[var(--muted)]">
          Add GitHub friends by login. When they check off a habit, you'll see it light up live.
        </p>
      </header>

      <ul className="flex flex-col gap-2">
        {config.buddies.map((b) => {
          const isGhost = !b.ownerId
          return (
            <li key={b.login} className="flex items-center justify-between gap-3 rounded-2xl border px-4 py-3"
              style={{ borderColor: 'var(--line)', background: 'var(--panel)' }}>
              <span className="flex items-center gap-3">
                {b.avatarUrl && (
                  <img src={b.avatarUrl} alt="" width={32} height={32}
                    className="rounded-full"
                    style={{ border: '1px solid var(--line-strong)' }} />
                )}
                <span className="flex flex-col">
                  <span className="font-bold text-[var(--ink)]">@{b.login}</span>
                  {isGhost && (
                    <span className="text-[0.75rem] text-[var(--muted)]">
                      Not on Streak yet — invite via {INVITE_URL}
                    </span>
                  )}
                </span>
              </span>
              <button type="button" onClick={() => remove(b.login)} aria-label="remove"
                className="rounded-lg px-2 py-1 text-[var(--muted)] hover:text-[var(--error)]">✕</button>
            </li>
          )
        })}
      </ul>

      {config.buddies.length < MAX_BUDDIES && (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void add()
          }}
          className="flex flex-col gap-2 rounded-2xl border p-4 sm:flex-row sm:items-center"
          style={{ borderColor: 'var(--line)', background: 'var(--panel)' }}
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="GitHub login (e.g., serge-ivo)"
            aria-label="github login"
            className="flex-1 rounded-lg border px-3 py-2"
            style={{ borderColor: 'var(--line-strong)', background: 'var(--paper)', color: 'var(--ink)' }}
            maxLength={40}
            disabled={pending}
          />
          <button
            type="submit"
            disabled={!draft.trim() || pending}
            className="rounded-lg px-4 py-2 font-bold text-white disabled:opacity-40"
            style={{ background: 'var(--accent)' }}
          >
            {pending ? '…' : 'Add'}
          </button>
        </form>
      )}

      {msg && <p className="text-[0.85rem] text-[var(--muted)]">{msg}</p>}
    </div>
  )
}
