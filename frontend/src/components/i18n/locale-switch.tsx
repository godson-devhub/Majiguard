import { availableLocales, useI18n } from '@/app/providers/locale-provider'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

/** Visible short codes; the accessible name and tooltip are the full language name. */
const SHORT_CODE = { en: 'EN', sw: 'SW' } as const

/**
 * Compact two-option language control. Each option is a real button that
 * exposes `aria-pressed`, and the group is named by the translated "Language"
 * label. The selected option is signalled by a filled brand surface, not only
 * by colour: it is the only option with a solid fill.
 */
export function LocaleSwitch() {
  const { locale, setLocale, t } = useI18n()

  return (
    <div
      role="group"
      aria-label={t('locale.label')}
      className="inline-flex h-9 items-center gap-0.5 rounded-control border border-input bg-background p-0.5 pointer-coarse:h-11"
    >
      {availableLocales.map((entry) => {
        const selected = entry.locale === locale
        const name = t(entry.label)
        return (
          <Tooltip key={entry.locale}>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  aria-pressed={selected}
                  aria-label={name}
                  lang={entry.locale}
                  onClick={() => {
                    setLocale(entry.locale)
                  }}
                  className={cn(
                    'mg-transition h-full min-w-9 rounded-sm px-2 text-mg-caption font-semibold transition-colors',
                    selected
                      ? 'bg-brand text-brand-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                  )}
                />
              }
            >
              {SHORT_CODE[entry.locale]}
            </TooltipTrigger>
            <TooltipContent>{name}</TooltipContent>
          </Tooltip>
        )
      })}
    </div>
  )
}
