import { useId, useState, type FormEvent, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { useI18n } from '@/app/providers/locale-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import type { MessageKey } from '@/i18n/messages'

type SectionPageProps = {
  titleKey: MessageKey
  descriptionKey: MessageKey
  children: ReactNode
  /** Small-caps context line above the title, e.g. "National overview". */
  eyebrowKey?: MessageKey
  /** Rendered between the description and the page body, e.g. a filter bar. */
  toolbar?: ReactNode
  /** Small provenance line under the description. Never an endpoint path. */
  sourceNote?: string
}

/**
 * The frame every routed section sits in.
 *
 * It deliberately shows no request paths or payload shapes: a user of a water
 * service needs the purpose of the screen and where the data came from, not the
 * transport that fetched it.
 */
export function SectionPage({
  titleKey,
  descriptionKey,
  eyebrowKey,
  toolbar,
  sourceNote,
  children,
}: SectionPageProps) {
  const { t } = useI18n()

  return (
    <div className="space-y-6">
      <header className="border-b border-border pb-5">
        {eyebrowKey === undefined ? null : (
          <p className="text-mg-caption font-medium uppercase tracking-wider text-muted-foreground">
            {t(eyebrowKey)}
          </p>
        )}
        <h1
          id="page-title"
          tabIndex={-1}
          className="text-mg-display font-semibold tracking-tight text-foreground"
        >
          {t(titleKey)}
        </h1>
        <p className="mt-2 max-w-[68ch] text-mg-body text-muted-foreground">
          {t(descriptionKey)}
        </p>
        {sourceNote === undefined ? null : (
          <p className="mt-2 text-mg-caption text-muted-foreground">{sourceNote}</p>
        )}
        {toolbar === undefined ? null : <div className="mt-4">{toolbar}</div>}
      </header>

      {children}
    </div>
  )
}

type PaginationProps = {
  page: number
  totalPages: number
  total: number
  onPageChange: (page: number) => void
  isFetching: boolean
}

/**
 * Page controls driven entirely by the API's own `page`/`total_pages` values.
 *
 * A water-point set is thousands of rows deep, so previous/next alone cannot
 * reach the end. The page field jumps straight to any page the API reports,
 * and is clamped to the API's real range rather than allowed to request a page
 * that would be rejected.
 */
export function Pagination({
  page,
  totalPages,
  total,
  onPageChange,
  isFetching,
}: PaginationProps) {
  const { t } = useI18n()
  const statusId = useId()
  const pageFieldId = useId()
  const [requestedPage, setRequestedPage] = useState(String(page))
  const [lastPage, setLastPage] = useState(page)

  // When the page changes from elsewhere — previous, next, a filter reset, or a
  // URL edit — the field follows it. Adjusted during render rather than in an
  // effect, so no extra pass is needed and typing is never interrupted.
  if (page !== lastPage) {
    setLastPage(page)
    setRequestedPage(String(page))
  }

  function submitRequestedPage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsed = Number.parseInt(requestedPage, 10)
    if (!Number.isFinite(parsed)) {
      setRequestedPage(String(page))
      return
    }
    const clamped = Math.min(Math.max(parsed, 1), Math.max(totalPages, 1))
    setRequestedPage(String(clamped))
    if (clamped !== page) {
      onPageChange(clamped)
    }
  }

  return (
    <nav
      aria-label={t('data.pagination.label')}
      className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3"
    >
      <p id={statusId} aria-live="polite" className="text-mg-caption text-muted-foreground">
        {t('data.pagination.records', { total })} ·{' '}
        {t('data.pagination.summary', { page, totalPages })}
      </p>

      <div className="flex flex-wrap items-center gap-4">
        <form onSubmit={submitRequestedPage} className="flex items-end gap-2">
          <div className="flex flex-col gap-1">
            <Label htmlFor={pageFieldId} className="text-mg-caption text-muted-foreground">
              {t('data.pagination.goto')}
            </Label>
            <Input
              id={pageFieldId}
              type="number"
              inputMode="numeric"
              min={1}
              max={Math.max(totalPages, 1)}
              value={requestedPage}
              disabled={isFetching}
              onChange={(event) => {
                setRequestedPage(event.target.value)
              }}
              className={cn('h-8 w-20 text-mg-caption')}
            />
          </div>
          <Button type="submit" size="sm" variant="outline" disabled={isFetching}>
            {t('data.pagination.go')}
          </Button>
        </form>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={page <= 1 || isFetching}
            onClick={() => {
              onPageChange(page - 1)
            }}
          >
            <ChevronLeft aria-hidden="true" className="size-3.5" />
            {t('data.pagination.previous')}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={page >= totalPages || isFetching}
            onClick={() => {
              onPageChange(page + 1)
            }}
          >
            {t('data.pagination.next')}
            <ChevronRight aria-hidden="true" className="size-3.5" />
          </Button>
        </div>
      </div>
    </nav>
  )
}

export function MetricRow({ children }: { children: ReactNode }) {
  return (
    <dl
      className={cn(
        'grid gap-px overflow-hidden rounded-md border border-border bg-border',
        'sm:grid-cols-2',
      )}
    >
      {children}
    </dl>
  )
}

export function Metric({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint?: string
}) {
  return (
    <div className="bg-card px-4 py-3">
      <dt className="text-mg-caption text-muted-foreground">{label}</dt>
      <dd className="mg-figure mt-1 text-mg-title-md font-semibold text-foreground">
        {value}
      </dd>
      {hint === undefined ? null : (
        <p className="mt-1 text-mg-caption text-muted-foreground">{hint}</p>
      )}
    </div>
  )
}
