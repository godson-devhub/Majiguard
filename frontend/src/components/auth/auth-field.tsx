import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

import { useI18n } from '@/app/providers/locale-provider'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { MessageKey } from '@/i18n/messages'

type AuthFieldProps = {
  id: string
  labelKey: MessageKey
  type: 'text' | 'email' | 'password'
  value: string
  onChange: (value: string) => void
  autoComplete: string
  /** translated message key for the current validation error, if any */
  error?: MessageKey
}

/** Label, input and inline error. Password fields get a show/hide control. */
export function AuthField({
  id,
  labelKey,
  type,
  value,
  onChange,
  autoComplete,
  error,
}: AuthFieldProps) {
  const { t } = useI18n()
  const [revealed, setRevealed] = useState(false)
  const isPassword = type === 'password'
  const errorId = `${id}-error`

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{t(labelKey)}</Label>
      <div className="relative">
        <Input
          id={id}
          name={id}
          type={isPassword && revealed ? 'text' : type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          aria-invalid={error === undefined ? undefined : true}
          aria-describedby={error === undefined ? undefined : errorId}
          className={isPassword ? 'pe-12 [&::-ms-reveal]:hidden' : undefined}
        />
        {isPassword ? (
          <button
            type="button"
            onClick={() => setRevealed((current) => !current)}
            aria-pressed={revealed}
            aria-label={t(revealed ? 'auth.password.hide' : 'auth.password.show')}
            className="absolute inset-y-0 end-0 flex w-12 items-center justify-center rounded-e-control text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {revealed ? (
              <EyeOff aria-hidden="true" className="size-5" />
            ) : (
              <Eye aria-hidden="true" className="size-5" />
            )}
          </button>
        ) : null}
      </div>
      {error === undefined ? null : (
        <p id={errorId} className="text-base text-destructive">
          {t(error)}
        </p>
      )}
    </div>
  )
}
