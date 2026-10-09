import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'

import { useAuth } from '@/app/providers/auth-provider'
import { useI18n } from '@/app/providers/locale-provider'
import { AuthField } from '@/components/auth/auth-field'
import { AuthLayout } from '@/components/auth/auth-layout'
import { authErrorKey } from '@/components/auth/auth-errors'
import {
  focusFirstInvalid,
  validateEmail,
  validatePassword,
} from '@/components/auth/auth-validation'
import { Button } from '@/components/ui/button'
import type { MessageKey } from '@/i18n/messages'

type Errors = { email?: MessageKey; password?: MessageKey }

/** Signs in against the API. Only an approved account receives access. */
export function LoginRoute() {
  const { t } = useI18n()
  const { status, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<Errors>({})
  const [failure, setFailure] = useState<MessageKey | null>(null)
  const [busy, setBusy] = useState(false)

  const from = (location.state as { from?: string } | null)?.from ?? '/dashboard'

  if (status === 'authenticated') {
    return <Navigate to={from} replace />
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const next: Errors = {
      email: validateEmail(email),
      password: validatePassword(password),
    }
    setErrors(next)
    setFailure(null)
    if (next.email !== undefined || next.password !== undefined) {
      focusFirstInvalid([
        { id: 'login-email', error: next.email },
        { id: 'login-password', error: next.password },
      ])
      return
    }

    setBusy(true)
    try {
      await login(email.trim(), password)
      navigate(from, { replace: true })
    } catch (error) {
      setFailure(authErrorKey(error))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout
      fullScreen
      titleKey="auth.login.title"
      descriptionKey="auth.login.description"
      footer={
        <>
          {t('auth.login.switchPrompt')}{' '}
          <Link
            to="/signup"
            className="font-medium text-primary underline-offset-2 hover:underline"
          >
            {t('auth.login.switchLink')}
          </Link>
        </>
      }
    >
      <form noValidate onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
        <AuthField
          id="login-email"
          labelKey="auth.field.email"
          type="email"
          value={email}
          onChange={setEmail}
          autoComplete="email"
          error={errors.email}
        />
        <AuthField
          id="login-password"
          labelKey="auth.field.password"
          type="password"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
          error={errors.password}
        />
        {failure === null ? null : (
          <p role="alert" className="rounded-xl bg-status-nonfunctional-soft px-4 py-3 text-lg font-medium text-status-nonfunctional-fg">
            {t(failure)}
          </p>
        )}
        <Button type="submit" size="lg" className="w-full" disabled={busy}>
          {t('auth.login.submit')}
        </Button>
      </form>
    </AuthLayout>
  )
}
