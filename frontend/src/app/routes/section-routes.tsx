import { Fragment, useId, useState } from 'react'
import { CircleSlash, Settings } from 'lucide-react'
import { Link } from 'react-router'

import { useI18n } from '@/app/providers/locale-provider'
import { SectionPage, Pagination } from '@/app/shell/section-page'
import { AssessmentWorkspace } from '@/app/routes/assessment-workspace'
import { usePageParam } from '@/hooks/use-page-param'
import { StatePanel } from '@/components/data/state-panel'
import { EmptyState, FailureState, LoadingState } from '@/components/data/data-states'
import { DataCell, DataRow, DataTable } from '@/components/data/data-table'
import { WaterPointInspectionPanel } from '@/components/data/water-point-inspection-panel'
import { RegisterFilterBar } from '@/components/data/register-filter-bar'
import {
  formatCoordinatePair,
  formatDate,
  formatNumber,
} from '@/components/data/format'
import { ObservedStatusChip } from '@/components/data/observed-status'
import { SemanticChip } from '@/components/status/semantic-chip'
import { useMapPointsAll, useWaterPointListQuery } from '@/hooks/water-points'
import {
  EMPTY_FILTERS,
  type RegisterFilters,
} from '@/lib/register-reference'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import type { MapPointOut } from '@/types/api'

/**
 * Rows requested per page. The register rejects any `page_size` above 500, so
 * this stays well inside the contract and the page jump in `Pagination` is what
 * makes the deeper pages reachable.
 */
const PAGE_SIZE = 50

/* ------------------------------------------------------------------ *
 * The old Dashboard composition (KPI band, embedded map, coverage bar,
 * region chart) was replaced by OverviewRoute (Phase 4A.1) - the
 * decision-first Overview. See src/app/routes/overview-route.tsx.
 * ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ *
 * Water points â€” the register
 * ------------------------------------------------------------------ */

export function WaterPointsRoute() {
  const { t } = useI18n()
  const { page, setPage } = usePageParam()
  const [filters, setFilters] = useState<RegisterFilters>(EMPTY_FILTERS)
  const [selectedId, setSelectedId] = useState<number | null>(null)

  const query = useWaterPointListQuery({
    page,
    page_size: PAGE_SIZE,
    observed_status: filters.status,
    nbs_region: filters.region,
    nbs_district: filters.district,
    nbs_ward: filters.ward,
  })

  return (
    <SectionPage
      titleKey="page.waterPoints.title"
      descriptionKey="page.waterPoints.body"
      eyebrowKey="page.waterPoints.eyebrow"
      sourceNote={t('data.source')}
      toolbar={<RegisterFilterBar value={filters} onChange={setFilters} />}
    >
      <div className="space-y-5">
        <WaterPointInspectionPanel id={selectedId} />

        {query.isPending ? (
          <LoadingState label={t('data.loading')} />
        ) : query.isError ? (
          <FailureState error={query.error} onRetry={() => void query.refetch()} />
        ) : query.data.items.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <DataTable
              caption={t('waterPoints.table.caption')}
              columns={[
                { label: t('data.column.masterId') },
                { label: t('data.column.wpdxId'), className: 'hidden lg:table-cell' },
                { label: t('data.column.region') },
                { label: t('data.column.observedStatus') },
                { label: t('data.column.coordinates'), className: 'hidden md:table-cell' },
                { label: t('data.column.surveyDate'), className: 'hidden xl:table-cell' },
              ]}
            >
              {query.data.items.map((point) => (
                <DataRow key={point.id} selected={point.id === selectedId}>
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
                  <DataCell className="text-muted-foreground hidden lg:table-cell">
                    {point.wpdx_id}
                  </DataCell>
                  <DataCell>{point.nbs_region ?? t('data.notRecorded')}</DataCell>
                  <DataCell>
                    <ObservedStatusChip value={point.observed_status} />
                  </DataCell>
                  <DataCell className="mg-figure text-muted-foreground hidden md:table-cell">
                    {formatCoordinatePair(point.latitude, point.longitude)}
                  </DataCell>
                  <DataCell className="mg-figure text-muted-foreground hidden xl:table-cell">
                    {formatDate(point.survey_date)}
                  </DataCell>
                </DataRow>
              ))}
            </DataTable>

            <Pagination
              page={query.data.page}
              totalPages={query.data.total_pages}
              total={query.data.total}
              isFetching={query.isFetching}
              onPageChange={setPage}
            />
          </>
        )}
      </div>
    </SectionPage>
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

/* ------------------------------------------------------------------ *
 * Settings
 * ------------------------------------------------------------------ */

export function SettingsRoute() {
  const { t } = useI18n()

  return (
    <SectionPage
      titleKey="page.settings.title"
      descriptionKey="page.settings.body"
      eyebrowKey="page.settings.eyebrow"
    >
      <StatePanel
        icon={Settings}
        tone="neutral"
        title={t('page.pending.title')}
        description={t('page.pending.body')}
      >
        <p className="mt-3 text-mg-caption text-muted-foreground">{t('page.pending.note')}</p>
      </StatePanel>
    </SectionPage>
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
      <Button render={<Link to="/dashboard" />}>{t('page.notFound.action')}</Button>
    </div>
  )
}

