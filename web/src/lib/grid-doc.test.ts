import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  applyCheck,
  type CollectionLike,
  findOrCreateGridDoc,
  findOrCreateProfileDoc,
  type GridDoc,
  type ProfileDoc,
  recordCheck,
  resolveBuddyByLogin,
} from './grid-doc'
import type { Checks } from './streak'

function makeMockCollection<T extends object>(
  initial: (T & { id: string; _owner?: string })[] = [],
): CollectionLike<T> & { _docs: (T & { id: string; _owner?: string })[] } {
  const docs = [...initial]
  let nextId = docs.length + 1
  return {
    _docs: docs,
    create: vi.fn(async (doc: T) => {
      const created = { ...doc, id: `doc-${nextId++}` } as T & { id: string }
      docs.push(created)
      return created
    }),
    get: vi.fn(async (id: string) => docs.find((d) => d.id === id) ?? null),
    query: vi.fn(async (opts?: { owner?: string; limit?: number }) => {
      let filtered = opts?.owner ? docs.filter((d) => d._owner === opts.owner) : docs
      if (opts?.limit !== undefined) filtered = filtered.slice(0, opts.limit)
      return { documents: filtered, total: filtered.length }
    }),
    update: vi.fn(async (id: string, patch: Partial<T>) => {
      const idx = docs.findIndex((d) => d.id === id)
      if (idx < 0) throw new Error(`mock: not found ${id}`)
      docs[idx] = { ...docs[idx]!, ...patch }
      return docs[idx]!
    }),
  }
}

describe('findOrCreateGridDoc', () => {
  it('returns existing doc when present', async () => {
    const grids = makeMockCollection<GridDoc>([
      { id: 'doc-existing', _owner: 'me', checks: { pushups: { '2026-05-18': 1 } } },
    ])
    const got = await findOrCreateGridDoc(grids, 'me')
    expect(got.id).toBe('doc-existing')
    expect(got.doc.checks.pushups?.['2026-05-18']).toBe(1)
    expect(grids.create).not.toHaveBeenCalled()
  })

  it('creates a new empty doc when none exists', async () => {
    const grids = makeMockCollection<GridDoc>([])
    const got = await findOrCreateGridDoc(grids, 'me')
    expect(grids.create).toHaveBeenCalledWith({ checks: {} })
    expect(got.doc.checks).toEqual({})
  })

  it('queries with explicit orderBy:created_at,order:asc (matches backend default)', async () => {
    const grids = makeMockCollection<GridDoc>([
      { id: 'doc-existing', _owner: 'me', checks: {} },
    ])
    await findOrCreateGridDoc(grids, 'me')
    expect(grids.query).toHaveBeenCalledWith({
      owner: 'me',
      orderBy: 'created_at',
      order: 'asc',
      limit: 1,
    })
  })
})

describe('applyCheck', () => {
  it('adds a new habit + date', () => {
    const next = applyCheck({}, 'pushups', '2026-05-19')
    expect(next).toEqual({ pushups: { '2026-05-19': 1 } })
  })

  it('preserves existing dates for the same habit', () => {
    const prev = { pushups: { '2026-05-18': 1 } } as const
    const next = applyCheck(prev, 'pushups', '2026-05-19')
    expect(next.pushups).toEqual({ '2026-05-18': 1, '2026-05-19': 1 })
  })

  it('is idempotent — repeated apply returns the same reference', () => {
    const prev = { pushups: { '2026-05-19': 1 } } as const
    const next = applyCheck(prev, 'pushups', '2026-05-19')
    expect(next).toBe(prev)
  })

  it('does not mutate the input', () => {
    const prev: Checks = { pushups: { '2026-05-18': 1 } }
    applyCheck(prev, 'pushups', '2026-05-19')
    expect(prev).toEqual({ pushups: { '2026-05-18': 1 } })
  })
})

describe('recordCheck', () => {
  it('re-fetches before write (read-modify-write protects against shallow-merge races)', async () => {
    const grids = makeMockCollection<GridDoc>([
      { id: 'mine', _owner: 'me', checks: { pushups: { '2026-05-18': 1 } } },
    ])
    await recordCheck(grids, 'mine', 'pushups', '2026-05-19')
    expect(grids.get).toHaveBeenCalledWith('mine')
    expect(grids.update).toHaveBeenCalledWith('mine', {
      checks: { pushups: { '2026-05-18': 1, '2026-05-19': 1 } },
    })
  })

  it('idempotent fast-path: re-checking same day skips the network update', async () => {
    const grids = makeMockCollection<GridDoc>([
      { id: 'mine', _owner: 'me', checks: { pushups: { '2026-05-19': 1 } } },
    ])
    await recordCheck(grids, 'mine', 'pushups', '2026-05-19')
    expect(grids.get).toHaveBeenCalled()
    expect(grids.update).not.toHaveBeenCalled()
  })
})

describe('findOrCreateProfileDoc', () => {
  it('creates a new profile when none exists', async () => {
    const profiles = makeMockCollection<ProfileDoc>([])
    const got = await findOrCreateProfileDoc(profiles, 'me', 'serge', 'grid-123', 'https://avatar/serge')
    expect(profiles.create).toHaveBeenCalledWith({
      login: 'serge',
      gridDocId: 'grid-123',
      avatarUrl: 'https://avatar/serge',
    })
    expect(got.doc.login).toBe('serge')
  })

  it('updates an existing profile when gridDocId drifts', async () => {
    const profiles = makeMockCollection<ProfileDoc>([
      { id: 'p1', _owner: 'me', login: 'serge', gridDocId: 'old-grid', avatarUrl: null },
    ])
    await findOrCreateProfileDoc(profiles, 'me', 'serge', 'new-grid', 'https://avatar/serge')
    expect(profiles.update).toHaveBeenCalledWith('p1', {
      gridDocId: 'new-grid',
      avatarUrl: 'https://avatar/serge',
    })
  })

  it('no-op when nothing drifted', async () => {
    const profiles = makeMockCollection<ProfileDoc>([
      { id: 'p1', _owner: 'me', login: 'serge', gridDocId: 'grid-1', avatarUrl: 'a' },
    ])
    await findOrCreateProfileDoc(profiles, 'me', 'serge', 'grid-1', 'a')
    expect(profiles.update).not.toHaveBeenCalled()
  })
})

describe('resolveBuddyByLogin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('finds a profile by login case-insensitively', async () => {
    const profiles = makeMockCollection<ProfileDoc>([
      { id: 'p1', _owner: 'user-1', login: 'Serge', gridDocId: 'grid-1', avatarUrl: null },
      { id: 'p2', _owner: 'user-2', login: 'sergey', gridDocId: 'grid-2', avatarUrl: null },
    ])
    const got = await resolveBuddyByLogin(profiles, 'serge')
    expect(got?.profile.login).toBe('Serge')
    expect(got?.ownerId).toBe('user-1')
  })

  it('returns null when no profile matches', async () => {
    const profiles = makeMockCollection<ProfileDoc>([
      { id: 'p1', _owner: 'user-1', login: 'serge', gridDocId: 'grid-1', avatarUrl: null },
    ])
    const got = await resolveBuddyByLogin(profiles, 'somebody-else')
    expect(got).toBeNull()
  })
})
