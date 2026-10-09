import { SlidersHorizontal, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { useDecisionMapFilterState } from '@/app/providers/decision-map-filter-provider'
import { useI18n } from '@/app/providers/locale-provider'
import { SectionPage } from '@/app/shell/section-page'
import { EmptyState, FailureState, LoadingState } from '@/components/data/data-states'
import { FilterChip } from '@/components/data/filter-controls'
import { formatNumber } from '@/components/data/format'
import { InspectionDrawer } from '@/components/data/inspection-drawer'
import { RegisterFilterBar } from '@/components/data/register-filter-bar'
import { WaterPointInspectionPanel } from '@/components/data/water-point-inspection-panel'
import { DecisionMapFilters } from '@/components/map/decision-map-filters'
import { WaterPointMap } from '@/components/map/water-point-map'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useMediaQuery } from '@/hooks/use-media-query'
import { useProgressiveMapPoints } from '@/hooks/water-points'
import { applyDecisionMapFilters } from '@/lib/decision-map-filters'
import type { MessageKey } from '@/i18n/messages'
import { scopeLabel } from '@/lib/priority-presentation'
import { type RegisterFilters } from '@/lib/register-reference'

const CONDITION_NOTE_KEYS: Record<'functional' | 'nonfunctional', MessageKey> = {
  functional: 'map.filter.condition.functional',
  nonfunctional: 'map.filter.condition.nonfunctional',
}
const RISK_NOTE_KEYS: Record<'low' | 'moderate' | 'high', MessageKey> = {
  low: 'map.filter.risk.low',
  moderate: 'map.filter.risk.medium',
  high: 'map.filter.risk.high',
}
const IMPACT_NOTE_KEYS: Record<'low' | 'moderate' | 'high', MessageKey> = {
  low: 'map.filter.impact.low',
  moderate: 'map.filter.impact.medium',
  high: 'map.filter.impact.high',
}

/** The map and the docked inspection panel share one height: the viewport
 * below the header, page title and toolbar, never less than 30rem. */
const MAP_HEIGHT = 'h-[max(30rem,calc(100dvh-17rem))]'

/**
 * The national Decision Map - the real, interactive Tanzania basemap
 * (`WaterPointMap`). The map is the dominant surface: one slim toolbar holds
 * the Filters panel, the active-filter chips and the load status, the layers
 * and legend sit on the map itself, and a selected water point opens in a
 * docked panel beside the map (wide screens) or a bottom sheet (below `lg`).
 *
 * Region/District/Ward filtering reuses the same `RegisterFilterBar` component
 * as the Priority page and Overview, so the screens share one filter
 * *component*; the selected values themselves live in
 * `DecisionMapFilterProvider` (not the URL, unlike Overview/Priority), so they
 * survive navigating away and back - see that provider's own docstring for why.
 * Filtering is client-side over the progressively loaded estate: no second
 * request, and every field read is the backend's own stored value.
 */
