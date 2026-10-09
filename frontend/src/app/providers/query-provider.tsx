import { useState, type ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'

import { enableSmallQueryPersistence } from '@/lib/persist-small-queries'
import { createQueryClient } from '@/lib/query-client'

type QueryProviderProps = {
  children: ReactNode
}

export function QueryProvider({ children }: QueryProviderProps) {
  const [queryClient] = useState(() => {
    const client = createQueryClient()
    enableSmallQueryPersistence(client)
    return client
  })

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}
