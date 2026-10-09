const STORAGE_KEY = 'majiguard.token'

/**
 * The access token lives in localStorage so a reload keeps the user signed in.
 * Every access is guarded: storage can be blocked or full, in which case the
 * user simply has to sign in again.
 */
export function getAuthToken(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

export function setAuthToken(token: string): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, token)
  } catch {
    // not persisted; the in-memory session still works until reload
  }
}

export function clearAuthToken(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // nothing to clear
  }
}
