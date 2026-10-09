import type { MessageKey } from '@/i18n/messages'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Client-side checks only: required and well-formed, nothing is sent anywhere. */
export function validateName(value: string): MessageKey | undefined {
  return value.trim() === '' ? 'auth.error.nameRequired' : undefined
}

export function validateEmail(value: string): MessageKey | undefined {
  const trimmed = value.trim()
  if (trimmed === '') {
    return 'auth.error.emailRequired'
  }
  return EMAIL_PATTERN.test(trimmed) ? undefined : 'auth.error.emailInvalid'
}

export function validatePassword(value: string): MessageKey | undefined {
  return value === '' ? 'auth.error.passwordRequired' : undefined
}

export function validateNewPassword(value: string): MessageKey | undefined {
  if (value === '') {
    return 'auth.error.passwordRequired'
  }
  return value.length < 8 ? 'auth.error.passwordShort' : undefined
}

export function validateConfirmation(
  password: string,
  confirmation: string,
): MessageKey | undefined {
  if (confirmation === '') {
    return 'auth.error.confirmRequired'
  }
  return confirmation === password ? undefined : 'auth.error.passwordMismatch'
}

/** Moves focus to the first field whose id has an error. */
export function focusFirstInvalid(
  fields: { id: string; error: MessageKey | undefined }[],
): void {
  const first = fields.find((field) => field.error !== undefined)
  if (first !== undefined) {
    document.getElementById(first.id)?.focus()
  }
}
