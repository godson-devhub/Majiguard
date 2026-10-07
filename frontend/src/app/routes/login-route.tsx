import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'

import { useI18n } from '@/app/providers/locale-provider'
import { AuthField } from '@/components/auth/auth-field'
import { AuthLayout } from '@/components/auth/auth-layout'
import { AuthUnavailableNotice } from '@/components/auth/auth-unavailable-notice'
import {
  focusFirstInvalid,
  validateEmail,
  validatePassword,
} from '@/components/auth/auth-validation'
import { Button } from '@/components/ui/button'
import type { MessageKey } from '@/i18n/messages'

type Errors = { email?: MessageKey; password?: MessageKey }

/** Login UI only: validates locally and never contacts a backend. */
export function LoginRoute() {
  const { t } = useI18n()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<Errors>({})
  const [submitted, setSubmitted] = useState(false)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const next: Errors = {
      email: validateEmail(email),
      password: validatePassword(password),
    }
    setErrors(next)
    const valid = next.email === undefined && next.password === undefined
    setSubmitted(valid)
    if (!valid) {
      focusFirstInvalid([
        { id: 'login-email', error: next.email },
        { id: 'login-password', error: next.password },
      ])
    }
  }

  return (
    <AuthLayout
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
      <form noValidate onSubmit={handleSubmit} className="space-y-4">
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
        <Button type="submit" size="lg" className="w-full">
          {t('auth.login.submit')}
        </Button>
        {submitted ? <AuthUnavailableNotice /> : null}
      </form>
    </AuthLayout>
  )
}
