import { Navigate, Outlet, useLocation } from 'react-router'

import { useI18n } from '@/app/providers/locale-provider'
import { useAuth } from '@/app/providers/auth-provider'

/**
 * Gate for every signed-in screen. Anonymous visitors are sent to the sign-in
 * page and returned to where they were headed once they have signed in. This
 * guards the interface; the data API itself is not token-protected yet.
 */
export function RequireAuth() {
  const { status } = useAuth()
  const location = useLocation()
  const { t } = useI18n()

  if (status === 'loading') {
    return (
      <div role="status" aria-live="polite" className="grid min-h-dvh place-items-center bg-background">
        <span className="text-mg-body-sm text-muted-foreground">{t('data.loading')}</span>
      </div>
    )
  }
  if (status === 'anonymous') {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  }
  return <Outlet />
}
