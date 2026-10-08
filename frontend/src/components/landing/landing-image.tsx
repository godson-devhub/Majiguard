import { useState } from 'react'

import { useI18n } from '@/app/providers/locale-provider'
import { LandingImagePlaceholder } from '@/components/landing/landing-image-placeholder'
import { cn } from '@/lib/utils'
import type { MessageKey } from '@/i18n/messages'

type LandingImageProps = {
  /** local file under /images/landing/ */
  src: string
  /** translated description of the photograph */
  altKey: MessageKey
  /** Tailwind aspect-ratio class reserving the frame, e.g. `aspect-video` */
  aspectClass?: string
  /** wrapper classes, applied only while something is rendered */
  className?: string
  /** hero only: load eagerly with high priority; everything else is lazy */
  priority?: boolean
  /**
   * What to show if the file is missing: the labelled placeholder frame, or
   * nothing at all (for a purely supporting image).
   */
  fallback: { kind: 'placeholder'; subjectKey: MessageKey; altKey: MessageKey } | { kind: 'none' }
}

/**
 * A real photograph from `/images/landing/`. The frame's ratio is reserved up
 * front so nothing shifts while it loads. If the file is not there yet, it
 * falls back to the labelled placeholder (never a substitute image).
 */
export function LandingImage({
  src,
  altKey,
  aspectClass = 'aspect-video',
  className,
  priority = false,
  fallback,
}: LandingImageProps) {
  const { t } = useI18n()
  const [failed, setFailed] = useState(false)

  if (failed) {
    return fallback.kind === 'placeholder' ? (
      <div className={className}>
        <LandingImagePlaceholder
          src={src}
          subjectKey={fallback.subjectKey}
          altKey={fallback.altKey}
          aspectClass={aspectClass}
        />
      </div>
    ) : null
  }

  return (
    <div className={className}>
      <img
        src={src}
        alt={t(altKey)}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : 'auto'}
        decoding="async"
        onError={() => setFailed(true)}
        className={cn(
          'block w-full rounded-md border border-border bg-muted object-cover',
          aspectClass,
        )}
      />
    </div>
  )
}
