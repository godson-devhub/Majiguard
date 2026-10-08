import { ChevronDown, List } from 'lucide-react'
import { useState } from 'react'

import { useI18n } from '@/app/providers/locale-provider'
import { layerRampStops } from '@/components/map/map-layers'
import type { MapLayerId } from '@/components/map/map-layers'
import type { MessageKey } from '@/i18n/messages'
import { cn } from '@/lib/utils'

type ConditionRow = {
  /** marker tone class: colour AND shape (circle, square, diamond) */
  tone: 'functional' | 'nonfunctional' | 'warning' | 'info' | 'neutral'
  /** the register statuses this marker stands for */
  labelKeys: MessageKey[]
}

/** One row per marker appearance, so every swatch on the map has exactly one
 * legend entry. The marker shape differs by tone (circle, square, diamond), so
 * the condition reads without relying on colour alone. */
const CONDITION_ROWS: ConditionRow[] = [
  { tone: 'functional', labelKeys: ['observed.functional'] },
  { tone: 'nonfunctional', labelKeys: ['observed.nonFunctional'] },
  { tone: 'warning', labelKeys: ['observed.functionalNeedsRepair', 'observed.nonFunctionalDrySeason'] },
  { tone: 'info', labelKeys: ['observed.functionalNotInUse'] },
  { tone: 'neutral', labelKeys: ['observed.abandoned', 'observed.others'] },
]

const TITLE_KEYS: Record<Exclude<MapLayerId, 'condition'>, MessageKey> = {
  risk: 'map.legend.risk.title',
  impact: 'map.legend.impact.title',
  priority: 'map.legend.priority.title',
  consequence: 'map.legend.consequence.title',
  preventive: 'map.legend.preventive.title',
  restoration: 'map.legend.restoration.title',
}

const NOTE_KEYS: Record<Exclude<MapLayerId, 'condition'>, MessageKey> = {
  risk: 'map.legend.note.risk',
  impact: 'map.legend.note.impact',
  priority: 'map.legend.note.priority',
  consequence: 'map.legend.note.consequence',
  preventive: 'map.legend.note.preventive',
  restoration: 'map.legend.note.restoration',
}

function LegendBody({ layer }: { layer: MapLayerId }) {
  const { t } = useI18n()

  if (layer === 'condition') {
    return (
      <div className="space-y-1.5">
        <p className="text-mg-caption font-semibold text-foreground">{t('map.legend.condition')}</p>
        <ul className="space-y-1.5">
          {CONDITION_ROWS.map((row) => (
            <li key={row.tone} className="flex items-start gap-2">
              <span aria-hidden="true" className="mt-1 flex size-3 shrink-0 items-center justify-center">
                <span className={`mg-water-marker mg-water-marker--${row.tone}`} />
              </span>
              <span className="text-mg-caption text-foreground">
                {row.labelKeys.map((key) => t(key)).join(' · ')}
              </span>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  const stops = layerRampStops(layer)
  if (stops === null) {
    return null
  }

  return (
    <div className="space-y-1.5">
      <p className="text-mg-caption font-semibold text-foreground">{t(TITLE_KEYS[layer])}</p>
      <div
        aria-hidden="true"
        className="flex h-2.5 w-36 overflow-hidden rounded-full border border-map-overlay-border"
      >
        {stops.map((color, index) => (
          <span key={index} className="h-full flex-1" style={{ backgroundColor: color }} />
        ))}
      </div>
      <div className="flex w-36 items-center justify-between">
        <span className="text-mg-caption text-muted-foreground">{t('map.legend.ramp.lower')}</span>
        <span className="text-mg-caption text-muted-foreground">{t('map.legend.ramp.higher')}</span>
      </div>
      <p className="max-w-[16rem] text-mg-caption text-muted-foreground">{t(NOTE_KEYS[layer])}</p>
    </div>
  )
}

/**
 * The legend for the active map layer, collapsible so it never covers more of
 * the map than the user wants. Condition shows one row per marker appearance
 * (colour and shape); score layers show a five-stop ramp with the direction
 * named in words, so meaning survives greyscale and colour-vision differences.
 */
export function MapLegend({ layer, className }: { layer: MapLayerId; className?: string }) {
  const { t } = useI18n()
  const [open, setOpen] = useState(true)

  return (
    <div
      className={cn(
        'max-w-[min(18rem,calc(100vw-2rem))] rounded-panel border border-map-overlay-border bg-map-overlay shadow-mg-2',
        className,
      )}
    >
      <button
        type="button"
        aria-expanded={open}
        onClick={() => {
          setOpen((current) => !current)
        }}
        className="flex min-h-9 w-full items-center gap-2 px-3 text-start text-mg-caption font-semibold text-foreground pointer-coarse:min-h-11"
      >
        <List aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
        <span className="flex-1">{t('map.legend.toggle')}</span>
        <ChevronDown
          aria-hidden="true"
          className={cn('size-4 shrink-0 text-muted-foreground mg-transition', open && 'rotate-180')}
        />
      </button>
      {open ? (
        <div className="max-h-[40dvh] overflow-y-auto border-t border-map-overlay-border px-3 py-2">
          <LegendBody layer={layer} />
        </div>
      ) : null}
    </div>
  )
}
