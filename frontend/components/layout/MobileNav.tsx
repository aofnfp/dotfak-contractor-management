'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { navigationConfig } from '@/lib/config/navigation'
import { Code2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface MobileNavProps {
  isOpen: boolean
  onClose: () => void
}

/**
 * MobileNav Component
 *
 * Mobile navigation drawer that slides in from the left
 * Displays the same navigation items as the desktop sidebar
 */

export function MobileNav({ isOpen, onClose }: MobileNavProps) {
  const pathname = usePathname()

  // Close mobile nav when route changes
  useEffect(() => {
    onClose()
  }, [pathname, onClose])

  // Prevent body scroll when mobile nav is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm md:hidden"
        onClick={onClose}
      />

      {/* Mobile Nav */}
      <div className="fixed inset-y-0 left-0 z-50 w-72 bg-secondary border-r border-border shadow-xl md:hidden">
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex h-16 items-center justify-between border-b border-border px-6">
            <div className="flex items-center gap-2">
              <Code2 className="h-6 w-6 text-cta" />
              <div className="flex flex-col">
                <span className="text-sm font-heading font-semibold text-text">
                  DotFak
                </span>
                <span className="text-xs text-muted-foreground">
                  Contractor Mgmt
                </span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-11 w-11"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close menu</span>
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4">
            <div className="space-y-6">
              {navigationConfig.map((section) => (
                <div key={section.title}>
                  <h3 className="mb-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {section.title}
                  </h3>
                  <div className="space-y-1">
                    {section.items.map((item) => {
                      const isActive = pathname === item.href
                      const Icon = item.icon

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={cn(
                            'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                            'hover:bg-primary/10 hover:text-text cursor-pointer',
                            isActive
                              ? 'bg-cta/10 text-cta hover:bg-cta/20'
                              : 'text-muted-foreground'
                          )}
                        >
                          <Icon className="h-4 w-4" />
                          <span>{item.title}</span>
                          {item.badge && (
                            <span className="ml-auto rounded-full bg-cta/20 px-2 py-0.5 text-xs font-semibold text-cta">
                              {item.badge}
                            </span>
                          )}
                        </Link>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </nav>

          {/* Footer */}
          <div className="border-t border-border p-4">
            <div className="rounded-lg bg-primary/50 p-3">
              <p className="text-xs text-muted-foreground">
                DotFak Group LLC
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                v1.0.0
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
