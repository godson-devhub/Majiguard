import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router'

import { useI18n } from '@/app/providers/locale-provider'
import { routeTitleKey } from '@/app/shell/navigation-config'

/**
 * Single-page applications do not announce a route change by themselves. This
 * moves focus to the new page heading, returns the page to the top, and updates
 * the document title — the standard SPA equivalent of a full page load.
 *
 * It deliberately does nothing on the first render, so it never steals focus
 * from the document on a fresh load.
 */
export function RouteChangeAnnouncer() {
  const { pathname } = useLocation()
  const { t } = useI18n()
  const previousPathname = useRef(pathname)

  useEffect(() => {
    if (previousPathname.current === pathname) {
      return
    }
    previousPathname.current = pathname

    const titleKey = routeTitleKey(pathname)
    document.title = `${t('app.product.name')} · ${t(titleKey)}`

    window.scrollTo(0, 0)
    document.getElementById('page-title')?.focus()
  }, [pathname, t])

  return null
}
