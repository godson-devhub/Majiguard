import { ApiError } from '@/lib/api-client'
import type { MessageKey } from '@/i18n/messages'

/** Turns an API failure from sign-in or registration into a translated message key. */
export function authErrorKey(error: unknown): MessageKey {
  if (error instanceof ApiError) {
    if (error.status === 0) {
      return 'auth.error.unreachable'
    }
    switch (error.detail) {
      case 'invalid_credentials':
        return 'auth.error.invalid'
      case 'account_pending':
      case 'account_rejected':
      case 'account_disabled':
        return 'auth.error.disabled'
      case 'email_taken':
        return 'auth.error.taken'
      case 'too_many_attempts':
        return 'auth.error.throttled'
      default:
        break
    }
    if (error.status === 429) {
      return 'auth.error.throttled'
    }
  }
  return 'auth.error.generic'
}
