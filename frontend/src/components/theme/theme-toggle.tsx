import { useId } from 'react'
import { Moon, Sun } from 'lucide-react'

import { useTheme } from '@/app/providers/theme-provider'
import { useI18n } from '@/app/providers/locale-provider'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

/**
 * Compact sun / moon switch. A real `role="switch"` button whose accessible
 * name is the translated "Dark mode" label, with the existing description read
 * on demand. The state is shown by the thumb position and the highlighted
 * icon, never by colour alone. The visible text label is gone; the tooltip
 * and the accessible name carry it instead.
 */
export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const { t } = useI18n()
  const descriptionId = `${useId()}-description`
  const isDark = theme === 'dark'

  return (
    <>
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              type="button"
              role="switch"
              aria-checked={isDark}
              aria-label={t('theme.label')}
              aria-describedby={descriptionId}
              onClick={toggleTheme}
              className="relative inline-flex h-9 w-16 shrink-0 items-center rounded-full border border-input bg-muted pointer-coarse:h-11"
            />
          }
        >
          <span
            aria-hidden="true"
            className={cn(
              'mg-transition absolute start-0.5 top-1/2 size-7 -translate-y-1/2 rounded-full border border-border-strong bg-card transition-transform pointer-coarse:size-9',
              isDark && 'translate-x-[1.875rem] pointer-coarse:translate-x-[1.375rem]',
            )}
          />
          <Sun
            aria-hidden="true"
            className={cn(
              'relative z-10 ms-2 size-4 shrink-0',
              isDark ? 'text-muted-foreground' : 'text-brand',
            )}
          />
          <Moon
            aria-hidden="true"
            className={cn(
              'relative z-10 ms-auto me-2 size-4 shrink-0',
              isDark ? 'text-brand' : 'text-muted-foreground',
            )}
          />
        </TooltipTrigger>
        <TooltipContent>{t('theme.label')}</TooltipContent>
      </Tooltip>
      <span id={descriptionId} className="sr-only">
        {t('theme.description')}
      </span>
    </>
  )
}
