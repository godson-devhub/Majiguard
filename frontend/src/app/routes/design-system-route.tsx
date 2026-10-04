import type { MessageKey } from '@/i18n/messages'
import { useI18n } from '@/app/providers/locale-provider'
import { FoundationPage } from '@/app/foundation/foundation-page'

const sectionLinks: { href: string; labelKey: MessageKey }[] = [
  { href: '#typography', labelKey: 'foundation.typography' },
  { href: '#colour', labelKey: 'foundation.colour' },
  { href: '#structure', labelKey: 'foundation.structure' },
  { href: '#components', labelKey: 'foundation.components' },
  { href: '#states', labelKey: 'foundation.states' },
  { href: '#map', labelKey: 'foundation.map' },
  { href: '#localisation', labelKey: 'foundation.localisation' },
  { href: '#accessibility', labelKey: 'foundation.accessibility' },
]

/**
 * The Step 9.2 design-system reference, kept reachable at `/design-system` so
 * the token and primitive surface stays reviewable. It is deliberately not part
 * of the product navigation.
 */
export function DesignSystemRoute() {
  const { t } = useI18n()

  return (
    <div className="space-y-6">
      <div>
        <h1
          id="page-title"
          tabIndex={-1}
          className="text-mg-title-lg font-semibold text-foreground"
        >
          {t('foundation.title')}
        </h1>
        <p className="mt-2 max-w-[68ch] text-mg-body text-muted-foreground">
          {t('foundation.intro')}
        </p>

        <nav aria-label={t('foundation.title')} className="mt-6">
          <ul className="flex flex-wrap gap-2">
            {sectionLinks.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="inline-flex rounded-sm border border-border-strong px-3 py-1.5 text-mg-label font-medium text-foreground hover:bg-accent hover:text-accent-foreground"
                >
                  {t(link.labelKey)}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <FoundationPage />
    </div>
  )
}
