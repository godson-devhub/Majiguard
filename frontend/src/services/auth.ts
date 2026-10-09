import { apiRequest } from '@/lib/api-client'

/** Institutions offered in the sign-up list. Anything else is a name the person typed. */
export const INSTITUTIONS = ['ministry_of_water', 'ruwasa', 'district_water_authority'] as const
export type KnownInstitution = (typeof INSTITUTIONS)[number]

export function isKnownInstitution(value: string): value is KnownInstitution {
  return (INSTITUTIONS as readonly string[]).includes(value)
}

export type AuthUser = {
  id: number
  full_name: string
  email: string
  /** A known code from `INSTITUTIONS` or the institution name the person typed. */
  institution: string
  status: 'pending' | 'approved' | 'rejected' | 'disabled'
  is_admin: boolean
  created_at: string
  approved_at: string | null
}

export type LoginResponse = {
  access_token: string
  token_type: 'bearer'
  user: AuthUser
}

export type RegisterBody = {
  full_name: string
  email: string
  institution: string
  password: string
}

function post<T>(path: string, body?: unknown, signal?: AbortSignal) {
  return apiRequest<T>(path, { method: 'POST', signal, body })
}

/** Creates an account; it is active straight away and the response signs the person in. */
export const registerAccount = (body: RegisterBody) => post<LoginResponse>('/auth/register', body)

export const loginAccount = (email: string, password: string) =>
  post<LoginResponse>('/auth/login', { email, password })

export const fetchCurrentUser = (signal?: AbortSignal) =>
  apiRequest<AuthUser>('/auth/me', { signal })
