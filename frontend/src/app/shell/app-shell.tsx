import { useCallback, useEffect, useState } from 'react'
import { Outlet } from 'react-router'

import { useI18n } from '@/app/providers/locale-provider'
import { AppFooter } from '@/app/shell/app-footer'
import { AppHeader } from '@/app/shell/app-header'
import { AppSidebar } from '@/app/shell/app-sidebar'
import { MobileNavigation } from '@/app/shell/mobile-navigation'
import { RouteChangeAnnouncer } from '@/app/shell/route-change-announcer'
import { useMediaQuery } from '@/hooks/use-media-query'

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

  const toggleCollapsed = useCallback(() => {
    setCollapsed((current) => !current)
  }, [])

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <a
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:text-mg-body-sm focus:font-medium focus:text-foreground focus:shadow-mg-2"
        href="#main-content"
      >
        {t('app.skipToContent')}
      </a>

      <div className="sticky top-0 z-40">
        <AppHeader
          leading={
            <MobileNavigation
              open={navigationOpen}
              onOpenChange={setNavigationOpen}
            />
          }
        />
      </div>

      {/*
        No `max-w`/`mx-auto` on this row: the sidebar must reach the real
        viewport edge on every screen width, including ultra-wide ones,
        not just the edge of a centred content container. Only the content
        column's own inner wrapper (around `<Outlet />` below) is width-capped
        for readability - the sidebar, header and footer all stay full-bleed.
      */}
      <div className="flex w-full flex-1 items-start">
        <AppSidebar
          compact={compact}
          collapsed={collapsed}
          onToggleCollapsed={toggleCollapsed}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <main id="main-content" tabIndex={-1} className="flex-1">
            <div className="mx-auto w-full max-w-[100rem] px-4 py-6 lg:px-6 xl:px-8">
              <RouteChangeAnnouncer />
              <Outlet />
            </div>
          </main>
          <AppFooter />
        </div>
      </div>
    </div>
  )
}
