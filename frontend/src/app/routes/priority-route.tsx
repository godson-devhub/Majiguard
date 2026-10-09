import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'

import { useI18n } from '@/app/providers/locale-provider'
import { Pagination } from '@/app/shell/section-page'
import { DataCell, DataRow, DataTable } from '@/components/data/data-table'
import { EmptyState, FailureState, LoadingState } from '@/components/data/data-states'
import { formatPercent, formatScorePercent } from '@/components/data/format'
import { InspectionDrawer } from '@/components/data/inspection-drawer'
import { ObservedStatusChip } from '@/components/data/observed-status'
import { RankBadge } from '@/components/data/rank-badge'
import { SemanticChip } from '@/components/status/semantic-chip'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useElementSize } from '@/hooks/use-element-size'
import { usePageParam } from '@/hooks/use-page-param'
import { usePreventivePriorityQuery, useRestorationPriorityQuery } from '@/hooks/priority'
import {
  formatLocation,
  priorityRowAccent,
  recommendedActionLabelKey,
  riskBandTone,
  whyReasonLabelKey,
} from '@/lib/priority-presentation'
import { type RegisterFilters } from '@/lib/register-reference'
import { cn } from '@/lib/utils'
import type { PriorityItemOut } from '@/types/api'

/** A full worklist, not a teaser - real server pagination, never the whole
 * pathway fetched and sliced client-side. */
const DEFAULT_PAGE_SIZE = 10
const MIN_PAGE_SIZE = 4
const MAX_PAGE_SIZE = 25

/** Rough rendered heights, in rem, of one table row and of the header row. */
const ROW_REM = 3.3
const HEAD_REM = 3

function rootFontPx(): number {
  return Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
}

type PathwayType = 'preventive' | 'restoration'

function isPathwayType(value: string | null): value is PathwayType {
  return value === 'preventive' || value === 'restoration'
}

function PathwayTabs({
  pathway,
  onChange,
}: {
  pathway: PathwayType
  onChange: (next: PathwayType) => void
}) {
  const { t } = useI18n()
  return (
    <div
      role="radiogroup"
      aria-label={t('priority.tabs.label')}
      className="mg-glass mg-glass-static inline-flex overflow-hidden !rounded-xl"
    >
      {(['preventive', 'restoration'] as const).map((value) => {
        const active = pathway === value
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => {
              onChange(value)
            }}
            className={cn(
              'h-10 px-4 text-mg-body-sm font-medium transition-colors pointer-coarse:h-11',
              active
                ? 'bg-primary font-semibold text-primary-foreground'
                : 'text-foreground hover:bg-accent',
            )}
          >
            {t(value === 'preventive' ? 'overview.preventive.title' : 'overview.restoration.title')}
          </button>
        )
      })}
    </div>
  )
}

function WhyPrioritizedCell({ reasons }: { reasons: readonly string[] }) {
  const { t } = useI18n()
  const reasonLabel = (reason: string) => {
    const key = whyReasonLabelKey(reason)
    return key === null ? reason : t(key)
  }
  const shown = reasons.slice(0, 1)
  const extra = reasons.length - shown.length
  return (
    <div className="flex items-center gap-1.5">
      {shown.map((reason) => (
        <Badge key={reason} variant="outline" className="whitespace-nowrap text-mg-caption">
          {reasonLabel(reason)}
        </Badge>
      ))}
      {extra > 0 ? (
        <span
          className="inline-flex items-center text-mg-caption text-muted-foreground"
          title={reasons.slice(1).map((reason) => reasonLabel(reason)).join(', ')}
        >
          +{extra}
        </span>
      ) : null}
    </div>
  )
}

