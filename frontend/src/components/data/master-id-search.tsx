import { useEffect, useId, useState } from 'react'
import { Search, X } from 'lucide-react'

import { useI18n } from '@/app/providers/locale-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useWaterPointByMasterIdQuery } from '@/hooks/water-points'
import { cn } from '@/lib/utils'

type MasterIdSearchProps = {
  /** The resolved water point id, lifted so the parent can render its detail. */
  onResolve: (id: number | null) => void
  /** Called when the searched master ID does not exist in the register. */
  onNotFound?: () => void
  autoFocus?: boolean
  /** Capsule search bar with no visible label or hint (the label stays for screen readers). */
  pill?: boolean
  className?: string
}

/**
 * Find a water point by its master identifier — the register's public key.
 * Exact lookup through the existing `/water-points/master/{master_id}` endpooint;
 * a miss is a real, honest state, not an error.
 */
export function MasterIdSearch({
  onResolve,
  onNotFound,
  autoFocus = false,
  pill = false,
  className,
}: MasterIdSearchProps) {
  const { t } = useI18n()
  const inputId = useId()
  const [query, setQuery] = useState('')
  const [submitted, setSubmitted] = useState('')

  const results = useWaterPointByMasterIdQuery(submitted.length > 0 ? submitted : null)

  useEffect(() => {
    if (results.isSuccess) {
      onResolve(results.data.id)
    }
  }, [results.isSuccess, results.data, onResolve])

  useEffect(() => {
    if (submitted.length > 0 && results.isError) {
      onNotFound?.()
    }
  }, [submitted, results.isError, onNotFound])

  function submit(event: React.FormEvent) {
    event.preventDefault()
    // Master identifiers are upper-case (MG000001); accept any casing and stray spaces.
    const normalised = query.trim().toUpperCase()
    setQuery(normalised)
    if (normalised.length === 0) {
      setSubmitted('')
      onResolve(null)
      return
    }
    // Same identifier again (e.g. after closing the details): the cached result
    // does not change, so re-open it explicitly instead of waiting for an effect.
    if (normalised === submitted && results.isSuccess) {
      onResolve(results.data.id)
      return
    }
    setSubmitted(normalised)
  }

  return (
    <form onSubmit={submit} className={cn('space-y-2', className)} role="search">
      <Label
        htmlFor={inputId}
        className={cn('text-mg-caption font-medium text-muted-foreground', pill && 'sr-only')}
      >
        {t('search.label')}
      </Label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search
            aria-hidden="true"
            className={cn(
              'pointer-events-none absolute top-1/2 size-4 -translate-y-1/2 text-muted-foreground',
              pill ? 'left-4' : 'left-2.5',
            )}
          />
          <Input
            id={inputId}
            value={query}
            autoFocus={autoFocus}
            onChange={(event) => {
              setQuery(event.target.value)
            }}
            placeholder={t('search.placeholder')}
            aria-describedby={undefined}
            spellCheck={false}
            autoComplete="off"
            className={cn(pill ? 'h-11 rounded-full bg-white/70 pl-11 shadow-mg-2 backdrop-blur-md' : 'pl-8')}
          />
        </div>
        <Button
          type="submit"
          className={cn(pill && 'h-11 rounded-full px-5')}
          disabled={query.trim().length === 0 || results.isPending}
        >
          {results.isPending ? t('search.loading') : t('search.label')}
        </Button>
        {query.length > 0 || submitted.length > 0 ? (
          <Button
            type="button"
            variant="ghost"
            className={cn(pill && 'h-11 rounded-full')}
            aria-label={t('search.clear')}
            onClick={() => {
              setQuery('')
              setSubmitted('')
              onResolve(null)
            }}
          >
            <X aria-hidden="true" className="size-4" />
          </Button>
        ) : null}
      </div>

      <div aria-live="polite">
        {submitted.length > 0 && results.isError ? (
          <p className="text-mg-caption text-muted-foreground">{t('search.none')}</p>
        ) : null}
        {submitted.length > 0 && results.isSuccess ? (
          <p className="text-mg-caption text-status-functional-fg">
            {t('search.open', { masterId: results.data.master_id })}
          </p>
        ) : null}
      </div>
      {pill ? null : <p className="text-mg-caption text-muted-foreground">{t('search.hint')}</p>}
    </form>
  )
}
