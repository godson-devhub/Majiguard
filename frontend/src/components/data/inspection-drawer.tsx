import { useEffect, useRef } from 'react'

import { useI18n } from '@/app/providers/locale-provider'
import { WaterPointInspectionPanel } from '@/components/data/water-point-inspection-panel'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { useMediaQuery } from '@/hooks/use-media-query'
import type { MapPointOut, PriorityItemOut } from '@/types/api'

type InspectionDrawerProps = {
  /** The water point to inspect; `null` keeps the drawer closed. */
  id: number | null
  mapPoint?: MapPointOut | null
  priorityItem?: PriorityItemOut | null
  onClose: () => void
}

/**
 * Details for one water point in a side drawer (about 380px) on wide
 * viewports and in a bottom sheet below `lg`, so opening a row never pushes
 * the list or the map out of view. Focus is trapped while it is open, Escape
 * and the close button dismiss it, and focus returns to the row that opened it.
 */
export function InspectionDrawer({ id, mapPoint = null, priorityItem = null, onClose }: InspectionDrawerProps) {
  const { t } = useI18n()
  const wide = useMediaQuery('(min-width: 64rem)')
  const opener = useRef<HTMLElement | null>(null)

  // Track the last focused control outside the drawer, so closing returns focus
  // there. (The drawer is opened by state, not by a Dialog trigger, so the
  // primitive cannot restore focus by itself.)
  useEffect(() => {
    function remember(event: FocusEvent) {
      const target = event.target
      if (target instanceof HTMLElement && target.closest('[data-slot="sheet-content"]') === null) {
        opener.current = target
      }
    }
    document.addEventListener('focusin', remember)
    return () => {
      document.removeEventListener('focusin', remember)
    }
  }, [])

  return (
    <Sheet
      open={id !== null}
      onOpenChange={(open) => {
        if (!open) {
          onClose()
        }
      }}
    >
      <SheetContent
        side={wide ? 'right' : 'bottom'}
        finalFocus={() => opener.current ?? true}
        className="mg-landing mg-dashboard data-[side=bottom]:max-h-[88dvh] data-[side=right]:w-full"
      >
        <SheetHeader className="border-b border-border pe-14">
          <SheetTitle>{t('detail.inspection.title')}</SheetTitle>
          <SheetDescription className="sr-only">{t('detail.verdict.note')}</SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-4">
          <WaterPointInspectionPanel id={id} mapPoint={mapPoint} priorityItem={priorityItem} />
        </div>
      </SheetContent>
    </Sheet>
  )
}
