import { NavLink, useMatch } from 'react-router'

import { useI18n } from '@/app/providers/locale-provider'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { NavigationItem } from '@/app/shell/navigation-config'

type NavigationLinkProps = {
  item: NavigationItem
  /** icon-only presentation, used by the collapsed rail and the tablet breakpoint */
  compact: boolean
  onNavigate?: () => void
}

/**
 * One navigation entry, shared by the desktop sidebar and the mobile drawer.
 *
 * The current section is signalled three ways so it never depends on colour
 * alone: `aria-current="page"` from NavLink, a heavier font weight, and a solid
 * leading bar (full layout) or an inset ring (compact layout).
 */
export function NavigationLink({ item, compact, onNavigate }: NavigationLinkProps) {
  const { t } = useI18n()
  const isActive = useMatch({ path: item.path, end: false }) !== null
  const label = t(item.labelKey)
  const Icon = item.icon

  const link = (
    <NavLink
      to={item.path}
      onClick={onNavigate}
      className={cn(
        'group relative flex min-h-11 items-center rounded-sm text-mg-body-sm transition-colors',
        compact ? 'justify-center px-2' : 'gap-3 px-3',
        isActive
          ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
          : 'text-sidebar-foreground hover:bg-sidebar-accent/50',
        compact && isActive && 'ring-1 ring-sidebar-primary ring-inset',
      )}
    >
      {isActive ? (
        <span
          aria-hidden="true"
          className={cn(
            'absolute inset-y-1.5 start-0 w-0.5 rounded-full bg-sidebar-primary',
            compact ? 'sr-only' : undefined,
          )}
        />
      ) : null}
      <Icon
        aria-hidden="true"
        className={cn(
          'size-4 shrink-0',
          isActive ? 'text-sidebar-primary' : 'text-muted-foreground group-hover:text-foreground',
        )}
      />
      <span className={compact ? 'sr-only' : undefined}>{label}</span>
    </NavLink>
  )

  if (!compact) {
    return link
  }

  return (
    <Tooltip>
      <TooltipTrigger render={link} />
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}
