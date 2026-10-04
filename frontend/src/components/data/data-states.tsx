import { CircleAlert, FileQuestion, Inbox, WifiOff } from 'lucide-react'
import type { ReactNode } from 'react'

import { useI18n } from '@/app/providers/locale-provider'
import { describeApiFailure, type ApiFailureKind } from '@/lib/api-result'
import type { MessageKey } from '@/i18n/messages'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { StatePanel } from '@/components/data/state-panel'

const failureMessages: Record<ApiFailureKind, { title: MessageKey; body: MessageKey }> = {
  unreachable: { title: 'data.error.unreachable.title', body: 'data.error.unreachable.body' },
  'server-unavailable': {
    title: 'data.error.serverUnavailable.title',
    body: 'data.error.serverUnavailable.body',
  },
  'invalid-request': { title: 'data.error.invalidRequest.title', body: 'data.error.invalidRequest.body' },
  unexpected: { title: 'data.error.unexpected.title', body: 'data.error.unexpected.body' },
}

export function LoadingState({ label }: { label: string }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">{label}</span>
      <div aria-hidden="true" className="space-y-2">
        <Skeleton className="h-8 w-2/5" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
      </div>
    </div>
  )
}

/**
 * Explains a failed load without ever exposing a backend message. The wording is
 * chosen from the failure kind, and the backend's own `detail` is not rendered.
 */
export function FailureState({
  error,
  onRetry,
  title,
  body,
}: {
  error: unknown
  onRetry: () => void
  title?: string
  body?: string
}) {
  const { t } = useI18n()
  const kind = describeApiFailure(error)
  const messages = failureMessages[kind]
  const isUnreachable = kind === 'unreachable'
  const Icon = isUnreachable ? WifiOff : CircleAlert

  return (
    <StatePanel
      role="alert"
      ariaLive="assertive"
      tone={isUnreachable ? 'warning' : 'danger'}
      icon={Icon}
      title={title ?? t(messages.title)}
      description={body ?? t(messages.body)}
    >
      <div className="mt-4">
        <Button size="sm" onClick={onRetry}>
          {t('data.retry')}
        </Button>
      </div>
    </StatePanel>
  )
}

export function EmptyState({ title, body }: { title?: string; body?: string }) {
  const { t } = useI18n()

  return (
    <StatePanel
      icon={Inbox}
      tone="neutral"
      title={title ?? t('data.empty.title')}
      description={body ?? t('data.empty.body')}
    />
  )
}

type NotStoredStateProps = {
  /** Which result is missing, so the wording names the real backend state. */
  kind: 'prediction' | 'impact' | 'consequence'
  children?: ReactNode
}

/**
 * A 404 from a result endpoint means the water point has no stored result yet.
 * It is never rendered as a zero, a band, or an implied score.
 */
export function NotStoredState({ kind, children }: NotStoredStateProps) {
  const { t } = useI18n()

  return (
    <StatePanel
      icon={FileQuestion}
      tone="info"
      title={t(`data.${kind}.notStored.title`)}
      description={t(`data.${kind}.notStored.body`)}
    >
      {children}
    </StatePanel>
  )
}
