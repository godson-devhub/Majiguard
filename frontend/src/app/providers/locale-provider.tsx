import { createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'

import { en, sw, type MessageKey, type MessageValues, type Messages } from '@/i18n/messages'

export type Locale = 'en' | 'sw'

const STORAGE_KEY = 'majiguard.locale'

const catalogues: Record<Locale, Messages> = { en, sw }

export const availableLocales: { locale: Locale; label: MessageKey }[] = [
  { locale: 'en', label: 'locale.en' },
  { locale: 'sw', label: 'locale.sw' },
]

function interpolate(template: string, values?: MessageValues): string {
  if (values === undefined) {
    return template
  }
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = values[name]
    return value === undefined ? match : String(value)
  })
}

export type Translate = (key: MessageKey, values?: MessageValues) => string

type LocaleContextValue = {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: Translate
}

const LocaleContext = createContext<LocaleContextValue | null>(null)

function readStoredLocale(): Locale {
  if (typeof window === 'undefined') {
    return 'en'
  }
  return window.localStorage.getItem(STORAGE_KEY) === 'sw' ? 'sw' : 'en'
}

type LocaleProviderProps = {
  children: ReactNode
}

export function LocaleProvider({ children }: LocaleProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(readStoredLocale)

  useEffect(() => {
    document.documentElement.lang = locale
    window.localStorage.setItem(STORAGE_KEY, locale)
  }, [locale])

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next)
  }, [])

  const t = useMemo<Translate>(() => {
    const catalogue = catalogues[locale]
    return (key, values) => interpolate(catalogue[key], values)
  }, [locale])

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t])

  return <LocaleContext value={value}>{children}</LocaleContext>
}

export function useI18n(): LocaleContextValue {
  const context = use(LocaleContext)
  if (context === null) {
    throw new Error('useI18n must be used inside LocaleProvider')
  }
  return context
}
