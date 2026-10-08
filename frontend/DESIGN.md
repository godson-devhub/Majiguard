---
version: alpha
name: MajiGuard-institutional
description: "MajiGuard (MUUMAM) design system: a calm, white, typographic, institutional-grade interface for a data-driven, ML-powered water-point decision-support system used by Tanzanian public-sector operations teams. Institutional blue is a structural accent, not a surface. Risk and impact colours are scarce, semantic and always paired with text."

colors:
  # Values below are the current primitives in src/index.css (light theme).
  canvas: "#ffffff"
  ink: "#131a24"
  ink-muted: "#4a5765"
  surface-subtle: "#f5f7f9"
  hairline: "#dfe4ea"
  hairline-strong: "#6b7a8a"
  brand: "#144c87"
  brand-strong: "#123e6d"
  brand-tint: "#eef4fb"
  status-functional: "#15803d"
  status-nonfunctional: "#b42318"
  status-warning: "#b45309"
  status-info: "#0f5f75"
  risk-low: "#d97706"
  risk-moderate: "#ea580c"
  risk-elevated: "#dc2626"
  risk-high: "#991b1b"
  impact-low: "#0e7490"
  impact-moderate: "#0f5f75"
  impact-high: "#10495b"
  flag-green: "#15803d"
  flag-gold: "#fbbf24"
  flag-black: "#131a24"
  flag-blue: "#89cff0"

typography:
  page-title:
    fontFamily: Geist Variable
    fontSize: 28px
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: -0.01em
  section-title:
    fontFamily: Geist Variable
    fontSize: 20px
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: Geist Variable
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: Geist Variable
    fontSize: 13px
    fontWeight: 500
    lineHeight: 1.25
  caption:
    fontFamily: Geist Variable
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.5
  figure:
    fontFamily: Geist Variable
    fontSize: 28px
    fontWeight: 600
    lineHeight: 1.15
    fontFeature: tnum

rounded:
  control: 4px
  panel: 6px
  full: 9999px

spacing:
  xxs: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  xxl: 48px

components:
  header:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    height: 64px
  header-brand-name:
    textColor: "{colors.brand}"
    typography: "{typography.section-title}"
  header-brand-subtitle:
    textColor: "{colors.ink-muted}"
    typography: "{typography.caption}"
  flag-strip:
    height: 6px
  button-primary:
    backgroundColor: "{colors.brand}"
    textColor: "{colors.canvas}"
    rounded: "{rounded.control}"
    height: 40px
  text-input:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    height: 40px
  panel:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
    padding: 16px
  table-header:
    backgroundColor: "{colors.surface-subtle}"
    textColor: "{colors.ink-muted}"
    typography: "{typography.label}"
---

# MajiGuard design system

