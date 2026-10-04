import { Navigate, Route, Routes } from 'react-router'

import { AppShell } from '@/app/shell/app-shell'
import { AnalyticsRoute } from '@/app/routes/analytics-route'
import { DecisionMapRoute } from '@/app/routes/decision-map-route'
import { DesignSystemRoute } from '@/app/routes/design-system-route'
import { OverviewRoute } from '@/app/routes/overview-route'
import { PriorityRoute } from '@/app/routes/priority-route'
import {
  ImpactRoute,
  NotFoundRoute,
  RiskRoute,
  SettingsRoute,
  WaterPointsRoute,
} from '@/app/routes/section-routes'

/**
 * Shell routes. `risk` and `impact` are kept reachable by direct URL per the
 * Phase 4 navigation migration (removed from the sidebar, not deleted, so no
 * existing functionality is lost prematurely) - see `legacyRouteTitles` in
 * `navigation-config.ts` for the matching document-title fix. `dashboard`
 * now renders the decision-first `OverviewRoute` (Phase 4A.1); the path
 * itself is unchanged.
 */
export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Navigate replace to="/dashboard" />} />
        <Route path="dashboard" element={<OverviewRoute />} />
        <Route path="priority" element={<PriorityRoute />} />
        <Route path="water-points" element={<WaterPointsRoute />} />
        <Route path="decision-map" element={<DecisionMapRoute />} />
        <Route path="risk" element={<RiskRoute />} />
        <Route path="impact" element={<ImpactRoute />} />
        <Route path="analytics" element={<AnalyticsRoute />} />
        <Route path="settings" element={<SettingsRoute />} />
        <Route path="design-system" element={<DesignSystemRoute />} />
        <Route path="*" element={<NotFoundRoute />} />
      </Route>
    </Routes>
  )
}
