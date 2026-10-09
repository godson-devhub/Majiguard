import { useCallback, useEffect, useState, type PointerEvent } from 'react'
import { Outlet } from 'react-router'

import { useI18n } from '@/app/providers/locale-provider'
import { AppFooter } from '@/app/shell/app-footer'
import { AppHeader } from '@/app/shell/app-header'
import { AppSidebar } from '@/app/shell/app-sidebar'
import { MobileNavigation } from '@/app/shell/mobile-navigation'
import { RouteChangeAnnouncer } from '@/app/shell/route-change-announcer'
import { DashboardControls } from '@/app/shell/dashboard-controls'
import { cn } from '@/lib/utils'
import { preloadAppRoutes } from '@/app/route-loaders'
import { prioritySummaryQueryOptions } from '@/hooks/priority'
import { waterPointListQueryOptions } from '@/hooks/water-points'
import { FUNCTIONAL_STATUS, NON_FUNCTIONAL_STATUS } from '@/hooks/estate-kpis'
import { useQueryClient } from '@tanstack/react-query'
import { useMediaQuery } from '@/hooks/use-media-query'

/** Feeds the glass cards' cursor light: position relative to the hovered card. */
function trackSpotlight(event: PointerEvent<HTMLElement>) {
  const card = (event.target as HTMLElement).closest<HTMLElement>('.mg-glass')
  if (card === null) {
    return
  }
  const box = card.getBoundingClientRect()
  card.style.setProperty('--mx', `${event.clientX - box.left}px`)
  card.style.setProperty('--my', `${event.clientY - box.top}px`)
}

const SIDEBAR_STORAGE_KEY = 'majiguard.sidebar'

function readSidebarPreference(): boolean {
  if (typeof window === 'undefined') {
    return false
  }
  return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'collapsed'
}

/**
 * The internal application shell: institutional header, primary navigation,
 * and the routed content region.
 *
 * Navigation adapts in three deliberate steps rather than shrinking one layout:
 *   below `md`  a focus-trapped drawer opened from the header
 *   `md`–`lg`   a 64px icon rail with tooltips and accessible names
 *   `lg` and up a 256px labelled sidebar the user can collapse to the rail
 */
export function AppShell() {
  const { t } = useI18n()
  const queryClient = useQueryClient()
  const isDashboard = true // every app screen shares the glass shell
  const [navigationOpen, setNavigationOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(readSidebarPreference)
  const isWideViewport = useMediaQuery('(min-width: 64rem)')
  const compact = collapsed || !isWideViewport

  useEffect(() => {
    window.localStorage.setItem(
      SIDEBAR_STORAGE_KEY,
      collapsed ? 'collapsed' : 'expanded',
    )
  }, [collapsed])

  // Start the national figures and the other screens' code immediately and in
  // parallel, so they are usually ready before the user opens them.
  useEffect(() => {
    void queryClient.prefetchQuery(prioritySummaryQueryOptions())
    void queryClient.prefetchQuery(waterPointListQueryOptions({ page: 1, page_size: 1 }))
    for (const status of [FUNCTIONAL_STATUS, NON_FUNCTIONAL_STATUS]) {
      void queryClient.prefetchQuery(
        waterPointListQueryOptions({ page: 1, page_size: 1, observed_status: status }),
      )
    }
    preloadAppRoutes()
  }, [queryClient])

  const toggleCollapsed = useCallback(() => {
    setCollapsed((current) => !current)
  }, [])

  return (
    <div className={cn('flex min-h-dvh flex-col bg-background text-foreground', isDashboard && 'mg-landing mg-dashboard')}>
      <a
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:text-mg-body-sm focus:font-medium focus:text-foreground focus:shadow-mg-2"
        href="#main-content"
      >
        {t('app.skipToContent')}
      </a>

      {/*
        No `max-w`/`mx-auto` on this row: the sidebar must reach the real
        viewport edge on every screen width, including ultra-wide ones,
        not just the edge of a centred content container. Only the content
        column's own inner wrapper (around `<Outlet />` below) is width-capped
        for readability - the sidebar, header and footer all stay full-bleed.
      */}
      {isDashboard ? null : (
        <AppHeader
          leading={
            <MobileNavigation open={navigationOpen} onOpenChange={setNavigationOpen} />
          }
        />
      )}
      <div className="flex w-full flex-1 items-start">
        <AppSidebar
          compact={compact}
          collapsed={collapsed}
          onToggleCollapsed={toggleCollapsed}
          headerless={isDashboard}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <main
            id="main-content"
            tabIndex={-1}
            className="flex-1"
            onPointerMove={isDashboard ? trackSpotlight : undefined}
          >
            <div className={cn('w-full px-4 lg:px-8 xl:px-10', isDashboard ? 'pb-4 pt-3' : 'py-6')}>
              {isDashboard ? (
                <>
                  <DashboardControls />
                  <div className="mb-2 flex h-9 items-center md:hidden">
                    <MobileNavigation
                      open={navigationOpen}
                      onOpenChange={setNavigationOpen}
                      triggerClassName="text-foreground hover:bg-accent"
                    />
                  </div>
                </>
              ) : null}
              <RouteChangeAnnouncer />
              <Outlet />
            </div>
          </main>
          {isDashboard ? null : <AppFooter />}
        </div>
      </div>
    </div>
  )
}
