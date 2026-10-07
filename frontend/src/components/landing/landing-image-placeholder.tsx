import { ImageIcon } from 'lucide-react'

import { useI18n } from '@/app/providers/locale-provider'
import type { MessageKey } from '@/i18n/messages'

type LandingImagePlaceholderProps = {
  /** future local file the real photograph will be served from */
  src: string
  subjectKey: MessageKey
  altKey: MessageKey
  /** Tailwind aspect-ratio class for the frame */
  aspectClass?: string
}

/**
 * Reserves a 16:9 frame for a photograph that will be supplied later. It is a
 * labelled frame, never an invented image or map.
 */
export function LandingImagePlaceholder({
  src,
  subjectKey,
  altKey,
  aspectClass = 'aspect-video',
}: LandingImagePlaceholderProps) {
  const { t } = useI18n()

  return (
    <div
      role="img"
      aria-label={t(altKey)}
      className={`flex ${aspectClass} w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border-strong bg-muted p-4 text-center`}
    >
      <ImageIcon aria-hidden="true" className="size-8 text-muted-foreground" />
      <p className="text-mg-label font-medium text-foreground">
        {t('landing.image.label')}
      </p>
      <p className="max-w-xs text-mg-caption text-muted-foreground">
        {t(subjectKey)} · {t('landing.image.spec')}
      </p>
      <p className="break-all text-mg-caption text-muted-foreground">{src}</p>
    </div>
  )
}
