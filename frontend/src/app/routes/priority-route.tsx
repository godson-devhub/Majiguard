import { useSearchParams } from 'react-router'

import { useI18n } from '@/app/providers/locale-provider'
import { Pagination, SectionPage } from '@/app/shell/section-page'
import { DataCell, DataRow, DataTable } from '@/components/data/data-table'
import { EmptyState, FailureState, LoadingState } from '@/components/data/data-states'
import { formatPercent, formatScorePercent } from '@/components/data/format'
import { ObservedStatusChip } from '@/components/data/observed-status'
import { RankBadge } from '@/components/data/rank-badge'
import { RegisterFilterBar } from '@/components/data/register-filter-bar'
import { SemanticChip } from '@/components/status/semantic-chip'
import { Badge } from '@/components/ui/badge'
import { usePageParam } from '@/hooks/use-page-param'
import { usePreventivePriorityQuery, useRestorationPriorityQuery } from '@/hooks/priority'
import type { MessageKey } from '@/i18n/messages'
import { formatLocation, priorityRowAccent, riskBandTone } from '@/lib/priority-presentation'
import { type RegisterFilters } from '@/lib/register-reference'
import { cn } from '@/lib/utils'
import type { PriorityItemOut } from '@/types/api'

/** A full worklist, not a teaser - real server pagination, never the whole
 * pathway fetched and sliced client-side. */
const PAGE_SIZE = 25

type PathwayType = 'preventive' | 'restoration'

function isPathwayType(value: string | null): value is PathwayType {
  return value === 'preventive' || value === 'restoration'
}

/** The backend's fixed, small `why_prioritized` vocabulary (never free text),
 * mapped to translated labels. Any string not in this map still renders -
 * verbatim - rather than silently disappearing if the backend's wording ever
 * changes. */
const WHY_REASON_KEYS: Record<string, MessageKey> = {
  'high risk of non-functionality': 'priority.why.highRisk',
  'observed non-functional': 'priority.why.observedNonFunctional',
  'high relative community impact': 'priority.why.highImpact',
  'high population exposure component': 'priority.why.populationExposure',
  'limited nearby water-point alternatives': 'priority.why.limitedAlternatives',
}

/** The backend's fixed `recommended_action` enum, mapped to translated,
 * human-readable labels - the raw snake_case value never reaches the UI. */
const RECOMMENDED_ACTION_KEYS: Record<string, MessageKey> = {
  preventive_maintenance_assessment: 'priority.action.preventiveMaintenance',
  priority_restoration_assessment: 'priority.action.restorationAssessment',
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
      className="inline-flex overflow-hidden rounded-md border border-border bg-card"
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
              'px-4 py-2 text-mg-body-sm font-medium transition-colors',
              active
                ? 'bg-primary text-primary-foreground'
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
  return (
    <div className="flex max-w-[22rem] flex-wrap gap-1">
      {reasons.map((reason) => (
        <Badge key={reason} variant="outline" className="whitespace-nowrap text-mg-caption">
          {t(WHY_REASON_KEYS[reason] ?? (reason as MessageKey))}
        </Badge>
      ))}
    </div>
  )
}

