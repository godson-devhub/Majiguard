import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'

import { useI18n } from '@/app/providers/locale-provider'
import { NavigationLink } from '@/app/shell/navigation-link'
import {
  navigationGroups,
  secondaryNavigation,
  ungroupedNavigation,
} from '@/app/shell/navigation-config'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

type AppSidebarProps = {
  /** icon-only rail: the collapsed desktop state, or any width below `lg` */
  compact: boolean
  collapsed: boolean
  onToggleCollapsed: () => void
}

/**
 * Primary navigation, grouped into the Decide and Explore workflow sections,
 * with Settings pinned to the bottom beside the collapse control.
 *
 * Section headings are dropped in the icon rail, where there is no room for
 * them, so the rail never shows an orphaned label.
 */
export function AppSidebar({ compact, collapsed, onToggleCollapsed }: AppSidebarProps) {
  const { t } = useI18n()

  return (
    <aside
      className={cn(
        'sticky top-[var(--header-height)] hidden shrink-0 self-start overflow-y-auto overscroll-contain border-e border-sidebar-border bg-sidebar/95 backdrop-blur-sm md:block',
        'h-[calc(100dvh-var(--header-height))]',
        compact ? 'w-16' : 'w-64',
      )}
    >
      <div className="flex h-full flex-col p-3">
        <nav aria-label={t('nav.label')} className="flex flex-1 flex-col">
          {ungroupedNavigation.length > 0 ? (
            <ul className="space-y-0.5">
              {ungroupedNavigation.map((item) => (
                <li key={item.path}>
                  <NavigationLink item={item} compact={compact} />
                </li>
              ))}
            </ul>
          ) : null}

          {navigationGroups.map((group, index) => (
            <div key={group.labelKey} className={cn(index > 0 && 'mt-2')}>
              {compact ? (
                index > 0 ? <Separator className="my-2 bg-sidebar-border" /> : null
              ) : (
                <p className="px-3 pb-1 pt-3 text-mg-caption font-semibold uppercase tracking-wider text-muted-foreground">
                  {t(group.labelKey)}
                </p>
              )}
              <ul className="space-y-0.5">
                {group.items.map((item) => (
                  <li key={item.path}>
                    <NavigationLink item={item} compact={compact} />
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div className="mt-auto pt-4">
            <Separator className="mb-3 bg-sidebar-border" />
            <ul className="space-y-0.5">
              {secondaryNavigation.map((item) => (
                <li key={item.path}>
                  <NavigationLink item={item} compact={compact} />
                </li>
              ))}
            </ul>
          </div>
        </nav>

        <div className="hidden pt-2 lg:block">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleCollapsed}
            aria-pressed={collapsed}
            className={cn(
              'w-full text-muted-foreground',
              compact ? 'justify-center px-2' : 'justify-start gap-3',
            )}
          >
            {collapsed ? (
              <PanelLeftOpen aria-hidden="true" className="size-4" />
            ) : (
              <PanelLeftClose aria-hidden="true" className="size-4" />
            )}
            <span className={compact ? 'sr-only' : undefined}>
              {t(collapsed ? 'shell.expandSidebar' : 'shell.collapseSidebar')}
            </span>
          </Button>
        </div>
      </div>
    </aside>
  )
}
