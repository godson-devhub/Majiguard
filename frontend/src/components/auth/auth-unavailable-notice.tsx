import { Info } from 'lucide-react'

import { useI18n } from '@/app/providers/locale-provider'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

/** Honest outcome of a valid submit: this prototype has no authentication yet. */
export function AuthUnavailableNotice() {
  const { t } = useI18n()

  return (
    <Alert role="status">
      <Info aria-hidden="true" />
      <AlertTitle>{t('auth.notice.title')}</AlertTitle>
      <AlertDescription>{t('auth.notice.body')}</AlertDescription>
    </Alert>
  )
}
