// Shared types across screens, hooks, and lib.

export interface Habit {
  id: string
  name: string
  emoji: string
  created: string // YYYY-MM-DD
}

export interface BuddyRef {
  login: string
  ownerId: string // GitHub user.id of the buddy — needed for `db.query({ owner })`
  gridDocId: string
  avatarUrl: string | null
  addedAt: string // YYYY-MM-DD
}

/**
 * The single KV blob this app writes per user. Stored at key `'config'`.
 * Size budget: <5KB at full saturation (5 habits + 10 buddies + grid id + tz).
 */
export interface Config {
  habits: Habit[]
  buddies: BuddyRef[]
  tz: string
  gridDocId: string | null
  profileDocId: string | null
}

export const EMPTY_CONFIG: Config = {
  habits: [],
  buddies: [],
  tz: 'UTC',
  gridDocId: null,
  profileDocId: null,
}

/** What screens we route between. Hash-based — `#today`, `#history`, etc. */
export type Screen = 'today' | 'history' | 'habits' | 'buddies' | 'room'
