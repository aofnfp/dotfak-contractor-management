'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { initializeAuth } from '@/lib/hooks/useAuth'

/**
 * Providers Component
 *
 * Wraps the app with necessary providers:
 * - React Query for server state management
 * - Auth state initialization from localStorage
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
          },
        },
      })
  )

  // Initialize auth state from localStorage on mount
  useEffect(() => {
    initializeAuth()
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
