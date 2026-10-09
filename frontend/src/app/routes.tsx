import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router'

import { PublicLayout } from '@/app/public/public-layout'
import { AppShell } from '@/app/shell/app-shell'
import { RequireAuth } from '@/app/shell/require-auth'
import { loaders } from '@/app/route-loaders'
import { LandingRoute } from '@/app/routes/landing-route'

/**
 * Every signed-in screen is its own chunk, so opening the landing page or the
 * login page never downloads the map, the charts or the data tables. The
 * chunks are fetched in the background once the shell is idle (see
 * `preloadAppRoutes`), so moving between sections feels instant.
 */

const AnalyticsRoute = lazy(loaders.analytics)
const DecisionMapRoute = lazy(loaders.decisionMap)
const DesignSystemRoute = lazy(loaders.designSystem)
const LoginRoute = lazy(loaders.login)
const OverviewRoute = lazy(loaders.overview)
const PriorityRoute = lazy(loaders.priority)
const SettingsRoute = lazy(loaders.settings)
const SignupRoute = lazy(loaders.signup)
const ImpactRoute = lazy(() => loaders.sections().then((m) => ({ default: m.ImpactRoute })))
const NotFoundRoute = lazy(() => loaders.sections().then((m) => ({ default: m.NotFoundRoute })))
const RiskRoute = lazy(() => loaders.sections().then((m) => ({ default: m.RiskRoute })))
const WaterPointsRoute = lazy(() => loaders.sections().then((m) => ({ default: m.WaterPointsRoute })))

function RouteFallback() {
  return <div role="status" aria-live="polite" className="min-h-[40vh]"><span className="sr-only">Loading</span></div>
}

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
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route index element={<LandingRoute />} />
          <Route path="login" element={<LoginRoute />} />
          <Route path="signup" element={<SignupRoute />} />
        </Route>
        <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
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
        </Route>
      </Routes>
    </Suspense>
  )
}
