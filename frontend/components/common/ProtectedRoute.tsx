'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: 'admin' | 'contractor'
}

/**
 * Protected Route Component
 *
 * Wraps pages that require authentication
 * Redirects to login if not authenticated
 * Optionally checks for specific role
 */
export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const router = useRouter()
  const { isAuthenticated, user, isInitialized } = useAuth()

  useEffect(() => {
    // Wait for auth initialization to complete
    if (!isInitialized) return

    if (!isAuthenticated) {
      router.push('/login')
      return
    }

    if (requiredRole && user?.role !== requiredRole) {
      // User doesn't have required role
      router.push('/unauthorized')
    }
  }, [isAuthenticated, user, requiredRole, isInitialized, router])

  // Show loading while auth is initializing
  if (!isInitialized || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cta mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (requiredRole && user?.role !== requiredRole) {
    return null
  }

  return <>{children}</>
}
