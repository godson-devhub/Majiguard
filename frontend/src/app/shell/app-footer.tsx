import { Link } from 'react-router'

import { useI18n } from '@/app/providers/locale-provider'

/**
 * Compact institutional footer. Identity on the left, supporting links on the
 * right, and the independent-tool disclaimer always present: MajiGuard is never
 * presented as an official Government of Tanzania system, and no affiliation
 * is claimed beyond the approved wording.
 */
export function AppFooter() {
  const { t } = useI18n()

  return (
    <footer className="border-t-4 border-primary bg-header text-header-foreground">
      <div className="mx-auto flex w-full max-w-[100rem] flex-col gap-4 px-4 py-10 sm:py-12 text-mg-caption text-header-foreground/75 sm:flex-row sm:items-start sm:justify-between lg:px-6 xl:px-8">
        <div className="min-w-0 space-y-1">
          <p>
            <span className="font-semibold text-header-foreground">{t('app.brand.name')}</span>
            {' · '}
            <span>{t('app.brand.officialName')}</span>
          </p>
          <p>{t('app.footer.descriptor')}</p>
          <p>{t('app.footer.disclaimer')}</p>
          <p>{t('data.source')}</p>
        </div>

        <nav aria-label={t('footer.navLabel')} className="shrink-0">
          <ul className="flex flex-wrap gap-x-4 gap-y-1 sm:flex-col">
            <li>
              <Link
                to="/settings#about"
                className="text-header-foreground underline-offset-2 hover:underline"
              >
                {t('footer.about')}
              </Link>
            </li>
            <li>
              <Link
                to="/settings#methodology"
                className="text-header-foreground underline-offset-2 hover:underline"
              >
                {t('footer.methodology')}
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </footer>
  )
}
