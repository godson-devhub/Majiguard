import { Fragment, useCallback, useEffect, useId, useState } from 'react'
import { CircleSlash } from 'lucide-react'
import { Link, useSearchParams } from 'react-router'

import { useI18n } from '@/app/providers/locale-provider'
import { SectionPage, Pagination } from '@/app/shell/section-page'
import { AssessmentWorkspace } from '@/app/routes/assessment-workspace'
import { usePageParam } from '@/hooks/use-page-param'
import { InspectionDrawer } from '@/components/data/inspection-drawer'
import { MasterIdSearch } from '@/components/data/master-id-search'
import { EmptyState, FailureState, LoadingState } from '@/components/data/data-states'
import { DataCell, DataRow, DataTable } from '@/components/data/data-table'
import { WaterPointInspectionPanel } from '@/components/data/water-point-inspection-panel'
import { RegisterFilterBar } from '@/components/data/register-filter-bar'
import { formatNumber } from '@/components/data/format'
import { ObservedStatusChip } from '@/components/data/observed-status'
import { SemanticChip } from '@/components/status/semantic-chip'
import { impactFilterBand } from '@/lib/decision-map-filters'
import { useElementSize } from '@/hooks/use-element-size'
import type { MessageKey } from '@/i18n/messages'
import { observedStatusLabel } from '@/lib/status-labels'
import {
  useMapPointsAll,
  useProgressiveMapPoints,
  useWaterPointListQuery,
  useWaterPointQuery,
} from '@/hooks/water-points'
import {
  EMPTY_FILTERS,
  OBSERVED_STATUS_VALUES,
  type RegisterFilters,
} from '@/lib/register-reference'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import type { MapPointOut } from '@/types/api'

/* ------------------------------------------------------------------ *
 * The old Dashboard composition (KPI band, embedded map, coverage bar,
 * region chart) was replaced by OverviewRoute (Phase 4A.1) - the
 * decision-first Overview. See src/app/routes/overview-route.tsx.
 * ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ *
 * Water points â€” the register
 * ------------------------------------------------------------------ */

type Lens =
  | 'all'
  | `status:${string}`
  | 'fh'
  | 'fm'
  | 'fl'
  | 'fi'
  | 'fim'
  | 'fil'
  | 'ni'
  | 'nim'
  | 'nil'

const FOCUS_LENSES: { value: Lens; labelKey: MessageKey; status: string }[] = [
  { value: 'fh', labelKey: 'waterPoints.lens.fh', status: 'Functional' },
  { value: 'fm', labelKey: 'waterPoints.lens.fm', status: 'Functional' },
  { value: 'fl', labelKey: 'waterPoints.lens.fl', status: 'Functional' },
  { value: 'fi', labelKey: 'waterPoints.lens.fi', status: 'Functional' },
  { value: 'fim', labelKey: 'waterPoints.lens.fim', status: 'Functional' },
  { value: 'fil', labelKey: 'waterPoints.lens.fil', status: 'Functional' },
  { value: 'ni', labelKey: 'waterPoints.lens.ni', status: 'Non-Functional' },
  { value: 'nim', labelKey: 'waterPoints.lens.nim', status: 'Non-Functional' },
  { value: 'nil', labelKey: 'waterPoints.lens.nil', status: 'Non-Functional' },
]

/** Stored risk band / stored impact flag only - nothing is re-thresholded here. */
function matchesLens(point: MapPointOut, lens: Lens): boolean {
  switch (lens) {
    case 'fh':
      return riskBandTone(point.risk_band) === 'high'
    case 'fm':
      return riskBandTone(point.risk_band) === 'moderate'
    case 'fl':
      return riskBandTone(point.risk_band) === 'low'
    case 'fi':
    case 'ni':
      return impactFilterBand(point) === 'high'
    case 'fim':
    case 'nim':
      return impactFilterBand(point) === 'moderate'
    case 'fil':
    case 'nil':
      return impactFilterBand(point) === 'low'
    default:
      return true
  }
}

type RegisterRow = {
  id: number
  masterId: string
  location: string
  status: string | null
}

const WP_DEFAULT_PAGE_SIZE = 10
const WP_ROW_REM = 3.1
const WP_HEAD_REM = 3