export function DecisionMapRoute() {
  const { t } = useI18n()
  const { state, setLocation, setMapFilters, setLayer } = useDecisionMapFilterState()
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const wide = useMediaQuery('(min-width: 64rem)')

  const filters = state.location
  const mapFilters = state.mapFilters
  const layer = state.layer

  function setFilters(next: RegisterFilters) {
    setLocation(next)
    setSelectedId(null)
  }

  // The map's boundary layer lets a user click a Region/District/Ward
  // polygon as a shortcut for the same filter the dropdowns set - never a
  // second, independent filtering path.
  function selectRegionOnMap(region: string) {
    setFilters({ region, status: null, district: null, ward: null })
  }
  function selectDistrictOnMap(region: string, district: string) {
    setFilters({ region, status: null, district, ward: null })
  }
  function selectWardOnMap(region: string, district: string, ward: string) {
    setFilters({ region, status: null, district, ward })
  }

  const query = useProgressiveMapPoints({
    nbs_region: filters.region,
    nbs_district: filters.district,
    nbs_ward: filters.ward,
  })
  // True once page 1 has rendered but more pages are still arriving in the
  // background - never blocks the map, only an honest "still loading" note.
  const isLoadingMore = query.isFetching && !query.isPending
  const loadedCount = query.data?.items.length ?? 0
  const registerTotal = query.data?.total ?? 0

  // Client-side filter over the already-fetched estate - never a second
  // request and never a recomputed classification: every field read here
  // (`observed_status`, `risk_band`, `impact_score`/`impact_high`,
  // `*_priority_eligible`) is the backend's own stored value.
  const visiblePoints = useMemo(
    () => applyDecisionMapFilters(query.data?.items ?? [], mapFilters),
    [query.data, mapFilters],
  )

  const activeFilterNotes = [
    mapFilters.condition !== 'all' ? t(CONDITION_NOTE_KEYS[mapFilters.condition]) : null,
    mapFilters.risk !== 'all' ? t(RISK_NOTE_KEYS[mapFilters.risk]) : null,
    mapFilters.impact !== 'all' ? t(IMPACT_NOTE_KEYS[mapFilters.impact]) : null,
    mapFilters.priorityView ? t('map.filter.priorityView') : null,
  ].filter((note): note is string => note !== null)

  const filterLabel =
    activeFilterNotes.length > 0
      ? `${scopeLabel(filters, t)} · ${activeFilterNotes.join(' · ')}`
      : scopeLabel(filters, t)

  const selectedMapPoint = useMemo(
    () => (selectedId === null ? null : (query.data?.items.find((point) => point.id === selectedId) ?? null)),
    [query.data, selectedId],
  )

  // Active filters as removable chips. Removing one only edits the same state
  // the Filters panel edits.
  const chips: { key: string; label: string; clear: () => void }[] = []
  if (filters.region !== null) {
    chips.push({
      key: 'region',
      label: `${t('filters.region')}: ${filters.region}`,
      clear: () => {
        setFilters({ region: null, status: null, district: null, ward: null })
      },
    })
  }
  if (filters.district) {
    chips.push({
      key: 'district',
      label: `${t('filters.district')}: ${filters.district}`,
      clear: () => {
        setFilters({ ...filters, district: null, ward: null })
      },
    })
  }
  if (filters.ward) {
    chips.push({
      key: 'ward',
      label: `${t('filters.ward')}: ${filters.ward}`,
      clear: () => {
        setFilters({ ...filters, ward: null })
      },
    })
  }
  if (mapFilters.condition !== 'all') {
    chips.push({
      key: 'condition',
      label: `${t('map.filter.condition')}: ${t(CONDITION_NOTE_KEYS[mapFilters.condition])}`,
      clear: () => {
        setMapFilters({ ...mapFilters, condition: 'all' })
      },
    })
  }
  if (mapFilters.risk !== 'all') {
    chips.push({
      key: 'risk',
      label: `${t('map.filter.risk')}: ${t(RISK_NOTE_KEYS[mapFilters.risk])}`,
      clear: () => {
        setMapFilters({ ...mapFilters, risk: 'all' })
      },
    })
  }
  if (mapFilters.impact !== 'all') {
    chips.push({
      key: 'impact',
      label: `${t('map.filter.impact')}: ${t(IMPACT_NOTE_KEYS[mapFilters.impact])}`,
      clear: () => {
        setMapFilters({ ...mapFilters, impact: 'all' })
      },
    })
  }
  if (mapFilters.priorityView) {
    chips.push({
      key: 'priorityView',
      label: t('map.filter.priorityView'),
      clear: () => {
        setMapFilters({ ...mapFilters, priorityView: false })
      },
    })
  }

  const [maximized, setMaximized] = useState(false)
  useEffect(() => {
    if (!maximized) {
      return
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setMaximized(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
    }
  }, [maximized])

  // While maximised the map owns the whole screen, so details open in the sheet.
  const dockedPanel = wide && selectedId !== null && !maximized

  return (
    <SectionPage
      compact
      titleKey="page.decisionMap.title"
      descriptionKey="page.decisionMap.body"
      eyebrowKey="page.decisionMap.eyebrow"
      sourceNote={t('data.source')}
    >
      <div className="space-y-3">
        {/* One slim toolbar: filters, active chips, load status. */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <Popover>
            <PopoverTrigger render={<Button variant="outline" />}>
              <SlidersHorizontal aria-hidden="true" className="size-4" />
              {t('map.filtersButton')}
              {chips.length > 0 ? (
                <span className="mg-figure ms-1 rounded-full bg-primary px-1.5 text-mg-caption font-semibold text-primary-foreground">
                  {chips.length}
                </span>
              ) : null}
            </PopoverTrigger>
            <PopoverContent className="space-y-4">
              <p className="text-mg-body-sm font-semibold text-foreground">{t('map.filtersTitle')}</p>
              <RegisterFilterBar value={filters} onChange={setFilters} showStatus={false} stacked />
              <div className="border-t border-border pt-3">
                <p className="mb-2 text-mg-caption font-semibold uppercase tracking-wider text-muted-foreground">
                  {t('map.filter.refine')}
                </p>
                <DecisionMapFilters value={mapFilters} onChange={setMapFilters} />
              </div>
            </PopoverContent>
          </Popover>

          {chips.map((chip) => (
            <FilterChip
              key={chip.key}
              label={chip.label}
              removeLabel={t('filters.remove', { label: chip.label })}
              onRemove={chip.clear}
            />
          ))}

          <p aria-live="polite" className="ms-auto flex items-center gap-3 text-mg-caption text-muted-foreground">
            <span className="mg-figure">
              {t('map.pointsShown', { count: formatNumber(visiblePoints.length) })}
            </span>
            {isLoadingMore ? (
              <span className="flex items-center gap-2">
                <span className="mg-figure">
                  {t('map.loadedOfTotal', {
                    loaded: formatNumber(loadedCount),
                    total: formatNumber(registerTotal),
                  })}
                </span>
                <span aria-hidden="true" className="h-1 w-20 overflow-hidden rounded-full bg-muted">
                  <span
                    className="block h-full rounded-full bg-brand"
                    style={{ width: `${registerTotal > 0 ? Math.min((loadedCount / registerTotal) * 100, 100) : 0}%` }}
                  />
                </span>
              </span>
            ) : null}
          </p>
        </div>

        <div className="flex min-h-0 items-start gap-3">
          <div
            className={
              maximized
                ? 'fixed inset-0 z-50 bg-background p-2 sm:p-3'
                : 'min-w-0 flex-1'
            }
          >
            {query.isPending ? (
              <LoadingState label={t('map.loading')} />
            ) : query.isError ? (
              <FailureState error={query.error} onRetry={() => void query.refetch()} />
            ) : visiblePoints.length === 0 ? (
              <EmptyState body={t('overview.list.empty')} />
            ) : (
              <WaterPointMap
                className={maximized ? 'h-full' : MAP_HEIGHT}
                maximized={maximized}
                onToggleMaximize={() => {
                  setMaximized((current) => !current)
                }}
                points={visiblePoints}
                total={visiblePoints.length}
                filterLabel={filterLabel}
                selectedId={selectedId}
                onSelect={setSelectedId}
                layer={layer}
                onLayerChange={setLayer}
                boundaryFilters={filters}
                onSelectRegion={selectRegionOnMap}
                onSelectDistrict={selectDistrictOnMap}
                onSelectWard={selectWardOnMap}
              />
            )}
          </div>

          {dockedPanel ? (
            <aside
              aria-label={t('map.selected.title')}
              className={`w-[24rem] shrink-0 overflow-y-auto overscroll-contain mg-glass mg-glass-static ${MAP_HEIGHT}`}
            >
              <div className="sticky top-0 z-10 flex justify-end border-b border-border bg-card px-2 py-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedId(null)
                  }}
                >
                  <X aria-hidden="true" className="size-4" />
                  {t('map.inspection.close')}
                </Button>
              </div>
              <WaterPointInspectionPanel
                id={selectedId}
                mapPoint={selectedMapPoint}
                className="rounded-none border-0"
              />
            </aside>
          ) : null}
        </div>
      </div>

      {/* Below `lg` the details open in a bottom sheet instead. */}
      {wide && !maximized ? null : (
        <InspectionDrawer
          id={selectedId}
          mapPoint={selectedMapPoint}
          onClose={() => {
            setSelectedId(null)
          }}
        />
      )}
    </SectionPage>
  )
}
