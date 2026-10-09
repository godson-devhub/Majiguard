import type { MessageKey } from '@/i18n/messages'
import { isKnownInstitution } from '@/services/auth'

/** A stored institution is either a known code (translated) or a name the person typed (shown as written). */
export function institutionLabel(value: string, t: (key: MessageKey) => string): string {
  return isKnownInstitution(value) ? t(`institution.${value}`) : value
}
