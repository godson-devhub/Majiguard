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
  autoFocus?: boolean
  className?: string
}

/**
 * Find a water point by its master identifier — the register's public key.
 * Exact lookup through the existing `/water-points/master/{master_id}` endpooint;
 * a miss is a real, honest state, not an error.
 */
export function MasterIdSearch({ onResolve, autoFocus = false, className }: MasterIdSearchProps) {
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

  function submit(event: React.FormEvent) {
    event.preventDefault()
    const trimmed = query.trim()
    setSubmitted(trimmed)
    if (trimmed.length === 0) {
      onResolve(null)
    }
  }

  return (
    <form onSubmit={submit} className={cn('space-y-2', className)} role="search">
      <Label htmlFor={inputId} className="text-mg-caption font-medium text-muted-foreground">
        {t('search.label')}
      </Label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
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
            className="pl-8"
          />
        </div>
        <Button type="submit" disabled={query.trim().length === 0 || results.isPending}>
          {results.isPending ? t('search.loading') : t('search.label')}
        </Button>
        {query.length > 0 || submitted.length > 0 ? (
          <Button
            type="button"
            variant="ghost"
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
      <p className="text-mg-caption text-muted-foreground">{t('search.hint')}</p>
    </form>
  )
}
