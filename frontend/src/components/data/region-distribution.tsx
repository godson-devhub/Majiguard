import { Link } from 'react-router'

import { useI18n } from '@/app/providers/locale-provider'
import { formatNumber } from '@/components/data/format'
import { useRegionNonFunctionalTotals, useRegionTotals, useWaterPointListQuery } from '@/hooks/water-points'
import { REGION_VALUES } from '@/lib/register-reference'
import { cn } from '@/lib/utils'

type RegionDistributionProps = {
  className?: string
  /** Ranks by each region's Non-Functional count instead of its total, and
   * shows that count as its own column - the decision-relevant framing for
   * Analytics ("which region needs attention"). Defaults to the original
   * total-only ranking. */
  rankByNonFunctional?: boolean
  /** When given, a row becomes a button that drills the caller's own Region
   * filter into that region, instead of the default navigate-to-map Link. */
  onSelectRegion?: (region: string) => void
}

/**
 * Regional distribution: one row per NBS region in the register's own
 * vocabulary, each with the register-provided total (and, optionally, its
 * Non-Functional count) and the region's share of the recorded estate. Every
 * number comes from the API via one filtered count per region - nothing is
 * tallied or interpolated in the browser, and this stays inside the
 * register's documented `page_size: 1` count pattern (safe at national
 * scale, unlike a full-record fetch). Each row either links to the map
 * focused on the region, or - when `onSelectRegion` is given - drills the
 * caller's own filter into it in place.
 */
export function RegionDistribution({
  className,
  rankByNonFunctional = false,
  onSelectRegion,
}: RegionDistributionProps) {
  const { t } = useI18n()
  const totals = useRegionTotals()
  const nonFunctionalTotals = useRegionNonFunctionalTotals()
  const overall = useWaterPointListQuery({ page: 1, page_size: 1 })
  const grandTotal = overall.data?.total ?? 0

  const rows = REGION_VALUES.map((region, index) => {
    const total = totals[index]?.data?.total ?? null
    const nonFunctional = nonFunctionalTotals[index]?.data?.total ?? null
    return { region, total, nonFunctional }
  }).toSorted((a, b) =>
    rankByNonFunctional ? (b.nonFunctional ?? 0) - (a.nonFunctional ?? 0) : (b.total ?? 0) - (a.total ?? 0),
  )

  const maxTotal = Math.max(...rows.map((row) => (rankByNonFunctional ? row.nonFunctional : row.total) ?? 0), 1)

  if (
    totals.some((query) => query.isPending) ||
    nonFunctionalTotals.some((query) => query.isPending) ||
    overall.isPending
  ) {
    return (
      <p role="status" className="text-mg-caption text-muted-foreground">
        {t('region.loading')}
      </p>
    )
  }

  if (
    totals.some((query) => query.isError) ||
    nonFunctionalTotals.some((query) => query.isError) ||
    overall.isError
  ) {
    return (
      <p role="alert" className="text-mg-caption text-destructive">
        {t('data.error.title')}
      </p>
    )
  }

  return (
    <div className={cn('mg-glass mg-glass-static overflow-hidden', className)}>
      <table className="w-full text-start">
        <caption className="sr-only">{t('analytics.region.title')}</caption>
        <thead>
          <tr className="border-b border-border bg-muted/50">
            <th scope="col" className="px-4 py-2 text-start text-mg-caption font-semibold text-muted-foreground">
              {t('region.column.region')}
            </th>
            <th scope="col" className="px-4 py-2 text-end text-mg-caption font-semibold text-muted-foreground">
              {t('region.column.total')}
            </th>
            <th scope="col" className="px-4 py-2 text-end text-mg-caption font-semibold text-muted-foreground">
              {t('region.column.nonFunctional')}
            </th>
            <th scope="col" className="hidden px-4 py-2 text-end text-mg-caption font-semibold text-muted-foreground sm:table-cell">
              {t('region.column.share')}
            </th>
            <th scope="col" className="hidden md:table-cell">
              <span className="sr-only">{t('region.column.share')}</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {rows.map(({ region, total, nonFunctional }) => {
            const rankValue = rankByNonFunctional ? nonFunctional : total
            const share =
              total !== null && grandTotal > 0 ? Math.round((total / grandTotal) * 1000) / 10 : null
            return (
              <tr key={region} className="mg-transition hover:bg-muted/40">
                <td className="px-4 py-2">
                  {onSelectRegion ? (
                    <button
                      type="button"
                      onClick={() => {
                        onSelectRegion(region)
                      }}
                      className="mg-figure text-start text-mg-body-sm font-medium text-primary underline-offset-2 hover:underline"
                    >
                      {region}
                    </button>
                  ) : (
                    <Link
                      to={`/dashboard?region=${encodeURIComponent(region)}`}
                      className="mg-figure text-mg-body-sm font-medium text-primary underline-offset-2 hover:underline"
                    >
                      {region}
                    </Link>
                  )}
                </td>
                <td className="mg-figure px-4 py-2 text-end text-mg-body-sm text-foreground">
                  {formatNumber(total)}
                </td>
                <td className="mg-figure px-4 py-2 text-end text-mg-body-sm text-foreground">
                  {formatNumber(nonFunctional)}
                </td>
                <td className="mg-figure hidden px-4 py-2 text-end text-mg-caption text-muted-foreground sm:table-cell">
                  {share === null ? '—' : `${share}%`}
                </td>
                <td className="hidden px-4 py-2 md:table-cell" aria-hidden="true">
                  <div className="h-1.5 w-full min-w-24 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary/70"
                      style={{ width: `${((rankValue ?? 0) / maxTotal) * 100}%` }}
                    />
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