> **Status of this document.** This file documents the **approved design direction** for the MajiGuard frontend and the decisions taken in the UI/UX audit. It replaces an earlier file that described an unrelated marketing site (pastel colour blocks, pill buttons, black-and-white editorial). That file did not describe this product and must not be used as a reference.
>
> The application is being brought in line with this document in small, separately tested phases (see [Implementation phases](#implementation-phases)). Until a phase ships, the code may differ from the **Target** sections below. Sections marked **Current** describe what is in `src/index.css` and `src/` today and are the source of truth for existing behaviour. Where the two differ, the difference is stated explicitly.

## 1. Product identity

**MajiGuard (MUUMAM)**

**Mfumo wa Usimamizi na Uamuzi wa Matengenezo ya Vituo vya Maji**

MajiGuard is a data-driven, ML-powered decision-support system for water-point management in Tanzania. It helps operations teams decide where to act first, using the backend's stored condition, risk, impact and priority results.

- **"MajiGuard (MUUMAM)" is the brand name.** It is the primary line in the header.
- **The Swahili name is the official name of the product** and is shown in the header in **every locale** (English and Kiswahili). It is never replaced by a translation.
- **The English descriptor** ("Data-driven, ML-powered decision support for water point management") stays available in secondary places: the footer, the About section of Settings, and tooltips. It does not replace the Swahili name in the header.
- Internal code and file names keep using `MajiGuard` / `majiguard`.

The interface should communicate: institutional credibility, clarity, trust, operational intelligence, data confidence, and Tanzanian public-sector context.

It must **not** look like: a generic SaaS dashboard, a startup landing page, a flashy "AI" demo, a template dashboard, or a cryptocurrency dashboard.

## 2. Non-negotiable product rules

These come from the project's frontend rules (`.kilo/skills/majiguard-frontend/SKILL.md`) and apply to every phase. A design change must never weaken them.

1. **Real backend data only.** No invented, mocked or hard-coded production numbers. Loading, empty, error and unavailable states are real, designed states.
2. **The backend is the single source of truth.** The browser never recomputes scores, thresholds, bands, ranks or impacts. It renders what the API returns.
3. **The API is frozen.** A missing field is reported as a backend request, not worked around client-side.
4. **Preserve the language of the model.** `risk_impact_index` is a relative consequence signal. It is never labelled maintenance priority, expected loss, affected population or failure probability. `risk_band` is presentation-only and distinct from the `decision_threshold` decision.
5. **Never fabricate missing model inputs.**
6. **Preventive and restoration priority are never combined** into one score, rank or list.
7. **"Not stored" and "not assessed" are real states.** A missing result is never rendered as zero, a low band or an assumed value. A `404` from a result endpoint means "no stored result yet".
8. **Observed condition and model estimate are always visually and verbally distinct.**

## 3. Design principles

1. **Institutional and calm.** White surfaces, hairline borders, restrained blue. Authority comes from clarity and spacing, not decoration.
2. **Decision-first.** Each screen has one focal point and answers a question ("Where should we act first?"). Supporting detail is available, not equal-weight.
3. **Map-first where location matters.** The Decision Map is the primary spatial surface; filters, lists and detail support it.
4. **Colour is a scarce resource.** Risk and impact colours encode risk and impact only. Brand blue is structure: links, active state, focus, primary actions.
5. **Never colour alone.** Every status, band and legend entry has a text label and, where practical, a shape or icon.
6. **Density with hierarchy.** Dense tables and figures are fine; they need a clear type scale, tabular numerals, aligned columns and consistent spacing.
7. **Honest states.** Show loading in place (skeletons), say what is being loaded, distinguish "no data" from "choose a scope first" from "failed".
8. **Restrained motion.** Purposeful, 120–160 ms, opacity/colour only, and fully respecting `prefers-reduced-motion`.

### Do not use

- Gradients (except a sequential data ramp that carries meaning), glassmorphism, neon colours.
- Large decorative radii, heavy or stacked shadows, 3D or cartoon visuals, mascots, stock illustration.
- Decorative "AI" visual clichés (glows, sparkles, particle backgrounds).
- Hover effects on non-interactive elements.

## 4. Colour

### 4.1 Current token architecture (keep)

`src/index.css` defines three layers, each with explicit light and dark values (dark values are chosen, not inverted):

1. **Primitives** `--mg-*`: neutral scale (`--mg-n-0` … `--mg-n-950`), institutional blue scale (`--mg-blue-50` … `--mg-blue-900`), hazard ramp, status colours, teal impact scale, dark-mode tints.
2. **Semantic** tokens: `--background`, `--foreground`, `--card`, `--primary`, `--muted`, `--border`, `--border-strong`, `--ring`, `--status-*`, `--risk-*`, `--impact-*`, `--chart-*`, `--sidebar-*`, `--header-*`, `--footer-*`, `--map-*`.
3. **Component/layout** tokens: radii, focus ring, control heights, header height, durations, shadows.

Tailwind utilities are bridged in `@theme inline` (`bg-card`, `text-risk-high`, `bg-status-functional-soft`, …). This architecture is good and is preserved; changes are made to token **values** and a small number of additions, not by replacing it.

### 4.2 Roles

| Role | Use | Notes |
|---|---|---|
| Neutral | Surfaces, text, borders | Cool grey scale; body text `--foreground`, secondary `--muted-foreground` |
| **Brand blue** | Wordmark, links, active nav item, primary button, focus ring | Structural accent only. Target token `--brand` aliasing `--mg-blue-700` (added in Phase 1) |
| Status | Observed condition: functional / non-functional / warning / info | Always paired with a text label |
| **Risk** (hazard ramp) | Model-predicted risk bands | Single hue family, never blue. Reserved for risk encoding |
| **Impact** (teal ramp) | Relative community impact | Magnitude, not status. Reserved for impact encoding |
| Chart categorical | Non-risk series in analytics | `--chart-1…5`; never used to encode risk or impact |
| Map chrome | Overlays, markers, attribution | `--map-*` tokens |

### 4.3 Rules

- Risk colour is never used decoratively (no red/orange accents on cards that are not about risk).
- Risk and impact are never shown as colour only (see [Accessibility](#10-accessibility)).
- Body text and interactive boundaries meet WCAG 2.2 AA. Decorative hairlines use `--border`; interactive boundaries (inputs, selects) use `--border-strong` / `--input`.

### 4.4 Current vs target

| Area | Current | Target |
|---|---|---|
| Header surface | `--header` = `--mg-blue-800` (dark blue slab), with a light-on-dark token override `.mg-header-surface` | Light: `--background` (white). Dark: dark card surface. The blue slab and the override are removed (Phase 2) |
| Sidebar surface | `--sidebar` = `--mg-blue-50` (blue tint) | White or `--muted`, 1px border; active item uses a left rule + weight, not colour alone (Phase 3) |
| Brand colour | Implicit (`--primary`) | Explicit `--brand` alias for the wordmark (Phase 1) |

## 5. Header (approved specification)

The header is the strongest expression of institutional identity and the most visible change from the current design.

### 5.1 Surface

- **Light mode:** white header (`--background`), a 1px `--border` under the content row.
- **Dark mode:** dark surface header (the dark card/background surface), with a 1px dark border.
- **The old blue header slab does not return.** The network motif and the header token override are removed.
- The sticky behaviour, skip link and `scroll-padding` are preserved.

### 5.2 Content (left to right)

1. Mobile navigation trigger (below `md` only).
2. **Coat of arms** (approved asset), no placeholder frame.
3. A 1px vertical divider.
4. **MajiGuard mark** (approved asset), no placeholder frame.
5. **Brand block**
   - Line 1: **MajiGuard (MUUMAM)**, brand colour, semibold. This is the brand identity.
   - Line 2: **Mfumo wa Usimamizi na Uamuzi wa Matengenezo ya Vituo vya Maji**, muted text, caption size, regular weight. Strong but restrained hierarchy. Truncates with a tooltip when narrow; hidden below `sm` while line 1 remains.
6. **Right side, in order:** language control, theme control, then the **e-GA logo at the far right**.
   - The e-GA logo stays the final, far-right element. It hides below `lg` as it does today.

### 5.3 Compact controls

Dark mode and Language are **not** long text controls. Both are compact, visually self-explanatory, and fully accessible.

- **Theme:** an icon switch (sun / moon) in one compact pill. `role="switch"`, `aria-checked`, an `aria-label` ("Dark mode" / "Hali ya giza"), a tooltip, and the existing screen-reader description.
- **Language:** a compact two-option segmented control, `EN | SW`. The group has an `aria-label`; each option's accessible name is the full language name ("English", "Kiswahili"); the current option is marked. The visible raw locale value ("en") is not used.
- Minimum target size 40 px (44 px on touch viewports).

### 5.4 Tanzania flag strip

- Stays at the **lower edge** of the header, full width, in **both** light and dark mode.
- **Taller and more present than today's 2 px**: 6 px (about 8 px on very wide screens).
- Same hard colour stops (not a gradient blend): green, gold, black, gold, blue.
- Decorative: `aria-hidden`.
- The blue segment currently uses `--mg-shell-blue` (`#89cff0`). Its colour is to be checked against the approved flag artwork before Phase 2 is finalised; no flag colour is changed without that check. The separate `tanzania-flag` brand slot is still `not-available` and stays that way until artwork is approved.

### 5.5 Brand assets

- `IdentitySlot` keeps its approval model: only an `approved` asset renders an image, and an unapproved slot never announces an official identity.
- **Approved assets render without the dashed placeholder frame.** The frame is for unapproved slots only (Phase 2).

## 6. Typography

**Family:** Geist Variable (`@fontsource-variable/geist`). Numerals in tables, KPIs, coordinates and scores use tabular figures (`mg-figure`).

### Target scale

| Role | Size | Weight | Use |
|---|---|---|---|
| Page title | 28 px | 600 | One per page |
| Section title | 20 px | 600 | Section headings |
| Sub-section / card title | 15–16 px | 600 | Panel and card titles |
| Body | 14 px | 400 | Default text, table cells |
| Label | 13 px | 500 | Form labels, column headers |
| Caption | **12 px (floor)** | 400 | Hints, provenance, legends |
| Figure | 28 px | 600 | KPI numbers, tabular |

- **Floor of 12 px.** The current 10 px (`text-[0.625rem]`) and 9 px labels are removed in Phase 1.
- Large "display" type is not used for loading text. A loading state is a skeleton, not "Checking…" at 34 px.
- Eyebrows and all-caps labels are used sparingly and only for taxonomy (section grouping), never for body text.

## 7. Layout, spacing, shape

- **Spacing:** 4 / 8 px base. Named steps: 4, 8, 12, 16, 24, 32, 48. Pages use a small set of consistent vertical gaps instead of per-page choices.
- **Content width:** capped at 100 rem; the header, sidebar and footer remain full-bleed.
- **Radius:** controls 4 px, panels 6 px. Pills only for badges/chips. Nothing larger.
- **Borders over shadows:** panels use a 1px hairline. Shadows are reserved for floating layers (menus, popovers, dialogs, map overlays).
- **Cards:** only for bounded units. Prefer layout, dividers and whitespace over a card around every element.
- **Control height:** 40 px default (44 px on touch). The current 36 px (`h-9`) selects are raised in Phase 1.

## 8. Components and patterns

### Navigation (sidebar)

- Primary entries: Overview, Priority, Water points, Decision Map, Analytics. Settings is pinned to the bottom with the collapse control.
- Optional grouping into **Decide** (Overview, Priority, Decision Map) and **Explore** (Water points, Analytics) using the existing group mechanism.
- Active item is signalled by a left rule and weight as well as fill.
- Icon rail between `md` and `lg` with tooltips; drawer below `md`. Existing behaviour and `localStorage` preference are preserved.
- **`/risk`, `/impact` and `/design-system` stay reachable by URL and are not added to the sidebar.** They are not redesigned in this effort.

### Page header

Eyebrow (optional), title, one-line description, source note. Kept compact so content starts high on the screen.

### KPI tiles

One flat style: white, 1px border, a 28 px figure, a 12–13 px label, a caption hint. No coloured left rule, no tint wash, no hover shadow (tiles are not interactive). A small status dot **plus label** is used only for tiles that carry condition or risk meaning. Loading is an in-place skeleton.

### Filters

- One consistent toolbar: **Scope** (Region, District, Ward) and, where relevant, **Lens** filters (Condition, Risk, Impact, Pathway), with a single Reset.
- Active filters are shown as removable chips with a result count (`aria-live="polite"`).
- Labels are translated (the current hard-coded "District" and "Ward" labels move into the message catalogue in Phase 4).
- Native selects remain acceptable for accessibility and mobile; their size is unified at 40 px.

### Tables

- Real `<table>` with `<caption>` and `scope="col"`.
- Compact default row density; tabular numerals; right-aligned numbers.
- The score is the visual anchor in ranked tables.
- Rank is always the backend's. No client-side re-ranking or sorting that changes rank semantics.
- Small screens: keep the key columns (rank, identifier, score) and move the rest into a row detail, or use a card list. Never a squeezed desktop table.

### Status chips

`SemanticChip` and `ObservedStatusChip` always combine colour with text and an icon/shape. Chip labels come from the message catalogue, not raw backend strings. A raw backend value that is not in the catalogue is displayed verbatim rather than guessed into a tone.

### Loading, empty, required-scope and error states

Four distinct states, never conflated:

| State | Meaning | Treatment |
|---|---|---|
| Loading | Request in flight | In-place skeleton at final size, plus a short honest line (e.g. progress "Loaded N of M" for the progressive map load) |
| Empty | The query succeeded and returned no rows | Neutral message stating what was searched |
| **Scope required** | The view needs a Region (or similar) before it can show a breakdown | Informational panel with a clear prompt; **not** the empty-state "No water points match" |
| Error | Request failed | Failure state with retry |

## 9. Screen guidance

### Overview

Answer "Where should we act first?" in the first screen. Target order: scope bar, then the **preventive / restoration "act first"** band, then KPIs, then the top-8 lists, then the spatial summary. Preventive and restoration remain separate and use the backend's own ranking and scoped totals.

### Analytics

Two-row filter toolbar (Scope, Lens), a section index for the long page, direct value labels and share-of-total on bars, a single national-scope notice instead of one per chart, and scope-required panels instead of empty states. Aggregation logic and the URL contract are unchanged.

### Decision Map

Map-first and full available height. One compact filter panel with active-filter chips. Layers grouped as **Observed**, **Model** and **Priority**, with the reason a layer is disabled shown as visible text. A single collapsible legend that does not rely on colour alone. Marker halo for legibility over the basemap. A thin, non-blocking "Loaded N of M" progress indicator. The inspection panel opens beside the map (desktop) or as a bottom sheet (tablet/phone) instead of below the fold. A "view as list" link to the Water Points table provides the keyboard/non-map equivalent. Data, filtering and boundary click-through behaviour are unchanged.

### Priority

Two-option pathway switch with the meaning of each pathway stated plainly. Score is the visual anchor; "why prioritized" appears as chips (first two plus a count); each row has a clear action that opens the water-point detail. Server pagination and backend rank order are unchanged.

### Water Points

A searchable register (by master ID / WPDx ID, reusing the existing search), the shared Scope filter plus Status, a compact default density, and the detail shown in a side panel instead of above the table.

### Water-point detail (inspection)

Ordered for a non-technical official:

1. **Header:** identifier, location, observed-condition chip, assess action.
2. **Verdict strip** (plain-language summary; rules below).
3. **Observed (survey)** and **Model estimate** as two clearly separated blocks, each with a persistent label ("Recorded survey data" / "Model estimate, not an observation").
4. **Priority:** preventive and restoration shown separately, with the national rank.
5. **Technical details** collapsed by default: decision threshold, methodology versions, computed-at, component scores.

Probabilities and scores are shown as labelled values with consistent formatting, never bare unlabeled decimals. Band and status strings go through the message catalogue.

#### Verdict strip rules

The verdict strip is a **frontend rephrasing of fields the backend has already stored**, for officials who do not read model output. It is bound by these rules:

- It may only restate existing stored fields (observed status, `risk_band`, stored impact band/flag, stored priority eligibility, rank, and `recommended_action`).
- **No new scoring, thresholds, risk calculation, priority logic or inferred conclusion.** If the strip needs a judgement the backend has not made, it does not make one.
- **Observed condition and model estimate stay separate** in the sentence and in the layout (for example "Observed: Functional." and, separately, "Model estimate: high risk of non-functionality.").
- **"Not stored" / "not assessed" semantics are preserved.** If a result is not stored, the strip says so; it never fills the gap.
- It never labels `risk_impact_index` as priority, probability or population.
- All wording exists in both locales.

### Settings

Settings is **not** a dead-end placeholder. For now it contains only real, defensible sections that use existing frontend and provider data:

- **Appearance:** theme and language (the same preferences the header controls expose).
- **About:** product name, the official Swahili name, the English descriptor, the independent-tool disclaimer, and neutral attribution wording only if it is already part of the approved product wording.

Not part of Settings: user accounts, notifications, editable thresholds, API-key management, export settings, or any invented option. Methodology and system-status sections (read from existing backend fields) are deferred to a later phase and are read-only when they arrive.

### Footer

Compact, two rows on the neutral surface: the product identity (MajiGuard (MUUMAM), the official Swahili name, and the English descriptor), and the disclaimer ("An independent decision-support tool. Not an official Government of Tanzania system.") with links to Settings/About. **No "Powered by e-GA" wording.** No official relationship is stated or implied beyond what the approved wording already says. The e-GA logo appears in the header only.

## 10. Accessibility

Required, not optional (WCAG 2.2 AA).

- **Targets:** 40 px minimum for controls, 44 px on touch viewports.
- **Icon-only controls** (theme, language, map zoom, close): accessible name, tooltip, visible focus. Where a control is a toggle, expose `aria-pressed` or `role="switch"` with `aria-checked`.
- **Focus:** one guaranteed visible `:focus-visible` ring (already present), including a forced-colours fallback; focused items are not hidden behind the sticky header.
- **Never colour alone:** risk bands, condition status, map markers and legends include text and shape/icon cues. Duplicate legend colours (for example two greys, two ambers) are differentiated by shape or label.
- **No hover-only information:** explanations (for example why a map layer is disabled) are visible text, not only a `title` attribute.
- **Type floor:** 12 px.
- **Contrast:** verified in both themes for muted text on muted/tinted rows, hazard text on soft chips, and map overlays.
- **Semantics:** landmarks, ordered headings, `<table>` for tabular data, `aria-live` for async results and map loading progress.
- **Keyboard:** every control reachable and operable; every map-only affordance has a list/table equivalent.
- **Motion:** respects `prefers-reduced-motion`; no zoom limits on the map.

## 11. Responsive behaviour

| Width | Behaviour |
|---|---|
| ≥ 1280 | Labelled sidebar (collapsible); map fills available height; inspection beside the map |
| 1024–1279 | Sidebar (collapsible); filters collapse into a compact panel |
| 768–1023 | Icon rail; inspection as a bottom sheet; tables keep key columns |
| < 768 | Drawer navigation; header shows the mark and "MajiGuard (MUUMAM)" (subtitle hidden); tables become card lists; map toolbar reduces to Filters and Layers |

Breakpoints are chosen from content, not devices. Map and dense tables always have explicit small-screen behaviour.

## 12. Internationalisation

- Two locales: English and Kiswahili, through the message catalogue (`src/i18n/messages.ts`).
- The official Swahili name in the header is **not** locale-dependent.
- No user-visible string is hard-coded in a component. Known gaps to close in Phase 4: the "District" and "Ward" filter labels, map-legend condition values, the Functional/Non-Functional KPI labels, and raw risk-band and predicted-status strings in the inspection panel.
- Backend enum values are mapped to translated labels; an unmapped value renders verbatim rather than being hidden.

## 13. Implementation phases

Each phase is implemented and tested independently, and does not start until the previous phase is approved.

| Phase | Scope | Type |
|---|---|---|
| **0** | **This document** | Documentation only |
| 1 | Tokens and foundations: control height, type floor, radii, `--brand`, shadow cleanup | Visual |
| 2 | Header: white/dark surface, brand block, 6 px flag strip, compact theme and language controls, unframed approved logos | Structural (shell) |
| 3 | Sidebar and footer | Visual and content |
| 4 | i18n completeness | Copy |
| 5 | Shared patterns: filter toolbar and chips, in-place loading, scope-required panel, row action | Structural |
| 6 | Overview and Priority | Structural |
| 7 | Analytics | Structural |
| 8 | Decision Map | Structural |
| 9 | Water Points and detail (including the verdict strip) | Structural |
| 10 | Settings: Appearance and About | New content |
| 11 | Full QA: keyboard, contrast, forced-colours, breakpoints, both themes | Verification |

Methodology/system-status settings are a later, separate phase.

## 14. Decisions recorded from the audit

1. **Header theme:** light mode white, dark mode dark surface, same flag strip in both; the old blue slab does not return.
2. **Swahili name:** official, shown in the header in both locales; English descriptor kept in footer/About/tooltips.
3. **e-GA:** logo stays at the far right of the header; no "Powered by e-GA" footer wording; no invented official relationship.
4. **Settings:** Appearance and About now, from existing data only; no invented settings.
5. **Verdict strip:** approved, as a frontend rephrasing of stored backend fields only, with observed and model estimate kept separate.
6. **Legacy routes:** `/risk`, `/impact` and `/design-system` stay reachable and are not added to the sidebar; not redesigned or removed in this effort.

## 15. Known open items

- Confirm the flag's blue segment against the approved flag artwork before Phase 2 is finalised.
- Dark-mode basemap: the current CARTO Voyager raster is used for both themes. A dimmed or dark basemap is to be decided in Phase 8.
- `VITE_CARTO_BASEMAP_KEY` is optional but, when blank, CARTO watermarks tiles (see `frontend/.env.example`).
- Contrast and breakpoint checks are verified in Phase 11 with real measurements, not assumed from this document.
