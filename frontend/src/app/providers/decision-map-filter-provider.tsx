import { createContext, use, useCallback, useMemo, useState, type ReactNode } from 'react'

import type { MapLayerId } from '@/components/map/map-layers'
import { DEFAULT_DECISION_MAP_FILTERS, type DecisionMapFilterState } from '@/lib/decision-map-filters'
import { EMPTY_FILTERS, type RegisterFilters } from '@/lib/register-reference'

/**
 * Decision Map's full filter selection - Region/District/Ward,
 * Condition/Risk/Impact/Priority-view, and the active data layer (whose
 * options include the Preventive-priority and Restoration-priority views) -
 * lifted above the route (mounted once in `main.tsx`, the same pattern as
 * `ThemeProvider`/`LocaleProvider`) so it survives leaving the page and
 * coming back (e.g. via the sidebar to Analytics and back) within the same
 * session.
 *
 * This is the one and only place this state lives: `DecisionMapRoute` reads
 * and writes it exclusively, with no parallel URL or local-component copy of
 * the same fields. It resets on a full page reload (fresh module state,
 * same as every other in-memory provider here) - never written to
 * `localStorage`/`sessionStorage`, because only in-app navigation needs to
 * survive, not a browser session.
 */

const DEFAULT_LAYER: MapLayerId = 'condition'

export type DecisionMapState = {
  location: RegisterFilters
  mapFilters: DecisionMapFilterState
  layer: MapLayerId
}

const DEFAULT_STATE: DecisionMapState = {
  location: EMPTY_FILTERS,
  mapFilters: DEFAULT_DECISION_MAP_FILTERS,
  layer: DEFAULT_LAYER,
}

type DecisionMapFilterContextValue = {
  state: DecisionMapState
  setLocation: (location: RegisterFilters) => void
  setMapFilters: (mapFilters: DecisionMapFilterState) => void
  setLayer: (layer: MapLayerId) => void
  reset: () => void
}

const DecisionMapFilterContext = createContext<DecisionMapFilterContextValue | null>(null)

export function DecisionMapFilterProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DecisionMapState>(DEFAULT_STATE)

  const setLocation = useCallback((location: RegisterFilters) => {
    setState((previous) => ({ ...previous, location }))
  }, [])
  const setMapFilters = useCallback((mapFilters: DecisionMapFilterState) => {
    setState((previous) => ({ ...previous, mapFilters }))
  }, [])
  const setLayer = useCallback((layer: MapLayerId) => {
    setState((previous) => ({ ...previous, layer }))
  }, [])
  const reset = useCallback(() => {
    setState(DEFAULT_STATE)
  }, [])

  const value = useMemo(
    () => ({ state, setLocation, setMapFilters, setLayer, reset }),
    [state, setLocation, setMapFilters, setLayer, reset],
  )

  return <DecisionMapFilterContext value={value}>{children}</DecisionMapFilterContext>
}

export function useDecisionMapFilterState(): DecisionMapFilterContextValue {
  const context = use(DecisionMapFilterContext)
  if (context === null) {
    throw new Error('useDecisionMapFilterState must be used inside DecisionMapFilterProvider')
  }
  return context
}
