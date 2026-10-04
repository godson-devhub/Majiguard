import { useMemo, useState } from 'react'

import { useDecisionMapFilterState } from '@/app/providers/decision-map-filter-provider'
import { useI18n } from '@/app/providers/locale-provider'
import { SectionPage } from '@/app/shell/section-page'
import { EmptyState, FailureState, LoadingState } from '@/components/data/data-states'
import { RegisterFilterBar } from '@/components/data/register-filter-bar'
import { WaterPointInspectionPanel } from '@/components/data/water-point-inspection-panel'
import { DecisionMapFilters } from '@/components/map/decision-map-filters'
import { WaterPointMap } from '@/components/map/water-point-map'
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

/**
 * The national Decision Map - the real, interactive Tanzania basemap
 * (`WaterPointMap`, built for this exact purpose but not previously wired
 * into a route). Region/District/Ward filtering reuses the same
 * `RegisterFilterBar` component as the Priority page and Overview, so the
 * screens share one filter *component*; the selected values themselves live
 * in `DecisionMapFilterProvider` (not the URL, unlike Overview/Priority),
 * so they survive navigating away and back - see that provider's own
 * docstring for why. Selecting a marker renders that water point's full
 * inspection panel below the map - the same component the Risk/Impact
 * assessment workspaces already use - rather than a second, bespoke detail
 * view.
 */
export function DecisionMapRoute() {
  const { t } = useI18n()
  const { state, setLocation, setMapFilters, setLayer } = useDecisionMapFilterState()
  const [selectedId, setSelectedId] = useState<number | null>(null)

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

  // Client-side filter over the already-fetched, complete estate - never a
  // second request and never a recomputed classification: every field read
  // here (`observed_status`, `risk_band`, `impact_score`/`impact_high`,
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

  return (
    <SectionPage
      titleKey="page.decisionMap.title"
      descriptionKey="page.decisionMap.body"
      eyebrowKey="page.decisionMap.eyebrow"
      sourceNote={t('data.source')}
    >
      <div className="space-y-5">
        <div className="space-y-3">
          <RegisterFilterBar value={filters} onChange={setFilters} showStatus={false} />
          <DecisionMapFilters value={mapFilters} onChange={setMapFilters} />
        </div>

        {query.isPending ? (
          <LoadingState label={t('map.loading')} />
        ) : query.isError ? (
          <FailureState error={query.error} onRetry={() => void query.refetch()} />
        ) : visiblePoints.length === 0 ? (
          <EmptyState body={t('overview.list.empty')} />
        ) : (
          <WaterPointMap
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
            isLoadingMore={isLoadingMore}
          />
        )}

        {selectedId !== null ? (
          <section aria-labelledby="map-selected-heading" className="space-y-3">
            <h2 id="map-selected-heading" className="text-mg-title-md font-semibold text-foreground">
              {t('map.selected.title')}
            </h2>
            <WaterPointInspectionPanel id={selectedId} mapPoint={selectedMapPoint} />
          </section>
        ) : null}
      </div>
    </SectionPage>
  )
}
