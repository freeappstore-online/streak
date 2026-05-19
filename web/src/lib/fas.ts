// SDK singleton + bootstrap helpers. Mirrors @freeappstore/sdk's normal usage —
// the rest of the app reads `fas.auth.user`, `fas.kv`, `fas.db`, `fas.rooms`.

import { initApp, type FreeAppStore } from '@freeappstore/sdk'

const APP_ID = 'streak'

let _fas: FreeAppStore | null = null

export function getFas(): FreeAppStore {
  if (_fas) return _fas
  _fas = initApp({ appId: APP_ID })
  return _fas
}

/**
 * Capture the IANA tz the browser is currently in. Used once at first sign-in
 * and stored in `kv.config.tz`. We do NOT re-detect on later loads — moving
 * across timezones shouldn't shift "today" out from under streaks already
 * earned in the original tz.
 */
export function detectTz(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

/** GitHub avatar from a login — synchronous, no API call. */
export function avatarUrlFor(login: string): string {
  return `https://github.com/${encodeURIComponent(login)}.png?size=80`
}
