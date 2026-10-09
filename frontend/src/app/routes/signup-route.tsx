import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router'

import { useAuth } from '@/app/providers/auth-provider'
import { useI18n } from '@/app/providers/locale-provider'
import { AuthField } from '@/components/auth/auth-field'
import { authErrorKey } from '@/components/auth/auth-errors'
import { AuthLayout } from '@/components/auth/auth-layout'
import {
  focusFirstInvalid,
  validateConfirmation,
  validateEmail,
  validateName,
  validateNewPassword,
} from '@/components/auth/auth-validation'
import { Button } from '@/components/ui/button'
import type { MessageKey } from '@/i18n/messages'
import { INSTITUTIONS } from '@/services/auth'

type Errors = {
  name?: MessageKey
  institution?: MessageKey
  email?: MessageKey
  password?: MessageKey
  confirmation?: MessageKey
}

/** Value of the "type your own" choice in the institution list. */
const OTHER = 'other'

/**
 * Creates an account. It is active straight away: the person is signed in and
 * taken to the dashboard, with no approval step.
 */
export function SignupRoute() {
  const { t } = useI18n()
  const { status, register } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [institution, setInstitution] = useState('')
  const [customInstitution, setCustomInstitution] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [errors, setErrors] = useState<Errors>({})
  const [failure, setFailure] = useState<MessageKey | null>(null)
  const [busy, setBusy] = useState(false)

  if (status === 'authenticated' && !busy) {
    return <Navigate to="/dashboard" replace />
  }

  const typingOwn = institution === OTHER
  const institutionValue = typingOwn ? customInstitution.trim() : institution

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const next: Errors = {
      name: validateName(name),
      institution: institutionValue.length < 2 ? 'auth.error.institutionRequired' : undefined,
      email: validateEmail(email),
      password: validateNewPassword(password),
      confirmation: validateConfirmation(password, confirmation),
    }
    setErrors(next)
    setFailure(null)
    if (!Object.values(next).every((error) => error === undefined)) {
      focusFirstInvalid([
        { id: 'signup-name', error: next.name },
        { id: typingOwn ? 'signup-institution-name' : 'signup-institution', error: next.institution },
        { id: 'signup-email', error: next.email },
        { id: 'signup-password', error: next.password },
        { id: 'signup-confirmation', error: next.confirmation },
      ])
      return
    }

    setBusy(true)
    try {
      await register({ full_name: name, email: email.trim(), institution: institutionValue, password })
      navigate('/dashboard', { replace: true })
    } catch (error) {
      setFailure(authErrorKey(error))
      setBusy(false)
    }
  }

  return (
    <AuthLayout
      fullScreen
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
      <form noValidate onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <AuthField
            id="signup-name"
            labelKey="auth.field.name"
            type="text"
            value={name}
            onChange={setName}
            autoComplete="name"
            error={errors.name}
          />
          <div className="space-y-1.5">
            <label htmlFor="signup-institution" className="leading-none">
              {t('auth.field.institution')}
            </label>
            <select
              id="signup-institution"
              value={institution}
              onChange={(event) => {
                setInstitution(event.target.value)
              }}
              aria-invalid={errors.institution !== undefined && !typingOwn ? true : undefined}
              aria-describedby={errors.institution !== undefined && !typingOwn ? 'signup-institution-error' : undefined}
              className="w-full rounded-control border border-input bg-background px-3 text-foreground"
            >
              <option value="">{t('auth.institution.choose')}</option>
              {INSTITUTIONS.map((value) => (
                <option key={value} value={value}>
                  {t(`institution.${value}`)}
                </option>
              ))}
              <option value={OTHER}>{t('auth.institution.typeOwn')}</option>
            </select>
            {errors.institution !== undefined && !typingOwn ? (
              <p id="signup-institution-error" className="text-base text-destructive">
                {t(errors.institution)}
              </p>
            ) : null}
          </div>
        </div>
        {typingOwn ? (
          <AuthField
            id="signup-institution-name"
            labelKey="auth.field.institutionName"
            type="text"
            value={customInstitution}
            onChange={setCustomInstitution}
            autoComplete="organization"
            error={errors.institution}
          />
        ) : null}
        <AuthField
          id="signup-email"
          labelKey="auth.field.email"
          type="email"
          value={email}
          onChange={setEmail}
          autoComplete="email"
          error={errors.email}
        />
        <div className="grid gap-4 sm:grid-cols-2">
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
        </div>
        {failure === null ? null : (
          <p role="alert" className="rounded-xl bg-status-nonfunctional-soft px-4 py-3 text-lg font-medium text-status-nonfunctional-fg">
            {t(failure)}
          </p>
        )}
        <Button type="submit" size="lg" className="w-full" disabled={busy}>
          {t('auth.signup.submit')}
        </Button>
      </form>
    </AuthLayout>
  )
}
