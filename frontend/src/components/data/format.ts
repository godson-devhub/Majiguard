/**
 * Presentation helpers for backend values. These format what the API returned —
 * they never derive, rank, rescale or infer a value the backend did not send.
 */

const EM_DASH = '—'

const numberFormat = new Intl.NumberFormat('en-TZ', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 4,
})

export function formatNumber(value: number | null): string {
  return value === null ? EM_DASH : numberFormat.format(value)
}

const percentFormat = new Intl.NumberFormat('en-TZ', {
  style: 'percent',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

/**
 * For values that are genuinely a probability/percentile/proportion in
 * [0, 1] - `probability_non_functional` (a likelihood) and `impact_score`
 * (a percentile-blended relative measure). Never apply this to a score that
 * is not itself a probability or percentile (e.g. the preventive priority
 * score, which is a product of two such measures and no longer one itself) -
 * doing so would imply a probabilistic meaning the value doesn't have.
 */
export function formatPercent(value: number | null): string {
  return value === null ? EM_DASH : percentFormat.format(value)
}

/**
 * For `priority_score` only: a percentage-style rendering of a normalized
 * [0, 1] score, for scanability in dense worklists. This is a deliberately
 * separate function from `formatPercent` - priority_score is a product of a
 * probability and a percentile-blended measure, so it is not itself a
 * probability, and must never be labelled as one. Callers must keep the
 * accompanying label as "Priority score", never "probability" or "chance".
 */
export function formatScorePercent(value: number | null): string {
  return value === null ? EM_DASH : percentFormat.format(value)
}

export function formatCoordinatePair(
  latitude: number | null,
  longitude: number | null,
): string {
  if (latitude === null || longitude === null) {
    return EM_DASH
  }
  return `${formatNumber(latitude)}, ${formatNumber(longitude)}`
}

export function formatDate(value: string | null): string {
  if (value === null) {
    return EM_DASH
  }
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return value
  }
  return new Intl.DateTimeFormat('en-TZ', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  }).format(parsed)
}

export function formatDateTime(value: string): string {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return value
  }
  return new Intl.DateTimeFormat('en-TZ', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsed)
}
