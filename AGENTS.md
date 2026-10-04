# AGENTS.md — MajiGuard AI

MajiGuard AI — climate-aware water point risk and maintenance prioritization for Tanzania.
This file applies to the whole repository. Read `.kilo/skills/majiguard-frontend/SKILL.md`
before any frontend work.

## Current step

- Steps 1–8 are complete and closed. Step 8 (FastAPI + PostgreSQL) is frozen.
- **Step 9.0 (frontend tooling/skills/MCP preparation) is complete.**
- **Step 9.1 (React + TypeScript + Vite setup) is complete.** Same-origin `/api`
  path with a Vite dev proxy; no CORS change to the frozen backend.
- **Step 9.2 (design system, light/dark themes, bilingual UI) is complete.**
  Tokens live in `frontend/src/index.css` (primitive → semantic → component),
  every visible string resolves through `frontend/src/i18n/messages.ts`, and
  `frontend/src/app/foundation/foundation-page.tsx` is the reference surface.
- **Step 9.3 (application shell, navigation and routing) is implemented and
  closed.** The shell lives in `src/app/shell/` (`app-shell`, `app-header`,
  `app-sidebar`, `mobile-navigation`, `navigation-link`, `section-page`,
  `route-change-announcer`); the route table is `src/app/routes.tsx` on React
  Router 8. The Step 9.2 reference surface moved to `/design-system` and is not
  part of the product navigation. Navigation adapts in three steps: drawer below
  `md`, 64px icon rail from `md`, labelled collapsible sidebar from `lg`.
- **Step 9.4 (backend API client and data layer) is implemented.** Verified
  against the live frozen API through the Vite proxy.
- **Step 9.5 (interactive water-point map) is implemented at national level.**
  The Phase 4A.1 redesign moved the decision-first `OverviewRoute` to
  `/dashboard`; the full interactive map (`WaterPointMap`) now lives at
  `/decision-map` (Step 9.6, below), reusing the same
  `GET /api/v1/water-points/map` data layer. Overview itself keeps only a
  small, deliberately non-interactive `OverviewSpatialSummary` preview with a
  "see full map" link through to it.
- **Step 9.6 (Decision Map route) is implemented.** `src/app/routes/decision-map-route.tsx`
  wires the pre-existing `WaterPointMap` component (zoom/pan, clustering,
  layer switcher, legend, marker selection, keyboard-operable zoom controls)
  into a real route for the first time, using `mapPointsAllQueryOptions` (every
  page of the filtered estate, not just 500) and the same `RegisterFilterBar`
  Region/District/Ward contract as the Priority page and Overview. Selecting a
  marker renders that water point's existing `WaterPointInspectionPanel`
  (shared with the Risk/Impact assessment workspaces) below the map, rather
  than a second bespoke detail view.
