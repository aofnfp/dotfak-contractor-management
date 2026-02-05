'use client'

import { useState, useCallback } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { MobileNav } from '@/components/layout/MobileNav'
import { ProtectedRoute } from '@/components/common/ProtectedRoute'

/**
 * Dashboard Layout
 *
 * Main layout for all authenticated dashboard pages
 * Includes sidebar, header, and mobile navigation
 */

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  // Memoize callbacks to prevent unnecessary re-renders
  const handleMobileNavClose = useCallback(() => {
    setMobileNavOpen(false)
  }, [])

  const handleMenuClick = useCallback(() => {
    setMobileNavOpen(true)
  }, [])

  return (
    <ProtectedRoute>
      <div className="flex h-screen overflow-hidden bg-background">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex">
          <Sidebar />
        </aside>

        {/* Mobile Navigation */}
        <MobileNav
          isOpen={mobileNavOpen}
          onClose={handleMobileNavClose}
        />

        {/* Main Content Area */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Header */}
          <Header onMenuClick={handleMenuClick} />

          {/* Page Content */}
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  )
}
