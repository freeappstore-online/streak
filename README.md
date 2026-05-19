# streak

Daily habits with live buddy grids. A free app on [FreeAppStore](https://freeappstore.online).

- **Live at:** `streak.freeappstore.online`
- **Dev:** `pnpm install && pnpm dev`
- **Build:** `pnpm build`
- **Test:** `pnpm test`
- **Deploy:** `git push origin main` (auto-deploys via Cloudflare Pages)

## What it is

Pick up to 5 daily habits. Tap to mark them done. See your year as a GitHub-style grid. Add GitHub friends as buddies — when anyone checks off a habit, their square fills in live on your screen.

## Why it exists

This is the **FAS showcase app**. The whole thing — auth, per-user state, public state for sharing with buddies, realtime presence — is built on four `@freeappstore/sdk` primitives:

| Primitive | What it does here |
|---|---|
| `auth` | GitHub OAuth — your `login` is your handle |
| `kv` | Private state — your habits config + cached grid doc id |
| `db` | Public state — one grid doc per user, public-read so buddies can see your year |
| `rooms` | Presence pulse — when you check off, a ~40-byte ping flashes your buddies' grids live |

`counters` and `proxy` are not used. The source is meant to be readable end-to-end in ~10 minutes — if the SDK doesn't make sense to you after reading `web/src/`, please open an issue.

## Limits

streak runs entirely on the Free FAS tier:

- 1MB KV per user (we use <5KB)
- 10K docs per app collection (we use ≤100, one per user)
- 64 rooms per app, 32 peers per room (we use ≤15 concurrent, ≤5 peers each)

## License

MIT. No tracking. Free forever.