- **Phase 4A.1 (senior-level Overview/shell polish + Priority pages) is
  implemented.** See the "Phase 4A.1" notes below for the header, colour,
  typography, KPI card and Priority-page work. The High Impact KPI tiles
  still read "not available": `impact_score`'s population-wide distribution
  was investigated (see the session's report) and found to be ~uniform by
  construction, so no percentile cutoff is more statistically justified than
  another - choosing one is a methodology decision, reported for explicit
  sign-off rather than picked and hidden in code. Do not pick a threshold
  without that sign-off.
- **Decision Map Phase 2 (Region/District/Ward boundary layer, Condition/
  Risk/Impact/Priority filters, combined Priority map layer) is implemented.**
  See "Decision Map Phase 2" notes below. **Two blockers found during
  verification, neither caused by this phase's changes and neither fixed
  here (both out of this phase's scope):** (1) the CARTO basemap tiles
  (`BASEMAP_TILES` in `water-point-map.tsx`, predates this phase) now return
  an "API key required" placeholder image for every tile request — a CARTO
  policy change, not a code regression; the map renders with no visible
  terrain until this is resolved (new key, different provider, or accepted as
  a known gap). (2) `GET /water-points/map` with `page` > 1 hangs
  indefinitely on the backend (page 1 returns in <1s; page 2 alone, with no
  concurrency involved, does not return within 30s) - confirmed with direct
  `curl` straight to the backend, no frontend/proxy involved. This means
  `mapPointsAllQueryOptions` (which depends on page > 1 for any filter
  matching more than 500 points) cannot currently complete a full-estate
  load. Both are reported, not patched - the first is an external dependency
  no key was requested for, the second is inside the frozen `backend/`.

### Step 9.5 layout

- `src/components/map/tanzania-outline.ts` — the national outline as a static
  `[lon, lat, …]` ring, generated from `assets/TZA.geo.json`. Reference
  cartography, never MajiGuard data. Regenerate rather than hand-editing.
- `src/components/map/map-projection.ts` — Web Mercator into the unit square,
  plus fit-to-bounds scaling.
- `src/components/map/water-point-map.tsx` — the map, now wired into
  `/decision-map` (Phase 4A.1, below). React-Leaflet with a CARTO raster
  basemap (light/dark variants), real keyboard-operable zoom/reset controls,
  density clustering below `DENSITY_ZOOM`, a layer switcher
  (condition/risk/impact/consequence/preventive/restoration — a layer is only
  selectable once its underlying stored result exists), a legend, and marker
  selection that lifts to the route for a detail panel. Markers are real
  records only; colour always comes from an already-stored field through
  `encodeMarker()`, never computed here.
- `src/components/data/register-filter-bar.tsx` — native selects for the two
  filters the register supports.
- `src/lib/register-reference.ts` — filter vocabulary (7 statuses, 23 regions)
  read once from the register. Labels only; every count comes from the API.
- `src/hooks/water-points.ts` — `useObservedStatusSummary()` issues one filtered
  count per status through the existing service.

### Map limitations to keep in mind

- The outline is Natural Earth 1:110m (48 vertices): a locator, not a
  survey-grade boundary. It is never used to decide whether a point is inside
  the country.
- No lakes or sub-national boundaries are drawn. The Natural Earth lake set in
  `assets/` has no Lake Victoria, so drawing a partial lake layer would look
  wrong; the outline alone is used.
- The map plots the *complete* filtered estate, not one page: `mapPointsAllQueryOptions`
  (`src/hooks/water-points.ts`) fetches every page of `GET /water-points/map` in
  bounded-concurrency batches and concatenates them before the map ever
  renders. There is no "showing N of M" caveat any more for `/decision-map`.

### Phase 4A.1 layout (Overview/shell polish, Priority pages, Decision Map)

- `src/components/brand/institutional-header.tsx` — header surface is now
  `bg-header`/`text-header-foreground` (the strongest blue in the shell), with
  a `.mg-header-surface` scope (defined in `index.css`) that re-points
  `--foreground`/`--muted-foreground`/`--border-strong` for its children
  (`ProductIdentity`, `IdentitySlot`, the Theme/Language labels) without
  editing those shared components. Left cluster is exactly Coat of Arms →
  divider → MajiGuard identity (the flag slot was removed from the header;
  its `brandAssets['tanzania-flag']` entry still exists for later reuse).
  Right side is exactly Theme → Language → e-GA. A 2px hard-stop gradient
  (green/gold/near-black/gold/blue) sits on the header's bottom edge only.
- `src/index.css` — `--primary`/`--ring`/`--chart-1`/`--sidebar-primary`/
  `--sidebar-ring` deepened from `--mg-blue-600` to `--mg-blue-700` (light
  mode only; dark mode's `--mg-blue-300` was already an intentional, not
  inverted, choice). New `--header`/`--footer` semantic tokens give the shell
  a tonal ladder: header (`--mg-blue-800` light / `--mg-blue-900` dark,
  strongest) → sidebar (`--mg-blue-50` light / near-navy dark, unchanged) →
  footer (`--mg-n-50` light / `--mg-n-950` dark, most restrained, a
  blue-family border only). Geist Variable and the existing `mg-figure`
  tabular-numeral utility were judged sufficient for Item D - no font swap.
- `src/components/data/kpi-card.tsx` — `TONE_CARD` gives every one of the six
  KPI cards the same structure with a tone-matched left accent border + soft
  wash (not just the icon tile), `transition-colors` and a hover state that
  deepens the wash. No focus ring was added: these cards are not interactive
  (no click target), so a fake tab stop would be a false keyboard affordance.
- `src/lib/priority-presentation.ts` — shared by Overview, the Priority page
  and the Decision Map: `scopeLabel()` (moved here from `overview-route.tsx`),
  `riskBandTone`/`riskRowAccent`/`impactRowAccent`/`priorityRowAccent`,
  `formatLocation`, `priorityHref`.
- `src/components/data/format.ts` — `formatPercent()`, for genuine
  probabilities/percentiles only (`probability_non_functional`, `impact_score`)
  — never `priority_score`, which is a product of two such measures and not
  itself a probability.
- `src/app/routes/priority-route.tsx` — the real `/priority?type=preventive|restoration`
  worklist (full server-paginated list, never top-N), tabs that preserve the
  pathway in the URL, the same `RegisterFilterBar` Region/District/Ward
  contract, and the backend's own global `rank` displayed as-is under every
  filter combination (never recomputed as a "local" rank).
- `src/app/routes/decision-map-route.tsx` — see the Step 9.6 note above.

### Decision Map Phase 2 layout (boundary layer, Condition/Risk/Impact/Priority filters)

- `frontend/scripts/generate-admin-boundaries.py` — one-off generator, reads
  only the frozen `data/raw/geographic/nbs_tz_2022_wards` shapefile (the
  authoritative NBS 2022 source; geoBoundaries is never used as the primary
  source) and writes derived web GeoJSON to `frontend/public/geo/` -
  `tz-regions.geojson` (31 features), `tz-districts.geojson` (150, dissolved
  from wards), and `wards/<region-slug>.geojson` + `wards/manifest.json` (one
  file per region, so a ward layer never downloads more than one region at
  once). Re-run it to regenerate after any change to the source shapefile;
  the output is never hand-edited.
- `src/hooks/admin-boundaries.ts` — React Query wrappers (`staleTime:
  Infinity`) over those static files; `useWardBoundaries` resolves a region
  name to its manifest slug before fetching.
- `src/components/map/admin-boundary-layer.tsx` — renders exactly one
  boundary level at a time inside `WaterPointMap`'s `MapContainer`: regions
  below zoom 8, districts from 8, wards from zoom 10 *only* when a region is
  already filtered (otherwise districts remain the fallback - a nationwide
  4,344-ward layer is never rendered at once). Clicking a polygon sets the
  same Region/District/Ward filter the dropdowns set; it is a shortcut, never
  a second filtering path.
- `src/lib/decision-map-filters.ts` / `src/components/map/decision-map-filters.tsx`
  — the Condition (All/Functional/Non-Functional), Risk (All/High/Medium/Low,
  from the backend's own `risk_band`), Impact (All/High/Medium/Low - High is
  always exactly the stored `impact_high` flag, impact_high_threshold_v1 @
  0.6856; Medium/Low only subdivide the remainder using the pre-existing
  `mapImpactBand` 0.33 split, already used elsewhere for presentation) and
  "High Risk + High Impact" priority-view filters. All client-side over the
  already-fetched estate; nothing is recomputed, re-thresholded or re-ranked.
  This replaced the earlier ad hoc "High Impact only" switch.
- `src/components/map/map-layers.ts` — added a `priority` layer: colours by
  whichever backend `priority_v2` pathway (preventive or restoration) a point
  is actually eligible for, reading that pathway's own stored score verbatim
  (never both, never blended, never recomputed). Sits in the existing layer
  switcher alongside condition/risk/impact/consequence/preventive/restoration.
- Priority score/rank/category display needed no new work -
  `WaterPointInspectionPanel`'s existing `PrioritySection` already renders
  both pathways' stored score, rank and methodology version verbatim.

### Step 9.4 layout

- `src/lib/api-client.ts` — transport. Signal-aware, JSON `Accept`, 204 handled,
  `ApiError` with `status`/`detail`, `status === 0` means unreachable, aborts
  rethrown untouched, `ApiError.detail` is diagnostic and never rendered.
- `src/lib/api-result.ts` — `StoredResult<T>` (`stored` / `not-stored`) and
  `describeApiFailure` (`unreachable`, `server-unavailable`, `invalid-request`,
  `unexpected`).
- `src/types/api.ts` — wire types mirroring the generated OpenAPI field for
  field. `sw: Messages` makes the TypeScript compiler enforce catalogue parity.
- `src/services/health.ts`, `src/services/water-points.ts` — transport only, no
  React. `computeWaterPoint` exists for the write path but has no UI and is
  tree-shaken out of the browser bundle.
- `src/hooks/health.ts`, `src/hooks/water-points.ts`, `src/hooks/use-page-param.ts`
  — React Query hooks; page state lives in the URL.
- `src/components/data/` — `state-panel`, `data-states`, `data-table`,
  `result-values`, `observed-status`, `format`. Route screens live in
  `src/app/routes/section-routes.tsx`.

### Backend contract notes for later steps

- List filters are `observed_status` and `nbs_region` (not `region_name`); any
  other parameter is silently ignored, so an unfiltered 200 can look like a
  filtered result.
- `page_size` is capped at 500 and `page` is 1-based (`page=0` is a 422). Both
  endpoints return a `PageMeta`/`MapPageMeta` envelope, never a bare array.
- A missing water point is `404 {"detail":"Water point not found"}`.
- `prediction_results`, `impact_results` and `consequence_results` are all empty,
  so result endpoints legitimately answer 404 and every result screen renders
  the not-stored state. No stored result exists anywhere in the database yet.

## Frontend conventions (Step 9.2+)

- Never write user-visible English directly in a component. Add the key to both
  catalogues in `messages.ts` and render it with `useI18n().t()`.
- Use semantic colour utilities (`bg-risk-high-soft`, `text-muted-foreground`,
  `border-border-strong`), never raw palette values.
- Risk, status and impact are always rendered by `SemanticChip`, which pairs
  colour with an icon and a text label.
- Brand artwork may only render when its `BrandAsset.status` is `approved`.
- The primary navigation is defined once in `src/app/shell/navigation-config.ts`.
  Add a section there, not in the sidebar or the drawer.
- Route shells state that their data view is not yet available. Never fill them
  with placeholder figures, maps or charts.

## Frozen — do not modify without explicit user approval

`majiguard_ml/` · `model_artifacts/` · `data/` · `notebooks/` · `backend/` ·
PostgreSQL schema · Alembic migrations · ML methodology · data-processing methodology.

No retraining, no recalibration, no migrations, no bulk ML computation, no new
tables, no backend redesign, no unrelated test fixes. Report a backend need; do not
patch it from the frontend.

## Frontend scope (Step 9.1+)

- React + TypeScript + Vite, with shadcn/ui as a **foundation only** — not the
  final MajiGuard visual identity.
- The backend API is the only source of production data. **No fake, mock, or
  hardcoded dashboard numbers, rows, or coordinates.** Build honest loading,
  empty, and unavailable states.
- Never recompute scores, thresholds, bands, or impacts in the browser, and never
  relabel `risk_impact_index` as maintenance priority, expected loss, affected
  population, or failure probability.
- 404 from a results endpoint means "no stored result yet" — a real state to design
  for, not an error to hide.
- Design direction: professional, modern, clean, data-centric, trustworthy,
  map-first, strong hierarchy, restrained cards, no glassmorphism, no decorative
  gradients, no cartoon/3D styling, no decorative AI imagery, purposeful motion only.
- Accessibility is required: WCAG 2.2 AA, full keyboard operation including a
  non-map equivalent for map affordances, semantic markup, and risk encoding that
  never relies on colour alone.
- Responsive by design: mobile-first, with deliberate small-screen behaviour for the
  map and dense tables.
- Do not add a dependency, chart library, or map library without stating why; these
  are Step 9.1 implementation decisions, not Step 9.0 tooling.

## Tooling already prepared

- Skills: `majiguard-frontend` (project), plus the `shadcn`, `magic-ui`,
  `ui-ux-pro-max`, `accessibility`, `web-design-guidelines`, `design-system`,
  `design-taste-frontend`, and `vercel-react-best-practices` skills already available.
- MCP (`.kilo/kilo.json`): `shadcn` enabled; `21st` and `magicui` configured but
  disabled — `21st` needs a user-supplied `API_KEY_21ST` before enabling.
- Secrets: never read, print, or commit `backend/.env`, database passwords, or API
  keys. Use placeholders in examples and environment-variable references in config.
