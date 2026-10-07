import {
  ChartNoAxesColumn,
  Droplets,
  LayoutDashboard,
  ListOrdered,
  Map,
  Settings,
  type LucideIcon,
} from 'lucide-react'

import type { MessageKey } from '@/i18n/messages'

export type NavigationItem = {
  path: string
  labelKey: MessageKey
  icon: LucideIcon
  /** Optional section heading this entry sits under in the sidebar. */
  group?: MessageKey
}

/**
 * Shell navigation only. Decision-oriented, not a mirror of backend modules:
 * Risk and Impact are pipeline stages, not destinations, so they are not
 * top-level entries here (they remain reachable - see `legacyRouteTitles`
 * below - while their content is relocated in a later phase). Icons are
 * stable module-level references so the list never re-creates them. The list
 * is grouped into two workflow sections: Decide (act on priorities) and
 * Explore (browse the register and analyse patterns).
 */
export const primaryNavigation: NavigationItem[] = [
  { path: '/dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard, group: 'nav.group.decide' },
  { path: '/priority', labelKey: 'nav.priority', icon: ListOrdered, group: 'nav.group.decide' },
  { path: '/decision-map', labelKey: 'nav.decisionMap', icon: Map, group: 'nav.group.decide' },
  { path: '/water-points', labelKey: 'nav.waterPoints', icon: Droplets, group: 'nav.group.explore' },
  { path: '/analytics', labelKey: 'nav.analytics', icon: ChartNoAxesColumn, group: 'nav.group.explore' },
]

export const secondaryNavigation: NavigationItem[] = [
  { path: '/settings', labelKey: 'nav.settings', icon: Settings },
]

/** Primary entries with no group, rendered above the labelled sections. */
export const ungroupedNavigation: NavigationItem[] = primaryNavigation.filter(
  (item) => item.group === undefined,
)

/**
 * The labelled primary sections, in display order. Only groups that actually
 * contain entries are emitted, so adding an item to an existing group is the
 * only edit needed to place it.
 */
export const navigationGroups: { labelKey: MessageKey; items: NavigationItem[] }[] = (
  ['nav.group.decide', 'nav.group.explore'] as const
)
  .map((labelKey) => ({
    labelKey,
    items: primaryNavigation.filter((item) => item.group === labelKey),
  }))
  .filter((group) => group.items.length > 0)

/**
 * Routes removed from the sidebar in the Phase 4 navigation migration but
 * kept reachable by direct URL (per the migration's "redirect/keep safely,
 * don't delete prematurely" rule). Without this, visiting them would title
 * the document "Page not found" even though the page renders correctly.
 * Remove this list only once `/risk` and `/impact` are themselves retired.
 */
const legacyRouteTitles: { path: string; labelKey: MessageKey }[] = [
  { path: '/risk', labelKey: 'nav.risk' },
  { path: '/impact', labelKey: 'nav.impact' },
]

/** Longest path first, so a future `/water-points/map` style route wins. */
const routeTitleCandidates = [
  ...primaryNavigation,
  ...secondaryNavigation,
  ...legacyRouteTitles,
].toSorted((a, b) => b.path.length - a.path.length)

/** Document title suffix for a route, or `undefined` for an unknown path. */
export function routeTitleKey(pathname: string): MessageKey {
  const match = routeTitleCandidates.find(
    (item) => pathname === item.path || pathname.startsWith(`${item.path}/`),
  )

  if (match !== undefined) {
    return match.labelKey
  }
  if (pathname === '/design-system') {
    return 'foundation.title'
  }
  if (pathname === '/') {
    return 'nav.dashboard'
  }
  return 'page.notFound.title'
}
