import { useI18n } from '@/app/providers/locale-provider'
import { cn } from '@/lib/utils'
import type { BrandAsset } from '@/components/brand/brand-assets'

type IdentitySlotProps = {
  asset: BrandAsset
  className?: string
}

/**
 * An official identity position.
 *
 * Only an `approved` asset ever renders an image, and only then does the slot
 * carry an accessible name. An unapproved slot renders a neutral frame that is
 * hidden from assistive technology, so the interface never announces an
 * official identity it does not actually hold, and the layout does not shift
 * when real artwork is added.
 */
export function IdentitySlot({ asset, className }: IdentitySlotProps) {
  const { t } = useI18n()
  const label = t(asset.labelKey)
  const isApproved = asset.status === 'approved' && asset.src !== undefined
  const compactLabel = asset.width <= 48

  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center border border-dashed border-border-strong/50 bg-muted/40',
        className,
      )}
      data-asset-slot={asset.id}
      data-asset-status={asset.status}
      style={{ width: asset.width, height: asset.height }}
    >
      {isApproved ? (
        <img
          src={asset.src}
          alt={label}
          width={asset.width}
          height={asset.height}
          className="max-h-full w-auto object-contain"
        />
      ) : (
        <span
          aria-hidden="true"
          className={cn(
            'px-1 text-center font-medium uppercase leading-tight tracking-wide text-muted-foreground',
            compactLabel ? 'text-[0.5625rem]' : 'text-mg-caption',
          )}
        >
          {label}
        </span>
      )}
    </div>
  )
}