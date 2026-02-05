'use client'

import { ErrorBoundary } from './ErrorBoundary'
import { ReactNode } from 'react'

/**
 * Root Error Boundary Wrapper
 *
 * Client-side wrapper for the root layout to catch all React errors
 */
export function RootErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        // In production, send to error tracking service
        if (process.env.NODE_ENV === 'production') {
          // Example: Sentry.captureException(error, { contexts: { react: errorInfo } })
          console.error('Root error:', error, errorInfo)
        }
      }}
    >
      {children}
    </ErrorBoundary>
  )
}
