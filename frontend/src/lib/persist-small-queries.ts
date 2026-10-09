import type { QueryClient } from '@tanstack/react-query'

/**
 * Remembers the few small answers every screen opens with (the national
 * summary, register totals, condition counts, and the top priority rows) in
 * localStorage, so a reload paints real numbers immediately while the fresh
 * ones load behind them. Entries are restored already-stale, so they are
 * always refetched; nothing large (map points, full lists) is ever stored.
 */
const STORAGE_KEY = 'majiguard.cache.v1'
const MAX_AGE_MS = 24 * 60 * 60 * 1000

type Entry = { key: readonly unknown[]; data: unknown; at: number }

function isSmall(key: readonly unknown[]): boolean {
  const [scope, kind, params] = key
  if (scope === 'priority' && kind === 'summary') {
    return true
  }
  if (
    (scope === 'priority' && (kind === 'preventive' || kind === 'restoration')) ||
    (scope === 'water-points' && kind === 'list')
  ) {
    const size = (params as { page_size?: number } | undefined)?.page_size
    return typeof size === 'number' && size <= 10
  }
  return false
}

export function enableSmallQueryPersistence(client: QueryClient): void {
  if (typeof window === 'undefined') {
    return
  }
  const entries = new Map<string, Entry>()

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw !== null) {
      for (const entry of JSON.parse(raw) as Entry[]) {
        if (Date.now() - entry.at < MAX_AGE_MS && client.getQueryData(entry.key) === undefined) {
          client.setQueryData(entry.key, entry.data, { updatedAt: entry.at })
          entries.set(JSON.stringify(entry.key), entry)
        }
      }
    }
  } catch {
    // unreadable or blocked storage: simply start empty
  }

  let timer: number | undefined
  client.getQueryCache().subscribe((event) => {
    if (event.type !== 'updated' || event.action.type !== 'success') {
      return
    }
    const { queryKey, state } = event.query
    if (!isSmall(queryKey) || state.data === undefined) {
      return
    }
    entries.set(JSON.stringify(queryKey), { key: queryKey, data: state.data, at: state.dataUpdatedAt })
    window.clearTimeout(timer)
    timer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...entries.values()].slice(-40)))
      } catch {
        // storage full or blocked: persistence is only an optimisation
      }
    }, 800)
  })
}
