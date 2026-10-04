import { useEffect } from 'react'
import { Menu, X } from 'lucide-react'

import { useI18n } from '@/app/providers/locale-provider'
import { primaryNavigation, secondaryNavigation } from '@/app/shell/navigation-config'
import { NavigationLink } from '@/app/shell/navigation-link'
import { useMediaQuery } from '@/hooks/use-media-query'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'

type MobileNavigationProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Navigation for viewports below `md`, where the sidebar has no room. The
 * sidebar takes over at `md`, so the drawer closes itself if the viewport
 * grows past that point while it is open.
 *
 * Focus handling, the focus trap, Escape-to-close and `aria-expanded` /
 * `aria-controls` on the trigger all come from the Base UI dialog primitive.
 */
export function MobileNavigation({ open, onOpenChange }: MobileNavigationProps) {
  const { t } = useI18n()
  const sidebarVisible = useMediaQuery('(min-width: 48rem)')

  useEffect(() => {
    if (sidebarVisible) {
      onOpenChange(false)
    }
  }, [sidebarVisible, onOpenChange])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="text-sidebar-foreground md:hidden"
          />
        }
      >
        <Menu aria-hidden="true" className="size-4" />
        <span className="sr-only">{t('shell.openNavigation')}</span>
      </SheetTrigger>

      <SheetContent
        side="left"
        showCloseButton={false}
        className="w-72 max-w-[85vw] gap-0 border-e border-sidebar-border bg-sidebar p-0 text-sidebar-foreground"
      >
        <div className="flex items-center justify-between gap-2 border-b border-sidebar-border px-3 py-2.5">
          <SheetTitle className="text-mg-title-sm font-semibold text-sidebar-foreground">
            {t('shell.drawerTitle')}
          </SheetTitle>
          <SheetClose
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-sidebar-foreground"
              />
            }
          >
            <X aria-hidden="true" className="size-4" />
            <span className="sr-only">{t('shell.closeNavigation')}</span>
          </SheetClose>
        </div>

        <SheetDescription className="sr-only">
          {t('shell.drawerDescription')}
        </SheetDescription>

        <nav
          aria-label={t('nav.drawerLabel')}
          className="flex-1 overflow-y-auto overscroll-contain p-2"
        >
          <ul className="space-y-0.5">
            {primaryNavigation.map((item) => (
              <li key={item.path}>
                <NavigationLink
                  item={item}
                  compact={false}
                  onNavigate={() => {
                    onOpenChange(false)
                  }}
                />
              </li>
            ))}
          </ul>

          <Separator className="my-3 bg-sidebar-border" />

          <ul className="space-y-0.5">
            {secondaryNavigation.map((item) => (
              <li key={item.path}>
                <NavigationLink
                  item={item}
                  compact={false}
                  onNavigate={() => {
                    onOpenChange(false)
                  }}
                />
              </li>
            ))}
          </ul>
        </nav>
      </SheetContent>
    </Sheet>
  )
}
