import { useI18n } from '@/app/providers/locale-provider'
import { brandAssets } from '@/components/brand/brand-assets'
import { IdentitySlot } from '@/components/brand/identity-slot'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

type ProductIdentityProps = {
  className?: string
  /** suppress the mark slot when the surrounding layout already shows it */
  showMark?: boolean
}

/**
 * MajiGuard's own identity: the product mark, the brand name "MajiGuard
 * (MUUMAM)" (the dominant line) and the official Swahili name beneath it.
 * The Swahili name is the same in every locale. Below `sm` the mark and the
 * official name are dropped so the brand name and the header controls always
 * fit; the official name stays available in a tooltip when it is truncated.
 */
export function ProductIdentity({ className, showMark = true }: ProductIdentityProps) {
  const { t } = useI18n()
  const officialName = t('app.brand.officialName')

  return (
    <div className={cn('flex min-w-0 items-center gap-3', className)}>
      {showMark ? (
        <IdentitySlot asset={brandAssets['majiguard-mark']} className="hidden rounded-sm sm:block" />
      ) : null}
      <div className="min-w-0 leading-tight">
        <p className="text-base font-semibold tracking-tight text-brand sm:whitespace-nowrap sm:text-lg">
          {t('app.brand.name')}
        </p>
        <Tooltip>
          <TooltipTrigger
            render={
              <p className="mt-0.5 hidden truncate text-mg-caption text-muted-foreground sm:block" />
            }
          >
            {officialName}
          </TooltipTrigger>
          <TooltipContent>{officialName}</TooltipContent>
        </Tooltip>
      </div>
    </div>
  )
}
