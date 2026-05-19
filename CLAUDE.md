# streak

A free app on FreeAppStore — daily habits with live buddy grids.

- Subdomain: `streak.freeappstore.online`
- Dev: `pnpm install && pnpm dev`
- Build: `pnpm build`
- Test: `pnpm test`
- Deploy: `git push origin main` (auto-deploys via Cloudflare Pages)

## What's load-bearing

This app is the FAS showcase. **All four SDK primitives below are intentionally non-removable.** If you find yourself simplifying one out, you're collapsing the demo — stop and ask first.

- `auth` → identity
- `kv` → private state (habit config + cached grid doc id)
- `db` (collection: `grids`) → public state (one doc per user, ≤25KB)
- `rooms` (key: `streak-pulse-${userId}`) → presence pulse only, no state

## Data race notes (read before changing write paths)

- Backend `db.update` is a **shallow merge** (`{ ...existing, ...patch }`). To avoid lost orthogonal writes from two devices, `applyCheck` in `src/lib/grid-doc.ts` does **read-modify-write** every time. Don't shortcut this.
- `db.create` server-generates uuids. We cache `gridDocId` in `kv.config` after first lookup so subsequent checks skip the query entirely. First-launch dual-device race is theoretically possible (two devices, same first check-off, within ~500ms) but practically nil.
- Room broadcast at `backend/src/do/room.ts:91` excludes sender. **Animate your own squares from local state**, animate buddies' squares from incoming room pulses.

Free, MIT-licensed, no tracking. For platform conventions, read
https://freeappstore.online/skills.md
before writing or changing anything.
