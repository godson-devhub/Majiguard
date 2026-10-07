import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'

import { useI18n } from '@/app/providers/locale-provider'
import { AuthField } from '@/components/auth/auth-field'
import { AuthLayout } from '@/components/auth/auth-layout'
import { AuthUnavailableNotice } from '@/components/auth/auth-unavailable-notice'
import {
  focusFirstInvalid,
  validateConfirmation,
  validateEmail,
  validateName,
  validatePassword,
} from '@/components/auth/auth-validation'
import { Button } from '@/components/ui/button'
import type { MessageKey } from '@/i18n/messages'

type Errors = {
  name?: MessageKey
  email?: MessageKey
  password?: MessageKey
  confirmation?: MessageKey
}

/** Signup UI only: validates locally and never creates an account. */
export function SignupRoute() {
  const { t } = useI18n()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [errors, setErrors] = useState<Errors>({})
  const [submitted, setSubmitted] = useState(false)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const next: Errors = {
      name: validateName(name),
      email: validateEmail(email),
      password: validatePassword(password),
      confirmation: validateConfirmation(password, confirmation),
    }
    setErrors(next)
    const valid = Object.values(next).every((error) => error === undefined)
    setSubmitted(valid)
    if (!valid) {
      focusFirstInvalid([
        { id: 'signup-name', error: next.name },
        { id: 'signup-email', error: next.email },
        { id: 'signup-password', error: next.password },
        { id: 'signup-confirmation', error: next.confirmation },
      ])
    }
  }

  return (
    <AuthLayout
      titleKey="auth.signup.title"
      descriptionKey="auth.signup.description"
      footer={
        <>
          {t('auth.signup.switchPrompt')}{' '}
          <Link
            to="/login"
            className="font-medium text-primary underline-offset-2 hover:underline"
          >
            {t('auth.signup.switchLink')}
          </Link>
        </>
      }
    >
      <form noValidate onSubmit={handleSubmit} className="space-y-4">
        <AuthField
          id="signup-name"
          labelKey="auth.field.name"
          type="text"
          value={name}
          onChange={setName}
          autoComplete="name"
          error={errors.name}
        />
        <AuthField
          id="signup-email"
          labelKey="auth.field.email"
          type="email"
          value={email}
          onChange={setEmail}
          autoComplete="email"
          error={errors.email}
        />
        <AuthField
          id="signup-password"
          labelKey="auth.field.password"
          type="password"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          error={errors.password}
        />
        <AuthField
          id="signup-confirmation"
          labelKey="auth.field.confirmPassword"
          type="password"
          value={confirmation}
          onChange={setConfirmation}
          autoComplete="new-password"
          error={errors.confirmation}
        />
        <Button type="submit" size="lg" className="w-full">
          {t('auth.signup.submit')}
        </Button>
        {submitted ? <AuthUnavailableNotice /> : null}
      </form>
    </AuthLayout>
  )
}
