/** Dynamic imports for every signed-in screen, shared by the router and the shell's idle preload. */
export const loaders = {
  analytics: () => import('@/app/routes/analytics-route').then((m) => ({ default: m.AnalyticsRoute })),
  decisionMap: () => import('@/app/routes/decision-map-route').then((m) => ({ default: m.DecisionMapRoute })),
  designSystem: () => import('@/app/routes/design-system-route').then((m) => ({ default: m.DesignSystemRoute })),
  login: () => import('@/app/routes/login-route').then((m) => ({ default: m.LoginRoute })),
  overview: () => import('@/app/routes/overview-route').then((m) => ({ default: m.OverviewRoute })),
  priority: () => import('@/app/routes/priority-route').then((m) => ({ default: m.PriorityRoute })),
  settings: () => import('@/app/routes/settings-route').then((m) => ({ default: m.SettingsRoute })),
  signup: () => import('@/app/routes/signup-route').then((m) => ({ default: m.SignupRoute })),
  sections: () => import('@/app/routes/section-routes'),
}

/** Warm every app chunk while the browser is idle. Safe to call repeatedly. */
export function preloadAppRoutes(): void {
  const run = () => {
    for (const load of Object.values(loaders)) {
      void load()
    }
  }
  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(run, { timeout: 3000 })
  } else {
    window.setTimeout(run, 1500)
  }
}