function ConditionCell({ item }: { item: PriorityItemOut }) {
  if (item.priority_type === 'preventive') {
    const tone = riskBandTone(item.risk_band)
    return (
      <div className="flex items-center gap-2 whitespace-nowrap">
        {tone !== null ? <SemanticChip kind="risk" tone={tone} /> : null}
        <span className="mg-figure text-mg-caption text-muted-foreground">
          {formatPercent(item.probability_non_functional)}
        </span>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-2">
      <ObservedStatusChip value={item.observed_status} />
    </div>
  )
}

/** The score, as the visual anchor of a row: the stored value as a
 * percentage-style figure, with a thin bar of the same value. The bar is
 * decorative; nothing is rescaled or re-ranked. */
function ScoreCell({ score }: { score: number | null }) {
  return (
    <div className="min-w-[4.5rem] space-y-1">
      <p className="mg-figure text-mg-body font-semibold text-foreground">{formatScorePercent(score)}</p>
      {score === null ? null : (
        <div aria-hidden="true" className="h-1 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-brand"
            style={{ width: `${Math.min(Math.max(score, 0), 1) * 100}%` }}
          />
        </div>
      )}
    </div>
  )
}

/**
 * The full Preventive/Restoration worklist - the real Priority destination
 * the Overview's cards and rows already deep-link to. One shared table
 * structure for both pathways (rank, water point, location, condition,
 * impact, priority score, why, action); only the "condition" column's
 * content and the explanatory copy differ per pathway, never the layout.
 * Ranking, score and eligibility are exactly the backend's own
 * `PriorityItemOut` fields - nothing is recomputed or re-ranked here. Each row
 * opens the water point's details in a drawer.
 */
export function PriorityRoute() {
  const { t } = useI18n()
  const [searchParams, setSearchParams] = useSearchParams()
  const { page, setPage } = usePageParam()
  const [selected, setSelected] = useState<PriorityItemOut | null>(null)
  const { ref: tableAreaRef, height: tableAreaHeight } = useElementSize<HTMLDivElement>()

  const pathway: PathwayType = isPathwayType(searchParams.get('type'))
    ? (searchParams.get('type') as PathwayType)
    : 'preventive'

  const filters: RegisterFilters = {
    region: searchParams.get('region'),
    status: null,
    district: searchParams.get('district'),
    ward: searchParams.get('ward'),
  }

  // The location filter lives in the shell's controls bubble and arrives as
  // URL parameters. A new location starts again from the first page.
  const scopeKey = `${filters.region ?? ''}|${filters.district ?? ''}|${filters.ward ?? ''}`
  const [lastScopeKey, setLastScopeKey] = useState(scopeKey)
  if (scopeKey !== lastScopeKey) {
    setLastScopeKey(scopeKey)
    setPage(1)
    setSelected(null)
  }

  // Fit the page: ask the backend for exactly as many rows as the available
  // height can show, so the table never needs scrolling on desktop. Small
  // screens keep a normal stacked layout with a fixed page size.
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  useEffect(() => {
    if (tableAreaHeight === 0 || !window.matchMedia('(min-width: 64rem)').matches) {
      return
    }
    const root = rootFontPx()
    const rows = Math.floor((tableAreaHeight - HEAD_REM * root) / (ROW_REM * root))
    setPageSize(Math.min(Math.max(rows, MIN_PAGE_SIZE), MAX_PAGE_SIZE))
  }, [tableAreaHeight])

  function setPathway(next: PathwayType) {
    const params = new URLSearchParams(searchParams)
    params.set('type', next)
    setSearchParams(params, { replace: true })
    setPage(1)
    setSelected(null)
  }

  const queryParams = {
    page,
    page_size: pageSize,
    nbs_region: filters.region,
    nbs_district: filters.district,
    nbs_ward: filters.ward,
  }
  // Both hooks are always called (Rules of Hooks), but only the visible
  // pathway fetches: half the requests. A pathway already seen stays cached.
  const preventiveQuery = usePreventivePriorityQuery(queryParams, {
    keepPrevious: true,
    enabled: pathway === 'preventive',
  })
  const restorationQuery = useRestorationPriorityQuery(queryParams, {
    keepPrevious: true,
    enabled: pathway === 'restoration',
  })
  const query = pathway === 'preventive' ? preventiveQuery : restorationQuery

  return (
    <div className="flex flex-col gap-3 lg:h-[calc(100dvh-5.5rem)] lg:min-h-[28rem]">
      <div className="flex flex-col items-start gap-1">
        <h1
          id="page-title"
          tabIndex={-1}
          className="flex min-h-9 items-center font-serif text-mg-title-lg font-semibold text-foreground"
        >
          {t('page.priority.title')}
        </h1>
        <PathwayTabs pathway={pathway} onChange={setPathway} />
      </div>

      <div ref={tableAreaRef} className="min-h-0 flex-1">
        {query.data === undefined && query.isPending ? (
          <LoadingState label={t('data.loading')} />
        ) : query.data === undefined ? (
          <FailureState error={query.error} onRetry={() => void query.refetch()} />
        ) : query.data.items.length === 0 ? (
          <EmptyState body={t('overview.list.empty')} />
        ) : (
          <DataTable
            className="max-h-full lg:overflow-y-hidden"
            captionHidden
            caption={t(pathway === 'preventive' ? 'overview.topPreventive.title' : 'overview.topRestoration.title')}
            columns={[
              { label: t('priority.column.rank') },
              { label: t('priority.column.waterPoint'), className: 'whitespace-nowrap' },
              { label: t('priority.column.location'), className: 'hidden sm:table-cell' },
              { label: t('priority.column.condition'), className: 'hidden whitespace-nowrap md:table-cell' },
              { label: t('priority.column.impact'), className: 'hidden whitespace-nowrap lg:table-cell' },
              { label: t('priority.column.priority'), className: 'whitespace-nowrap' },
              { label: t('priority.column.why'), className: 'hidden whitespace-nowrap 2xl:table-cell' },
              { label: t('priority.column.action'), className: 'hidden whitespace-nowrap min-[1800px]:table-cell' },
              { label: t('detail.open'), className: 'whitespace-nowrap text-end' },
            ]}
          >
            {query.data.items.map((item) => (
              <DataRow
                key={item.water_point_id}
                selected={selected?.water_point_id === item.water_point_id}
                className={priorityRowAccent(item)}
              >
                <DataCell>
                  <RankBadge rank={item.rank} />
                </DataCell>
                <DataCell className="mg-figure whitespace-nowrap font-medium">{item.master_id}</DataCell>
                <DataCell className="hidden max-w-[16rem] truncate whitespace-nowrap text-muted-foreground sm:table-cell">
                  {formatLocation(item)}
                </DataCell>
                <DataCell className="hidden whitespace-nowrap md:table-cell">
                  <ConditionCell item={item} />
                </DataCell>
                <DataCell className="mg-figure hidden whitespace-nowrap lg:table-cell">
                  <div className="flex items-center gap-2">
                    <span>{formatPercent(item.impact_score)}</span>
                    {item.impact_high === true ? <SemanticChip kind="impact" tone="high" /> : null}
                  </div>
                </DataCell>
                <DataCell>
                  <ScoreCell score={item.priority_score} />
                </DataCell>
                <DataCell className="hidden 2xl:table-cell">
                  <WhyPrioritizedCell reasons={item.why_prioritized} />
                </DataCell>
                <DataCell className="hidden whitespace-nowrap text-mg-caption text-muted-foreground min-[1800px]:table-cell">
                  {(() => {
                    const key = recommendedActionLabelKey(item.recommended_action)
                    return key === null ? item.recommended_action : t(key)
                  })()}
                </DataCell>
                <DataCell className="whitespace-nowrap text-end">
                  <Button
                    size="sm"
                    variant="outline"
                    aria-label={t('detail.openFor', { masterId: item.master_id })}
                    onClick={() => {
                      setSelected(item)
                    }}
                  >
                    {t('detail.open')}
                  </Button>
                </DataCell>
              </DataRow>
            ))}
          </DataTable>
        )}
      </div>

      <div className="flex h-[4.5rem] shrink-0 items-end overflow-hidden">
        {query.data !== undefined && query.data.items.length > 0 ? (
          <div className="w-full">
            <Pagination
              page={query.data.page}
              totalPages={query.data.total_pages}
              total={query.data.total}
              onPageChange={setPage}
              isFetching={query.isFetching}
            />
          </div>
        ) : null}
      </div>

      <InspectionDrawer
        id={selected?.water_point_id ?? null}
        priorityItem={selected}
        onClose={() => {
          setSelected(null)
        }}
      />
    </div>
  )
}
