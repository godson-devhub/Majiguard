import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { App } from '@/app/App'
import { DecisionMapFilterProvider } from '@/app/providers/decision-map-filter-provider'
import { AuthProvider } from '@/app/providers/auth-provider'
import { LocaleProvider } from '@/app/providers/locale-provider'
import { QueryProvider } from '@/app/providers/query-provider'
import { ThemeProvider } from '@/app/providers/theme-provider'
import { TooltipProvider } from '@/components/ui/tooltip'
import { registerServiceWorker } from '@/lib/register-service-worker'
import '@/index.css'

registerServiceWorker()

const container = document.getElementById('root')

if (container === null) {
  throw new Error('Root container #root was not found')
}

createRoot(container).render(
  <StrictMode>
    <ThemeProvider>
      <LocaleProvider>
        <QueryProvider>
          <AuthProvider>
            <TooltipProvider>
              <DecisionMapFilterProvider>
                <App />
              </DecisionMapFilterProvider>
            </TooltipProvider>
          </AuthProvider>
        </QueryProvider>
      </LocaleProvider>
    </ThemeProvider>
  </StrictMode>,
)
