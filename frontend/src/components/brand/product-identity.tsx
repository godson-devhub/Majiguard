import { useI18n } from '@/app/providers/locale-provider'
import { brandAssets } from '@/components/brand/brand-assets'
import { IdentitySlot } from '@/components/brand/identity-slot'
import { cn } from '@/lib/utils'

type ProductIdentityProps = {
  className?: string
  /** suppress the mark slot when the surrounding layout already shows it */
  showMark?: boolean
}

export function ProductIdentity({ className, showMark = true }: ProductIdentityProps) {
  const { t } = useI18n()

  return (
    <div className={cn('flex min-w-0 items-center gap-2.5', className)}>
      {showMark ? <IdentitySlot asset={brandAssets['majiguard-mark']} /> : null}
      <div className="flex min-w-0 flex-col leading-tight">
        <span className="text-mg-title-sm font-semibold tracking-tight text-foreground">
          {t('app.product.name')}
        </span>
        <span className="hidden truncate text-mg-caption text-muted-foreground sm:block">
          {t('app.product.descriptor')}
        </span>
      </div>
    </div>
  )
}
