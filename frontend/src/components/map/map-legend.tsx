import { useI18n } from '@/app/providers/locale-provider'
import { layerRampStops } from '@/components/map/map-layers'
import type { MapLayerId } from '@/components/map/map-layers'
import type { MessageKey } from '@/i18n/messages'

const CONDITION_SWATCHES: { value: string; className: string }[] = [
  { value: 'Functional', className: 'bg-status-functional' },
  { value: 'Non-Functional', className: 'bg-status-nonfunctional' },
  { value: 'Functional, needs repair', className: 'bg-status-warning' },
  { value: 'Non-Functional, dry season', className: 'bg-status-warning' },
  { value: 'Functional, not in use', className: 'bg-status-info' },
  { value: 'Abandoned/Decommissioned', className: 'bg-muted-foreground' },
  { value: 'Others', className: 'bg-muted-foreground' },
]

const CONDITION_LEGEND_NOTES: Partial<Record<string, MessageKey>> = {
  'Functional, needs repair': 'status.warning',
  'Non-Functional, dry season': 'status.warning',
  'Functional, not in use': 'status.info',
}

/**
 * The legend for the active map layer, rendered on the map like GIS
 * applications do. Condition shows one swatch per recorded status value; score
 * layers show a five-stop ramp with the ramp direction named in words, so
 * meaning survives greyscale and colour-vision differences.
 */
export function MapLegend({ layer }: { layer: MapLayerId }) {
  const { t } = useI18n()

  if (layer === 'condition') {
    return (
      <div className="space-y-1.5">
        <p className="text-mg-caption font-semibold text-foreground">
          {t('map.legend.condition')}
        </p>
        <ul className="space-y-1">
          {CONDITION_SWATCHES.map(({ value, className }) => (
            <li key={value} className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className={`inline-block size-2.5 shrink-0 rounded-full border border-map-surface ${className}`}
              />
              <span className="text-mg-caption text-foreground">
                {value}
                {CONDITION_LEGEND_NOTES[value] !== undefined ? (
                  <span className="text-muted-foreground">
                    {' '}
                    ({t(CONDITION_LEGEND_NOTES[value]!)})
                  </span>
                ) : null}
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

  const titleKey: MessageKey =
    layer === 'risk'
      ? 'map.legend.risk.title'
      : layer === 'impact'
        ? 'map.legend.impact.title'
        : layer === 'priority'
          ? 'map.legend.priority.title'
          : layer === 'preventive'
            ? 'map.legend.preventive.title'
            : layer === 'restoration'
              ? 'map.legend.restoration.title'
              : 'map.legend.consequence.title'
  const noteKey: MessageKey =
    layer === 'risk'
      ? 'map.legend.note.risk'
      : layer === 'impact'
        ? 'map.legend.note.impact'
        : layer === 'priority'
          ? 'map.legend.note.priority'
          : layer === 'preventive'
            ? 'map.legend.note.preventive'
            : layer === 'restoration'
              ? 'map.legend.note.restoration'
              : 'map.legend.note.consequence'

  return (
    <div className="space-y-1.5">
      <p className="text-mg-caption font-semibold text-foreground">{t(titleKey)}</p>
      <div
        aria-hidden="true"
        className="flex h-2.5 w-36 overflow-hidden rounded-full border border-map-overlay-border"
      >
        {stops.map((color, index) => (
          <span key={index} className="h-full flex-1" style={{ backgroundColor: color }} />
        ))}
      </div>
      <div className="flex items-center justify-between w-36">
        <span className="text-mg-caption text-muted-foreground">{t('map.legend.ramp.lower')}</span>
        <span className="text-mg-caption text-muted-foreground">{t('map.legend.ramp.higher')}</span>
      </div>
      <p className="max-w-[24rem] text-mg-caption text-muted-foreground">{t(noteKey)}</p>
    </div>
  )
}
