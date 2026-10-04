import { useI18n } from '@/app/providers/locale-provider'

/**
 * Restrained product footer. States what MajiGuard is in one line and, just
 * as importantly, what it is not - an independent tool, never presented as
 * an official Government of Tanzania system.
 */
export function AppFooter() {
  const { t } = useI18n()

  return (
    <footer className="border-t border-footer-border bg-footer">
      <div className="mx-auto flex w-full max-w-[100rem] flex-col gap-1.5 px-4 py-5 text-mg-caption text-footer-foreground sm:flex-row sm:items-center sm:justify-between lg:px-6 xl:px-8">
        <p>
          <span className="font-medium text-foreground">{t('app.product.name')}</span>
          {' — '}
          {t('app.footer.descriptor')}
        </p>
        <p>{t('app.footer.disclaimer')}</p>
      </div>
    </footer>
  )
}
