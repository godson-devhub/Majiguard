import { useEffect } from 'react'
import { Link } from 'react-router'

import { useI18n } from '@/app/providers/locale-provider'
import type { MessageKey } from '@/i18n/messages'

type PublicPlaceholderPageProps = {
  titleKey: MessageKey
  noteKey: MessageKey
}

/** Route-level placeholder for a public page that is not built yet. */
export function PublicPlaceholderPage({ titleKey, noteKey }: PublicPlaceholderPageProps) {
  const { t } = useI18n()

  useEffect(() => {
    document.title = `${t('app.product.name')} · ${t(titleKey)}`
  }, [t, titleKey])

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 px-4 py-16 sm:px-6">
      <h1 className="text-mg-display font-semibold tracking-tight text-foreground">
        {t(titleKey)}
      </h1>
      <p className="text-muted-foreground">{t(noteKey)}</p>
      <Link
        to="/dashboard"
        className="inline-block font-medium text-primary underline-offset-2 hover:underline"
      >
        {t('public.openDashboard')}
      </Link>
    </div>
  )
}
