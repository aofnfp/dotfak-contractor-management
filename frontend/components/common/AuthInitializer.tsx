'use client'

import { useEffect } from 'react'
import { initializeAuth } from '@/lib/hooks/useAuth'
import { initializeImpersonation } from '@/lib/hooks/useImpersonation'

/**
 * Auth Initializer Component
 *
 * Initializes auth state from localStorage on app mount
 * Must be a client component to access localStorage
 */
export function AuthInitializer() {
  useEffect(() => {
    initializeAuth()
    initializeImpersonation()
  }, [])

  return null
}
