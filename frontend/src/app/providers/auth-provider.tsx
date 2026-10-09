import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import { clearAuthToken, getAuthToken, setAuthToken } from '@/lib/auth-token'
import { ApiError } from '@/lib/api-client'
import {
  fetchCurrentUser,
  loginAccount,
  registerAccount,
  type AuthUser,
  type LoginResponse,
  type RegisterBody,
} from '@/services/auth'

type AuthState =
  | { status: 'loading'; user: null }
  | { status: 'anonymous'; user: null }
  | { status: 'authenticated'; user: AuthUser }

type AuthContextValue = AuthState & {
  login: (email: string, password: string) => Promise<void>
  register: (body: RegisterBody) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

/**
 * Holds the signed-in user. On load it asks the API who the stored token
 * belongs to; a rejected token (expired, disabled account, new server key) is
 * discarded so the user lands on the sign-in page instead of a broken app.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(() =>
    getAuthToken() === null ? { status: 'anonymous', user: null } : { status: 'loading', user: null },
  )

  useEffect(() => {
    if (getAuthToken() === null) {
      return
    }
    const controller = new AbortController()
    fetchCurrentUser(controller.signal)
      .then((user) => {
        setState({ status: 'authenticated', user })
      })
      .catch((error: unknown) => {
        if (error instanceof Error && error.name === 'AbortError') {
          return
        }
        // 401: the token is no longer valid. Network trouble: keep the token but
        // treat the session as signed out until the service is reachable.
        if (error instanceof ApiError && error.status === 401) {
          clearAuthToken()
        }
        setState({ status: 'anonymous', user: null })
      })
    return () => {
      controller.abort()
    }
  }, [])

  const signIn = useCallback((result: LoginResponse) => {
    setAuthToken(result.access_token)
    setState({ status: 'authenticated', user: result.user })
  }, [])

  const login = useCallback(
    async (email: string, password: string) => {
      signIn(await loginAccount(email, password))
    },
    [signIn],
  )

  const register = useCallback(
    async (body: RegisterBody) => {
      signIn(await registerAccount(body))
    },
    [signIn],
  )

  const logout = useCallback(() => {
    clearAuthToken()
    setState({ status: 'anonymous', user: null })
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ ...state, login, register, logout }),
    [state, login, register, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext)
  if (value === null) {
    throw new Error('useAuth must be used inside AuthProvider')
  }
  return value
}
