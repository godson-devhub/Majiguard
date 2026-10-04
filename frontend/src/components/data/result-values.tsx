import { useI18n } from '@/app/providers/locale-provider'
import type { MessageKey } from '@/i18n/messages'

type ResultValue = {
  labelKey: MessageKey
  /** A stored value, rendered exactly as returned. */
  value: string
  /** A `*_unavailable_reason` supplied by the backend, shown verbatim. */
  note?: string | null
}

/**
 * Renders a stored model result field for field. The methodology versions and
 * the backend's own notes are always shown, so a value can never be read
 * without the version and threshold that produced it.
 */
export function ResultValues({ values }: { values: ResultValue[] }) {
  const { t } = useI18n()

  return (
    <dl className="mt-4 grid gap-x-8 gap-y-3 sm:grid-cols-2">
      {values.map((entry) => (
        <div key={entry.labelKey} className="min-w-0">
          <dt className="text-mg-caption text-muted-foreground">
            {t(entry.labelKey)}
          </dt>
          <dd className="mt-0.5 text-mg-body-sm text-foreground">
            {entry.value}
            {entry.note === undefined || entry.note === null || entry.note === '' ? null : (
              <span className="mt-0.5 block text-mg-caption text-muted-foreground">
                {entry.note}
              </span>
            )}
          </dd>
        </div>
      ))}
    </dl>
  )
}
