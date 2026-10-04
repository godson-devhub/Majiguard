import { useI18n } from '@/app/providers/locale-provider'
import {
  consequenceLayerAvailable,
  impactLayerAvailable,
  LAYER_LABEL_KEYS,
  MAP_LAYERS,
  preventiveLayerAvailable,
  priorityLayerAvailable,
  restorationLayerAvailable,
  riskLayerAvailable,
  type MapLayerId,
} from '@/components/map/map-layers'
import type { MapPointOut } from '@/types/api'
import { cn } from '@/lib/utils'

type MapLayerSwitcherProps = {
  layer: MapLayerId
  onLayerChange: (layer: MapLayerId) => void
  points: readonly MapPointOut[]
  className?: string
}

/**
 * The data-layer control, styled as a compact segmented control on the map —
 * the GIS convention. `condition` is always enabled; every other layer
 * (risk/impact/consequence/preventive/restoration) is disabled, independently
 * of the others, until at least one currently plotted record actually has
 * that layer's stored value, so an empty layer is never offered as if it
 * held data.
 */
export function MapLayerSwitcher({
  layer,
  onLayerChange,
  points,
  className,
}: MapLayerSwitcherProps) {
  const { t } = useI18n()
  const riskReady = riskLayerAvailable(points)
  const impactReady = impactLayerAvailable(points)
  const priorityReady = priorityLayerAvailable(points)
  const consequenceReady = consequenceLayerAvailable(points)
  const preventiveReady = preventiveLayerAvailable(points)
  const restorationReady = restorationLayerAvailable(points)

  return (
    <div
      role="radiogroup"
      aria-label={t('map.layer.label')}
      className={cn(
        'flex flex-wrap overflow-hidden rounded-sm border border-map-overlay-border bg-map-overlay shadow-mg-1',
        className,
      )}
    >
      {MAP_LAYERS.map((id) => {
        const disabled =
          id === 'risk'
            ? !riskReady
            : id === 'impact'
              ? !impactReady
              : id === 'priority'
                ? !priorityReady
                : id === 'consequence'
                ? !consequenceReady
                : id === 'preventive'
                  ? !preventiveReady
                  : id === 'restoration'
                    ? !restorationReady
                    : false
        const active = layer === id
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            title={disabled ? t('map.layer.disabledNote') : t(LAYER_LABEL_KEYS[id])}
            onClick={() => {
              onLayerChange(id)
            }}
            className={cn(
              'px-2.5 py-1.5 text-mg-caption font-medium mg-transition',
              active
                ? 'bg-primary text-primary-foreground'
                : 'text-foreground hover:bg-accent hover:text-accent-foreground',
              disabled && 'cursor-not-allowed opacity-45 hover:bg-transparent',
            )}
          >
            {t(LAYER_LABEL_KEYS[id])}
          </button>
        )
      })}
    </div>
  )
}
