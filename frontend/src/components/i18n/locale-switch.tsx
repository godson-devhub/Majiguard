import { useId } from 'react'

import { availableLocales, useI18n, type Locale } from '@/app/providers/locale-provider'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export function LocaleSwitch() {
  const { locale, setLocale, t } = useI18n()
  const triggerId = useId()
  const labelId = `${triggerId}-label`

  return (
    <div className="flex items-center gap-2">
      <Label id={labelId} htmlFor={triggerId} className="text-mg-label text-foreground">
        {t('locale.label')}
      </Label>
      <Select
        value={locale}
        onValueChange={(value) => {
          setLocale(value as Locale)
        }}
      >
        <SelectTrigger id={triggerId} aria-labelledby={labelId} className="w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {availableLocales.map((entry) => (
            <SelectItem key={entry.locale} value={entry.locale}>
              {t(entry.label)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