export function WaterPointsRoute() {
  const { t } = useI18n()
  const [searchParams] = useSearchParams()
  const { page, setPage } = usePageParam()
  const [lens, setLens] = useState<Lens>('all')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  // A searched master ID: the table then shows only that water point.
  const [foundId, setFoundId] = useState<number | null>(null)
  const [searchMissed, setSearchMissed] = useState(false)
  const foundQuery = useWaterPointQuery(foundId)
  const handleResolve = useCallback((id: number | null) => {
    setFoundId(id)
    setSearchMissed(false)
  }, [])
  const handleNotFound = useCallback(() => {
    setFoundId(null)
    setSearchMissed(true)
  }, [])
  const { ref: areaRef, height: areaHeight } = useElementSize<HTMLDivElement>()

  const region = searchParams.get('region')
  const district = searchParams.get('district')
  const ward = searchParams.get('ward')

  // The location filter lives in the shell's controls bubble (URL parameters).
  const scopeKey = `${region ?? ''}|${district ?? ''}|${ward ?? ''}`
  const [lastScopeKey, setLastScopeKey] = useState(scopeKey)
  if (scopeKey !== lastScopeKey) {
    setLastScopeKey(scopeKey)
    setPage(1)
  }

  // Ask for exactly as many rows as the available height can show.
  const [pageSize, setPageSize] = useState(WP_DEFAULT_PAGE_SIZE)
  useEffect(() => {
    if (areaHeight === 0 || !window.matchMedia('(min-width: 64rem)').matches) {
      return
    }
    const root = Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
    const rows = Math.floor((areaHeight - WP_HEAD_REM * root) / (WP_ROW_REM * root))
    setPageSize(Math.min(Math.max(rows, 4), 25))
  }, [areaHeight])

  const focus = FOCUS_LENSES.find((entry) => entry.value === lens) ?? null
  const statusFilter = lens.startsWith('status:') ? lens.slice('status:'.length) : null

  // Plain register browsing (all / one observed status): real server paging.
  const listQuery = useWaterPointListQuery({
    page,
    page_size: pageSize,
    observed_status: statusFilter,
    nbs_region: region,
    nbs_district: district,
    nbs_ward: ward,
  })
  // Risk / impact lenses read stored map fields, so they use the map estate
  // for the chosen condition and filter it by the stored band or flag.
  const lensQuery = useProgressiveMapPoints(
    focus === null
      ? {}
      : { observed_status: focus.status, nbs_region: region, nbs_district: district, nbs_ward: ward },
    { enabled: focus !== null },
  )

  const locationOf = (parts: (string | null)[]) =>
    parts.filter((part): part is string => part !== null && part.length > 0).join(' · ')

  let rows: RegisterRow[] = []
  let total = 0
  let totalPages = 1
  let pending = false
  let failed: unknown = null
  let retry: () => void = () => undefined

  if (foundId !== null || searchMissed) {
    pending = foundId !== null && foundQuery.isPending
    failed = foundQuery.isError ? foundQuery.error : null
    retry = () => void foundQuery.refetch()
    if (foundQuery.data !== undefined && foundId !== null) {
      const point = foundQuery.data
      total = 1
      rows = [
        {
          id: point.id,
          masterId: point.master_id,
          location: locationOf([point.nbs_region, point.nbs_district, point.nbs_ward]),
          status: point.observed_status,
        },
      ]
    }
  } else if (focus === null) {
    pending = listQuery.isPending
    failed = listQuery.isError ? listQuery.error : null
    retry = () => void listQuery.refetch()
    if (listQuery.data !== undefined) {
      total = listQuery.data.total
      totalPages = listQuery.data.total_pages
      rows = listQuery.data.items.map((point) => ({
        id: point.id,
        masterId: point.master_id,
        location: locationOf([point.nbs_region, point.nbs_district, point.nbs_ward]),
        status: point.observed_status,
      }))
    }
  } else {
    pending = lensQuery.isPending
    failed = lensQuery.isError ? lensQuery.error : null
    retry = () => void lensQuery.refetch()
    if (lensQuery.data !== undefined) {
      const matched = lensQuery.data.items.filter((point) => matchesLens(point, lens))
      total = matched.length
      totalPages = Math.max(Math.ceil(matched.length / pageSize), 1)
      const start = (Math.min(page, totalPages) - 1) * pageSize
      rows = matched.slice(start, start + pageSize).map((point) => ({
        id: point.id,
        masterId: point.master_id,
        location: locationOf([point.nbs_region, point.nbs_district, point.nbs_ward]),
        status: point.observed_status,
      }))
    }
  }
  const currentPage = Math.min(page, totalPages)

  return (
    <div className="flex flex-col gap-3 lg:h-[calc(100dvh-5.5rem)] lg:min-h-[28rem]">
      <MasterIdSearch
        pill
        onResolve={handleResolve}
        onNotFound={handleNotFound} className="mx-auto w-full max-w-xl space-y-1"
      />

      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div>
          <h1
            id="page-title"
            tabIndex={-1}
            className="font-serif text-mg-title-lg font-semibold text-foreground"
          >
            {t('page.waterPoints.title')}
          </h1>
          <p className="text-mg-body-sm text-muted-foreground">{t('page.waterPoints.body')}</p>
        </div>
        <label className="flex flex-col gap-1 text-mg-caption font-semibold text-muted-foreground">
          {t('data.column.observedStatus')}
          <select
            value={lens}
            onChange={(event) => {
              setLens(event.target.value as Lens)
              setPage(1)
            }}
            className="mg-glass mg-glass-static h-10 min-w-[16rem] !rounded-xl px-3 text-mg-body-sm font-medium text-foreground"
          >
            <option value="all">{t('waterPoints.lens.all')}</option>
            <optgroup label={t('data.column.observedStatus')}>
              {OBSERVED_STATUS_VALUES.map((status) => (
                <option key={status} value={`status:${status}`}>
                  {observedStatusLabel(status, t)}
                </option>
              ))}
            </optgroup>
            <optgroup label={t('waterPoints.lens.group')}>
              {FOCUS_LENSES.map((entry) => (
                <option key={entry.value} value={entry.value}>
                  {t(entry.labelKey)}
                </option>
              ))}
            </optgroup>
          </select>
        </label>
      </div>

      <div ref={areaRef} className="min-h-0 flex-1">
        {pending && rows.length === 0 ? (
          <LoadingState label={t('data.loading')} />
        ) : failed !== null && rows.length === 0 ? (
          <FailureState error={failed} onRetry={retry} />
        ) : rows.length === 0 ? (
          <EmptyState />
        ) : (
          <DataTable
            className="max-h-full lg:overflow-y-hidden"
            captionHidden
            caption={t('waterPoints.table.caption')}
            columns={[
              { label: t('data.column.masterId'), className: 'whitespace-nowrap' },
              { label: t('priority.column.location'), className: 'hidden whitespace-nowrap sm:table-cell' },
              { label: t('data.column.observedStatus'), className: 'whitespace-nowrap' },
              { label: t('detail.open'), className: 'whitespace-nowrap text-end' },
            ]}
          >
            {rows.map((row) => (
              <DataRow key={row.id} selected={row.id === selectedId}>
                <DataCell className="mg-figure whitespace-nowrap font-medium">{row.masterId}</DataCell>
                <DataCell className="hidden whitespace-nowrap text-muted-foreground sm:table-cell">
                  {row.location.length > 0 ? row.location : t('data.notRecorded')}
                </DataCell>
                <DataCell className="whitespace-nowrap">
                  <ObservedStatusChip value={row.status} />
                </DataCell>
                <DataCell className="whitespace-nowrap text-end">
                  <Button
                    size="sm"
                    variant="outline"
                    aria-label={t('detail.openFor', { masterId: row.masterId })}
                    onClick={() => {
                      setSelectedId(row.id)
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
        {rows.length > 0 && foundId === null ? (
          <div className="w-full">
            <Pagination
              page={currentPage}
              totalPages={totalPages}
              total={total}
              isFetching={focus === null ? listQuery.isFetching : lensQuery.isFetching}
              onPageChange={setPage}
            />
          </div>
        ) : null}
      </div>

      <InspectionDrawer
        id={selectedId}
        onClose={() => {
          setSelectedId(null)
        }}
      />
    </div>
  )
}

/* ------------------------------------------------------------------ *
 * Risk — national worklist
 * ------------------------------------------------------------------ */

type RiskFilterValue = 'all' | 'high' | 'moderate' | 'low' | 'notAssessed'

const RISK_WORKLIST_PAGE_SIZE = 50

/**
 * Maps the frozen ML methodology's own `risk_band` vocabulary
 * (majiguard_ml/predict.py) onto the three SemanticChip risk tones â€” the same
 * mapping `WaterPointInspectionPanel`'s `RiskSection` uses. An unrecognised
 * band stays neutral rather than being guessed into a tone.
 */
function riskBandTone(riskBand: string | null): 'low' | 'moderate' | 'high' | null {
  if (riskBand === 'Functional') {
    return 'low'
  }
  if (riskBand === 'Non-Functional / Moderate Risk') {
    return 'moderate'
  }
  if (riskBand === 'Non-Functional / High Risk') {
    return 'high'
  }
  return null
}

function matchesRiskFilter(point: MapPointOut, filter: RiskFilterValue): boolean {
  if (filter === 'all') {
    return true
  }
  const assessed = point.probability_non_functional !== null
  if (filter === 'notAssessed') {
    return !assessed
  }
  return assessed && riskBandTone(point.risk_band) === filter
}

/**
 * Assessed points first, ordered by the backend's own probability of
 * non-functionality, highest first; not-assessed points keep their relative
 * order and always sort after every assessed point, never interleaved.
 */
function sortWorklist(items: MapPointOut[]): MapPointOut[] {
  return [...items].sort((a, b) => {
    const left = a.probability_non_functional
    const right = b.probability_non_functional
    if (left === null && right === null) {
      return 0
    }
    if (left === null) {
      return 1
    }
    if (right === null) {
      return -1
    }
    return right - left
  })
}

/** The Risk column: a not-assessed badge, the band chip, or the raw band text. */
function RiskBandCell({ point }: { point: MapPointOut }) {
  const { t } = useI18n()

  if (point.probability_non_functional === null) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-sm border border-dashed border-border-strong bg-muted px-2 py-1 text-mg-label text-muted-foreground">
        <CircleSlash aria-hidden="true" className="size-3.5 shrink-0" />
        {t('risk.notAssessed')}
      </span>
    )
  }

  const tone = riskBandTone(point.risk_band)
  if (tone !== null) {
    return <SemanticChip kind="risk" tone={tone} />
  }

  return (
    <span className="rounded-sm border border-border bg-muted px-2 py-1 text-mg-caption text-foreground">
      {point.risk_band ?? t('data.notRecorded')}
    </span>
  )
}

/**
 * The risk worklist: the register's Region/District/Ward/observed-status
 * filters plus a Risk filter, over the same `useMapPointsAll` estate the
 * dashboard map uses. Risk is read verbatim from `risk_band` and
 * `probability_non_functional` â€” no threshold is computed here. Selecting a
 * row opens the existing single-point inspection panel; this route adds no
 * second detail view.
 */
export function RiskRoute() {
  const { t } = useI18n()
  const riskFilterId = useId()
  const { page, setPage } = usePageParam()
  const [filters, setFilters] = useState<RegisterFilters>(EMPTY_FILTERS)
  const [riskFilter, setRiskFilter] = useState<RiskFilterValue>('all')
  const [selectedId, setSelectedId] = useState<number | null>(null)

  const mapPoints = useMapPointsAll({
    observed_status: filters.status,
    nbs_region: filters.region,
    nbs_district: filters.district,
    nbs_ward: filters.ward,
  })

  function applyFilters(next: RegisterFilters) {
    setFilters(next)
    setPage(1)
  }

  function applyRiskFilter(next: RiskFilterValue) {
    setRiskFilter(next)
    setPage(1)
  }

  const worklist = mapPoints.isSuccess
    ? sortWorklist(mapPoints.data.items.filter((point) => matchesRiskFilter(point, riskFilter)))
    : []
  // Only mark the assessed/not-assessed boundary when both groups can appear
  // together â€” a risk-band filter already narrows the list to one group.
  const notAssessedStart =
    riskFilter === 'all'
      ? worklist.findIndex((point) => point.probability_non_functional === null)
      : -1

  const totalPages = Math.max(Math.ceil(worklist.length / RISK_WORKLIST_PAGE_SIZE), 1)
  const safePage = Math.min(page, totalPages)
  const pageStart = (safePage - 1) * RISK_WORKLIST_PAGE_SIZE
  const pageItems = worklist.slice(pageStart, pageStart + RISK_WORKLIST_PAGE_SIZE)

  return (
    <SectionPage
      titleKey="page.risk.title"
      descriptionKey="page.risk.body"
      eyebrowKey="page.risk.eyebrow"
      sourceNote={t('data.source')}
      toolbar={
        <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
          <RegisterFilterBar value={filters} onChange={applyFilters} />
          <div className="flex flex-col gap-1">
            <Label
              htmlFor={riskFilterId}
              className="text-mg-caption font-medium text-muted-foreground"
            >
              {t('filters.risk')}
            </Label>
            <select
              id={riskFilterId}
              value={riskFilter}
              onChange={(event) => {
                applyRiskFilter(event.target.value as RiskFilterValue)
              }}
              className="h-9 min-w-[10rem] rounded-sm border border-input bg-background px-2.5 text-mg-body-sm text-foreground"
            >
              <option value="all">{t('filters.allRisk')}</option>
              <option value="high">{t('risk.high')}</option>
              <option value="moderate">{t('risk.moderate')}</option>
              <option value="low">{t('risk.low')}</option>
              <option value="notAssessed">{t('risk.notAssessed')}</option>
            </select>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        <WaterPointInspectionPanel
          id={selectedId}
          mapPoint={mapPoints.data?.items.find((point) => point.id === selectedId) ?? null}
        />

        {mapPoints.isPending ? (
          <LoadingState label={t('data.loading')} />
        ) : mapPoints.isError ? (
          <FailureState error={mapPoints.error} onRetry={() => void mapPoints.refetch()} />
        ) : worklist.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <DataTable
              caption={t('risk.worklist.caption')}
              columns={[
                { label: t('data.column.masterId') },
                { label: t('data.column.region') },
                { label: t('data.column.district'), className: 'hidden md:table-cell' },
                { label: t('data.column.ward'), className: 'hidden lg:table-cell' },
                { label: t('data.column.observedStatus') },
                { label: t('data.column.riskBand') },
                {
                  label: t('data.column.probabilityNonFunctional'),
                  className: 'hidden sm:table-cell',
                },
              ]}
            >
              {pageItems.map((point, index) => (
                <Fragment key={point.id}>
                  {pageStart + index === notAssessedStart ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="border-b border-border/60 bg-muted px-4 py-2 text-mg-label font-semibold uppercase tracking-wider text-muted-foreground"
                      >
                        {t('risk.notAssessed')}
                      </td>
                    </tr>
                  ) : null}
                  <DataRow selected={point.id === selectedId}>
                    <DataCell>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedId(point.id)
                        }}
                        aria-pressed={point.id === selectedId}
                        className="mg-figure rounded-xs text-start font-medium text-primary underline-offset-2 hover:underline"
                      >
                        {point.master_id}
                      </button>
                    </DataCell>
                    <DataCell>{point.nbs_region ?? t('data.notRecorded')}</DataCell>
                    <DataCell className="hidden md:table-cell">
                      {point.nbs_district ?? t('data.notRecorded')}
                    </DataCell>
                    <DataCell className="hidden lg:table-cell">
                      {point.nbs_ward ?? t('data.notRecorded')}
                    </DataCell>
                    <DataCell>
                      <ObservedStatusChip value={point.observed_status} />
                    </DataCell>
                    <DataCell>
                      <RiskBandCell point={point} />
                    </DataCell>
                    <DataCell className="mg-figure hidden sm:table-cell">
                      {formatNumber(point.probability_non_functional)}
                    </DataCell>
                  </DataRow>
                </Fragment>
              ))}
            </DataTable>

            <Pagination
              page={safePage}
              totalPages={totalPages}
              total={worklist.length}
              isFetching={mapPoints.isFetching}
              onPageChange={setPage}
            />
          </>
        )}
      </div>
    </SectionPage>
  )
}

export function ImpactRoute() {
  return (
    <AssessmentWorkspace
      titleKey="page.impact.title"
      bodyKey="page.impact.body"
      eyebrowKey="page.impact.eyebrow"
    />
  )
}

export function NotFoundRoute() {
  const { t } = useI18n()

  return (
    <div className="space-y-6">
      <h1
        id="page-title"
        tabIndex={-1}
        className="text-mg-display font-semibold tracking-tight text-foreground"
      >
        {t('page.notFound.title')}
      </h1>
      <p className="max-w-[68ch] text-mg-body text-muted-foreground">
        {t('page.notFound.body')}
      </p>
      <Button nativeButton={false} render={<Link to="/dashboard" />}>{t('page.notFound.action')}</Button>
    </div>
  )
}

