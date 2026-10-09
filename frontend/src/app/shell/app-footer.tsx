import { Link } from 'react-router'

import { useI18n } from '@/app/providers/locale-provider'

/**
 * Footer in the e-Government Authority style: a layered wave rising out of the
 * white page into a solid ocean-blue block. Identity and the independent-tool
 * disclaimer stay present: MajiGuard is never presented as an official
 * Government of Tanzania system.
 */
type AppFooterProps = {
  /** Public-page footer: no links into the app, and the intended-audience line. */
  guest?: boolean
}

export function AppFooter({ guest = false }: AppFooterProps) {
  const { t } = useI18n()

  return (
    <footer className="mt-12 bg-white text-footer-foreground">
      <svg
        aria-hidden="true"
        viewBox="0 0 1440 120"
        preserveAspectRatio="none"
        className="-mb-px block h-16 w-full sm:h-24"
      >
        <path
          fill="var(--mg-water-400)"
          fillOpacity="0.55"
          d="M0 70 C240 10 420 20 640 55 C900 95 1120 25 1440 45 L1440 120 L0 120 Z"
        />
        <path
          fill="var(--footer)"
          d="M0 95 C220 35 460 45 700 75 C960 108 1180 50 1440 70 L1440 120 L0 120 Z"
        />
      </svg>
      <div className="bg-footer">
        <div className="flex w-full flex-col gap-6 px-4 pb-10 pt-2 text-mg-body-sm text-white sm:flex-row sm:items-start sm:justify-between lg:px-8 xl:px-10">
          <div className="min-w-0 space-y-1.5">
            <p className="text-mg-body font-bold">
              {t('app.brand.name')}
              {' · '}
              <span className="font-normal">{t('app.brand.officialName')}</span>
            </p>
            <p>{t('app.footer.descriptor')}</p>
            <p>{t(guest ? 'landing.footer.audience' : 'app.footer.disclaimer')}</p>
            <p>{t('data.source')}</p>
          </div>

          {guest ? null : <nav aria-label={t('footer.navLabel')} className="shrink-0">
            <ul className="flex flex-wrap gap-x-5 gap-y-1 font-semibold sm:flex-col">
              <li>
                <Link to="/settings#about" className="underline-offset-2 hover:underline">
                  {t('footer.about')}
                </Link>
              </li>
              <li>
                <Link to="/settings#methodology" className="underline-offset-2 hover:underline">
                  {t('footer.methodology')}
                </Link>
              </li>
            </ul>
          </nav>}
        </div>
      </div>
    </footer>
  )
}
