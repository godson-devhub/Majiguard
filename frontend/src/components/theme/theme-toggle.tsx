import { useId } from 'react'

import { useTheme } from '@/app/providers/theme-provider'
import { useI18n } from '@/app/providers/locale-provider'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const { t } = useI18n()
  const switchId = useId()
  const descriptionId = `${switchId}-description`
  const isDark = theme === 'dark'

  return (
    <div className="flex items-center gap-2">
      <Switch
        id={switchId}
        checked={isDark}
        onCheckedChange={toggleTheme}
        aria-describedby={descriptionId}
      />
      <Label htmlFor={switchId} className="text-mg-label text-foreground">
        {t('theme.label')}
      </Label>
      <span id={descriptionId} className="sr-only">
        {t('theme.description')}
      </span>
    </div>
  )
}
