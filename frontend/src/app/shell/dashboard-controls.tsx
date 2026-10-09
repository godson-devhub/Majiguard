import { LogOut, SlidersHorizontal } from 'lucide-react'
import { useLocation, useNavigate, useSearchParams } from 'react-router'

import { useAuth } from '@/app/providers/auth-provider'
import { useI18n } from '@/app/providers/locale-provider'
import { institutionLabel } from '@/components/auth/institution-label'
import { RegisterFilterBar } from '@/components/data/register-filter-bar'
import { LocaleSwitch } from '@/components/i18n/locale-switch'
import { ThemeToggle } from '@/components/theme/theme-toggle'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { scopeLabel } from '@/lib/priority-presentation'
import type { RegisterFilters } from '@/lib/register-reference'

/**
 * One floating bubble, top-right of the dashboard, that gathers the language
 * switch, the theme switch and the Region/District/Ward filter. The filter is
 * the same URL contract the page reads (`region`, `district`, `ward`), so the
 * bubble and the figures can never disagree.
 */
export function DashboardControls() {
  const { t } = useI18n()
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const pathname = useLocation().pathname
  const showLocation = ['/dashboard', '/priority', '/water-points', '/analytics'].includes(pathname)

  const filters: RegisterFilters = {
    region: searchParams.get('region'),
    status: null,
    district: searchParams.get('district'),
    ward: searchParams.get('ward'),
  }
  const scoped = filters.region !== null

  function setFilters(next: RegisterFilters) {
    const params = new URLSearchParams(searchParams)
    for (const key of ['region', 'district', 'ward']) {
      params.delete(key)
    }
    if (next.region !== null) {
      params.set('region', next.region)
    }
    if (next.district) {
      params.set('district', next.district)
    }
    if (next.ward) {
      params.set('ward', next.ward)
    }
    setSearchParams(params, { replace: true })
  }

  return (
    <div className="fixed end-4 top-3 z-40 sm:end-6">
      <Popover>
        <PopoverTrigger
          aria-label={t('dashboard.controls.open')}
          className="group flex h-9 max-w-[min(18rem,calc(100vw-5rem))] items-center gap-2 rounded-full border border-white/80 bg-white/65 ps-3 pe-3.5 text-mg-caption font-semibold text-foreground shadow-mg-3 backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/85 hover:shadow-[0_18px_40px_-14px_oklch(0.4_0.14_255/0.5)] data-popup-open:bg-primary data-popup-open:text-primary-foreground dark:border-white/15 dark:bg-card/70"
        >
          <SlidersHorizontal
            aria-hidden="true"
            className="size-4 shrink-0 transition-transform duration-300 group-hover:rotate-90"
          />
          <span className="min-w-0 truncate">{showLocation ? scopeLabel(filters, t) : t('locale.label')}</span>
          {showLocation && scoped ? (
            <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-amber-400" />
          ) : null}
        </PopoverTrigger>

        <PopoverContent
          align="end"
          sideOffset={10}
          className="w-[min(24rem,calc(100vw-2rem))] space-y-5 rounded-2xl border-white/70 bg-popover/90 p-5 shadow-mg-3 backdrop-blur-xl"
        >
          {user === null ? null : (
            <div className="flex items-center justify-between gap-3 rounded-xl bg-primary/10 px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-mg-body-sm font-semibold text-foreground">{user.full_name}</p>
                <p className="truncate text-mg-caption text-muted-foreground">
                  {institutionLabel(user.institution, t)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  logout()
                  navigate('/login', { replace: true })
                }}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-mg-caption font-semibold text-foreground transition-colors hover:bg-accent"
              >
                <LogOut aria-hidden="true" className="size-3.5" />
                {t('auth.logout')}
              </button>
            </div>
          )}
          <div className="flex items-center justify-between gap-4">
            <p className="text-mg-body-sm font-semibold text-foreground">{t('locale.label')}</p>
            <LocaleSwitch />
          </div>
          <div className="flex items-center justify-between gap-4">
            <p className="text-mg-body-sm font-semibold text-foreground">{t('theme.label')}</p>
            <ThemeToggle />
          </div>
          {showLocation ? (
          <div className="space-y-2 border-t border-border pt-4">
            <p className="text-mg-caption font-semibold uppercase tracking-wider text-muted-foreground">
              {t('overview.filters.label')}
            </p>
            <RegisterFilterBar value={filters} onChange={setFilters} showStatus={false} stacked />
          </div>
          ) : null}
        </PopoverContent>
      </Popover>
    </div>
  )
}
