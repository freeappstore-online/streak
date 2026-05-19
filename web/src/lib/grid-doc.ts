// Grid and profile doc lifecycle. Read-modify-write on every check-off — see
// CLAUDE.md "Data race notes." Backend db.update is shallow-merge, so we
// always re-fetch authoritative state before writing.

import type { Checks } from './streak'

/** Public grid doc — one per user, public-read, owner-write. */
export interface GridDoc {
  checks: Checks
}

/** Public profile doc — one per user, holds login + gridDocId for buddy lookup. */
export interface ProfileDoc {
  login: string
  gridDocId: string
  avatarUrl: string | null
}

/**
 * Minimal collection-shaped interface so this module is testable without the SDK.
 * Mirrors `fas.db.collection(name)` from @freeappstore/sdk.
 */
export interface CollectionLike<T extends object> {
  create(doc: T): Promise<T & { id: string }>
  get(id: string): Promise<(T & { id: string }) | null>
  query(opts?: {
    owner?: string
    limit?: number
    offset?: number
    orderBy?: 'created_at' | 'updated_at'
    order?: 'asc' | 'desc'
  }): Promise<{ documents: (T & { id: string })[]; total: number }>
  update(id: string, patch: Partial<T>): Promise<T & { id: string }>
}

/**
 * Find this user's existing grid doc (oldest-first to match backend default at
 * routes/db.ts:102) or create a new empty one. Returns the doc id — caller
 * should cache it in kv.config.gridDocId so subsequent writes skip the query.
 */
export async function findOrCreateGridDoc(
  grids: CollectionLike<GridDoc>,
  userId: string,
): Promise<{ id: string; doc: GridDoc }> {
  const res = await grids.query({
    owner: userId,
    orderBy: 'created_at',
    order: 'asc',
    limit: 1,
  })
  const existing = res.documents[0]
  if (existing) return { id: existing.id, doc: { checks: existing.checks } }
  const created = await grids.create({ checks: {} })
  return { id: created.id, doc: { checks: {} } }
}

/**
 * Same shape for profiles. Created on first sign-in so buddies can resolve
 * `login → gridDocId` via the public `profiles` collection.
 */
export async function findOrCreateProfileDoc(
  profiles: CollectionLike<ProfileDoc>,
  userId: string,
  login: string,
  gridDocId: string,
  avatarUrl: string | null,
): Promise<{ id: string; doc: ProfileDoc }> {
  const res = await profiles.query({
    owner: userId,
    orderBy: 'created_at',
    order: 'asc',
    limit: 1,
  })
  const existing = res.documents[0]
  if (existing) {
    // Keep gridDocId / avatar fresh if they drifted (rare, but handles e.g. user
    // re-creating their grid doc manually). Cheap idempotent write.
    if (existing.gridDocId !== gridDocId || existing.avatarUrl !== avatarUrl) {
      const updated = await profiles.update(existing.id, { gridDocId, avatarUrl })
      return { id: updated.id, doc: { login: updated.login, gridDocId: updated.gridDocId, avatarUrl: updated.avatarUrl } }
    }
    return { id: existing.id, doc: { login: existing.login, gridDocId: existing.gridDocId, avatarUrl: existing.avatarUrl } }
  }
  const created = await profiles.create({ login, gridDocId, avatarUrl })
  return { id: created.id, doc: { login, gridDocId, avatarUrl } }
}

/**
 * Resolve a buddy's GitHub login → their profile doc.
 *
 * v1 limitation: db.query has no filter-by-data-field, so we paginate profiles
 * and scan client-side. At ≤100 DAU this is one round-trip and ~10KB. A
 * platform-level "where login = ?" would replace this; captured as a TODO.
 */
export async function resolveBuddyByLogin(
  profiles: CollectionLike<ProfileDoc>,
  login: string,
): Promise<{ profileId: string; profile: ProfileDoc; ownerId: string } | null> {
  const res = await profiles.query({
    orderBy: 'updated_at',
    order: 'desc',
    limit: 200,
  })
  for (const doc of res.documents) {
    if (doc.login.toLowerCase() === login.toLowerCase()) {
      // The SDK exposes _owner on query results — types loose here because the SDK's
      // QueryResult<T> doesn't strictly include it in T. Cast pragmatically.
      const ownerId = (doc as unknown as { _owner?: string })._owner ?? ''
      return { profileId: doc.id, profile: { login: doc.login, gridDocId: doc.gridDocId, avatarUrl: doc.avatarUrl }, ownerId }
    }
  }
  return null
}

/**
 * Idempotent pure helper — apply a check to the checks blob.
 *
 * Does NOT mutate the input. Used by the read-modify-write call site to compute
 * the next state before calling db.update.
 */
export function applyCheck(checks: Checks, habitId: string, date: string): Checks {
  const habit = checks[habitId] ?? {}
  if (habit[date] === 1) return checks // already set — no-op
  return {
    ...checks,
    [habitId]: { ...habit, [date]: 1 },
  }
}

/**
 * Read-modify-write a single check. Re-fetches the doc to get authoritative
 * state, merges in the new check, writes the merged blob. Window between
 * fetch and write is ~50-100ms — small enough that real-world races are nil.
 */
export async function recordCheck(
  grids: CollectionLike<GridDoc>,
  gridDocId: string,
  habitId: string,
  date: string,
): Promise<GridDoc> {
  const latest = await grids.get(gridDocId)
  if (!latest) throw new Error(`recordCheck: grid doc ${gridDocId} not found`)
  const nextChecks = applyCheck(latest.checks, habitId, date)
  if (nextChecks === latest.checks) return { checks: latest.checks } // idempotent fast-path
  await grids.update(gridDocId, { checks: nextChecks })
  return { checks: nextChecks }
}
