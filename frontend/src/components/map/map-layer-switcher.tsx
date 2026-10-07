import { ChevronDown, Layers } from 'lucide-react'
import { useState } from 'react'

import { useI18n } from '@/app/providers/locale-provider'
import {
  consequenceLayerAvailable,
  impactLayerAvailable,
  LAYER_LABEL_KEYS,
  preventiveLayerAvailable,
  priorityLayerAvailable,
  restorationLayerAvailable,
  riskLayerAvailable,
  type MapLayerId,
} from '@/components/map/map-layers'
import type { MessageKey } from '@/i18n/messages'
import type { MapPointOut } from '@/types/api'
import { cn } from '@/lib/utils'

type MapLayerSwitcherProps = {
  layer: MapLayerId
  onLayerChange: (layer: MapLayerId) => void
  points: readonly MapPointOut[]
  className?: string
}

/** Layers grouped by what kind of information they show: what the survey
 * observed, what the model estimates, and the two separate priority pathways. */
const LAYER_GROUPS: { labelKey: MessageKey; layers: MapLayerId[] }[] = [
  { labelKey: 'map.layer.group.observed', layers: ['condition'] },
  { labelKey: 'map.layer.group.model', layers: ['risk', 'impact', 'consequence'] },
  { labelKey: 'map.layer.group.priority', layers: ['preventive', 'restoration', 'priority'] },
]

/**
 * The data-layer control: a compact panel on the map, open by default on wider
 * screens and collapsed to a single button on phones. `condition` is always
 * enabled; every other layer is disabled, independently of the others, until
 * at least one currently plotted record actually has that layer's stored
 * value, and the reason is written out beside the layer (never only in a
 * hover tooltip), so an empty layer is never offered as if it held data.
 */
export function MapLayerSwitcher({
  layer,
  onLayerChange,
  points,
  className,
}: MapLayerSwitcherProps) {
  const { t } = useI18n()
  const [open, setOpen] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 48rem)').matches,
  )

  const available: Record<MapLayerId, boolean> = {
    condition: true,
    risk: riskLayerAvailable(points),
    impact: impactLayerAvailable(points),
    consequence: consequenceLayerAvailable(points),
    priority: priorityLayerAvailable(points),
    preventive: preventiveLayerAvailable(points),
    restoration: restorationLayerAvailable(points),
  }

  return (
    <div
      className={cn(
        'w-[min(14.5rem,calc(100vw-5rem))] rounded-panel border border-map-overlay-border bg-map-overlay shadow-mg-2',
        className,
      )}
    >
      <button
        type="button"
        aria-expanded={open}
        onClick={() => {
          setOpen((current) => !current)
        }}
        className="flex min-h-10 w-full items-center gap-2 px-3 text-start pointer-coarse:min-h-11"
      >
        <Layers aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1">
          <span className="block text-mg-caption font-semibold text-foreground">{t('map.layers')}</span>
          <span className="block truncate text-mg-caption text-muted-foreground">
            {t(LAYER_LABEL_KEYS[layer])}
          </span>
        </span>
        <ChevronDown
          aria-hidden="true"
          className={cn('size-4 shrink-0 text-muted-foreground mg-transition', open && 'rotate-180')}
        />
      </button>

      {open ? (
        <div
          role="radiogroup"
          aria-label={t('map.layer.label')}
          className="max-h-[min(24rem,50dvh)] space-y-2 overflow-y-auto border-t border-map-overlay-border px-2 py-2"
        >
          {LAYER_GROUPS.map((group) => (
            <div key={group.labelKey}>
              <p className="px-1 pb-1 text-mg-caption font-semibold uppercase tracking-wider text-muted-foreground">
                {t(group.labelKey)}
              </p>
              <ul className="space-y-0.5">
                {group.layers.map((id) => {
                  const active = layer === id
                  const disabled = !available[id]
                  return (
                    <li key={id}>
                      <button
                        type="button"
                        role="radio"
                        aria-checked={active}
                        disabled={disabled}
                        onClick={() => {
                          onLayerChange(id)
                        }}
                        className={cn(
                          'mg-transition flex min-h-9 w-full flex-col items-start justify-center rounded-control px-2 py-1 text-start text-mg-caption pointer-coarse:min-h-11',
                          active
                            ? 'bg-primary font-semibold text-primary-foreground'
                            : 'text-foreground hover:bg-accent hover:text-accent-foreground',
                          disabled && 'cursor-not-allowed text-muted-foreground opacity-70 hover:bg-transparent',
                        )}
                      >
                        <span>{t(LAYER_LABEL_KEYS[id])}</span>
                        {disabled ? (
                          <span className="text-mg-caption font-normal">{t('map.layer.disabledNote')}</span>
                        ) : null}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