function ConditionCell({ item }: { item: PriorityItemOut }) {
  if (item.priority_type === 'preventive') {
    const tone = riskBandTone(item.risk_band)
    return (
      <div className="flex flex-wrap items-center gap-2">
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

/**
 * The full Preventive/Restoration worklist - the real Priority destination
 * the Overview's cards and rows already deep-link to. One shared table
 * structure for both pathways (rank, water point, location, condition,
 * impact, priority score, why, action); only the "condition" column's
 * content and the explanatory copy differ per pathway, never the layout.
 * Ranking, score and eligibility are exactly the backend's own
 * `PriorityItemOut` fields - nothing is recomputed or re-ranked here.
 */
export function PriorityRoute() {
  const { t } = useI18n()
  const [searchParams, setSearchParams] = useSearchParams()
  const { page, setPage } = usePageParam()

  const pathway: PathwayType = isPathwayType(searchParams.get('type'))
    ? (searchParams.get('type') as PathwayType)
    : 'preventive'

  const filters: RegisterFilters = {
    region: searchParams.get('region'),
    status: null,
    district: searchParams.get('district'),
    ward: searchParams.get('ward'),
  }

  function setPathway(next: PathwayType) {
    const params = new URLSearchParams(searchParams)
    params.set('type', next)
    setSearchParams(params, { replace: true })
    setPage(1)
  }

  function setFilters(next: RegisterFilters) {
    const params = new URLSearchParams()
    params.set('type', pathway)
    if (next.region !== null) {
      params.set('region', next.region)
    }
    if (next.district) {
      params.set('district', next.district)
    }
    if (next.ward) {
      params.set('ward', next.ward)
    }
    setSearchParams(params, { replace: true })
    setPage(1)
  }

  const queryParams = {
    page,
    page_size: PAGE_SIZE,
    nbs_region: filters.region,
    nbs_district: filters.district,
    nbs_ward: filters.ward,
  }
  // Both hooks are always called (required by the Rules of Hooks); only the
  // active pathway's query is actually read below, so switching tabs never
  // discards the other pathway's cached page.
  const preventiveQuery = usePreventivePriorityQuery(queryParams)
  const restorationQuery = useRestorationPriorityQuery(queryParams)
  const query = pathway === 'preventive' ? preventiveQuery : restorationQuery

  const descriptionKey: MessageKey =
    pathway === 'preventive' ? 'overview.preventive.description' : 'overview.restoration.description'

  return (
    <SectionPage
      titleKey="page.priority.title"
      descriptionKey={descriptionKey}
      eyebrowKey="page.priority.eyebrow"
      sourceNote={t('data.source')}
    >
      <div className="space-y-5">
        <PathwayTabs pathway={pathway} onChange={setPathway} />

        <p className="max-w-[72ch] text-mg-caption text-muted-foreground">
          {t('priority.conceptsNote')}
        </p>

        <RegisterFilterBar value={filters} onChange={setFilters} showStatus={false} />

        {query.isPending ? (
          <LoadingState label={t('data.loading')} />
        ) : query.isError ? (
          <FailureState error={query.error} onRetry={() => void query.refetch()} />
        ) : query.data.items.length === 0 ? (
          <EmptyState body={t('overview.list.empty')} />
        ) : (
          <div className="space-y-4">
            <DataTable
              caption={t(pathway === 'preventive' ? 'overview.topPreventive.title' : 'overview.topRestoration.title')}
              columns={[
                { label: t('priority.column.rank') },
                { label: t('priority.column.waterPoint') },
                { label: t('priority.column.location'), className: 'hidden sm:table-cell' },
                { label: t('priority.column.condition') },
                { label: t('priority.column.impact') },
                { label: t('priority.column.priority') },
                { label: t('priority.column.why'), className: 'hidden lg:table-cell' },
                { label: t('priority.column.action'), className: 'hidden md:table-cell' },
              ]}
            >
              {query.data.items.map((item) => (
                <DataRow key={item.water_point_id} className={priorityRowAccent(item)}>
                  <DataCell>
                    <RankBadge rank={item.rank} />
                  </DataCell>
                  <DataCell className="mg-figure font-medium">{item.master_id}</DataCell>
                  <DataCell className="hidden text-muted-foreground sm:table-cell">
                    {formatLocation(item)}
                  </DataCell>
                  <DataCell>
                    <ConditionCell item={item} />
                  </DataCell>
                  <DataCell className="mg-figure">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span>{formatPercent(item.impact_score)}</span>
                      {item.impact_high === true ? <SemanticChip kind="impact" tone="high" /> : null}
                    </div>
                  </DataCell>
                  <DataCell className="mg-figure font-semibold">
                    {formatScorePercent(item.priority_score)}
                  </DataCell>
                  <DataCell className="hidden lg:table-cell">
                    <WhyPrioritizedCell reasons={item.why_prioritized} />
                  </DataCell>
                  <DataCell className="hidden text-mg-caption text-muted-foreground md:table-cell">
                    {t(RECOMMENDED_ACTION_KEYS[item.recommended_action] ?? (item.recommended_action as MessageKey))}
                  </DataCell>
                </DataRow>
              ))}
            </DataTable>

            <Pagination
              page={query.data.page}
              totalPages={query.data.total_pages}
              total={query.data.total}
              onPageChange={setPage}
              isFetching={query.isFetching}
            />
          </div>
        )}
      </div>
    </SectionPage>
  )
}
