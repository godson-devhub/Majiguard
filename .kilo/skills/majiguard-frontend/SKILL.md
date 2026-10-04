---
name: majiguard-frontend
description: MajiGuard AI dashboard frontend rules and design direction. Use when building or reviewing any Step 9.1+ React/TypeScript UI for MajiGuard — components, map views, risk/impact visualizations, tables, layouts, styling tokens, motion, or accessibility work. Encforces the frozen-backend contract, real-data-only rule, and the restrained, map-first, data-centric visual direction. Triggers on "MajiGuard dashboard", "risk map", "water point card", "Step 9", "MajiGuard UI", "dashboard design review".
---

# MajiGuard frontend rules (Step 9+)

MajiGuard AI — climate-aware water point risk and maintenance prioritization for Tanzania.
Step 8 (backend) is closed and frozen. The frontend consumes it; it never changes it.

## Hard rules

1. **Real backend data only.** Never invent, mock, seed, or hardcode production numbers.
   No placeholder KPIs, no "lorem" rows, no random lat/lng. Loading, empty, and
   unavailable states are honest UI states — build them properly.
2. **Backend is the single source of truth.** Do not recompute scores, thresholds,
   bands, or impacts in the browser. Render what the API returns, including its
   version fields and `*_unavailable_reason` values.
3. **Read the API, don't change it.** Missing endpoints, shapes, or pagination gaps
   are reported to the user as a backend request — not patched client-side, and not
   worked around by editing `backend/`.
4. **Preserve the language of the model.** `risk_impact_index` is a relative
   consequence signal. Never label it maintenance priority, expected loss, affected
   population, or failure probability. Keep `risk_band` presentation-only and
   distinct from the `decision_threshold` decision.
5. **Never fabricate missing model inputs.** Road/city/town and WPDx urban features
   are unresolved. Do not impute, proxy, or silently drop them in the UI.

## API contract (read-only, frozen)

Base: `http://localhost:8000/api/v1` (dev). `GET /health`, `GET /api/v1/health`.

| Method | Path | Returns |
|---|---|---|
| GET | `/water-points?page&page_size&observed_status&nbs_region` | `PageMeta` |
| GET | `/water-points/map?page&page_size&observed_status&nbs_region` | `MapPageMeta` (`page_size` max 500) |
| GET | `/water-points/{id}` | `WaterPointOut` |
| GET | `/water-points/master/{master_id}` | `WaterPointOut` |
| GET | `/water-points/{id}/prediction` | `PredictionResponse` |
| GET | `/water-points/{id}/impact` | `ImpactResponse` |
| GET | `/water-points/{id}/consequence` | `ConsequenceResponse` |
| POST | `/water-points/{id}/compute` | `ComputeResponse` (writes a result set) |

404 means "no stored result yet" — that is a real state, not an error to hide.
Result tables may be empty, so a map can legitimately show points without
risk values. Design for that.

## Visual direction

Professional, modern, clean, data-centric, trustworthy, map-first. It must read as
a water-infrastructure decision tool for Tanzanian authorities, not a generic AI
dashboard.

- **Map-first.** The map is the primary surface. Filters, list, and detail are
  supporting views, not equal-weight card grids.
- **Restrained cards.** Use cards only for genuinely bounded units. Prefer layout,
  dividers, and whitespace over a card around every element. Avoid excessive
  rounding, elevation, and drop shadows.
- **No glassmorphism, no decorative gradients, no cartoon/3D styling.** Gradients
  only where they carry meaning (e.g. a sequential risk ramp).
- **No decorative AI imagery.** No stock illustrations, mascots, or 3D renders.
  Data visuals and icons only.
- **Strong hierarchy.** One clear focal point per view. Risk colour is a scarce
  resource: reserve it for risk encoding, never decoration.
- **Restrained motion.** Purposeful transitions only (view changes, panel
  transitions, progressive disclosure). Respect `prefers-reduced-motion`.
- **Risk/impact legibility.** Encode risk with a colour ramp plus a non-colour cue
  (label, shape, or pattern) so meaning survives colour-vision deficiency and
  greyscale printing. Do not rely on red/green alone.

## Accessibility (required, not optional)

- WCAG 2.2 AA: contrast, focus visibility, visible focus order, 44px targets.
- Full keyboard operability, including the map (list/table equivalent for every
  map-only affordance).
- Real semantics: landmarks, headings in order, `<table>` for tabular data,
  accessible names on every control, `aria-live` for async result updates.
- Never communicate status by colour alone; never disable zoom on the map.
- Respect reduced motion and system contrast preferences.

## Responsive (required)

- Mobile-first. Breakpoints must be chosen from content, not device guesses.
- Map and dense tables get explicit small-screen behaviour (collapsing columns,
  horizontal scroll with a sticky key column, or a card list) — never a
  squeezed desktop layout.
- Test narrow phone, tablet, laptop, and large desktop widths before calling a view done.

## shadcn/ui, 21st.dev, Magic UI

- **shadcn/ui is a foundation, not the MajiGuard visual identity.** Compose from it
  (the `shadcn` skill and `shadcn` MCP are configured), then apply MajiGuard tokens
  and layout. Do not ship default shadcn theming as the product look.
- **21st.dev** is for discovery and reference patterns. Copying a component's
  styling wholesale is not the MajiGuard look. Its MCP stays disabled until the
  user supplies an API key.
- **Magic UI** may supply a specific visual/motion component only when it earns its
  place; its MCP stays disabled by default and each use must pass the restraint
  and reduced-motion rules above.
