'use client'

import { Eye, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useImpersonation } from '@/lib/hooks/useImpersonation'

/**
 * Persistent banner shown at the top of every dashboard page when an admin
 * is impersonating another user. Cannot be dismissed without exiting.
 */
export function ImpersonationBanner() {
  const { target, stopImpersonating } = useImpersonation()

  if (!target) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center justify-between gap-3 border-b-2 border-yellow-500 bg-yellow-500/15 px-4 py-2 text-sm text-yellow-100"
    >
      <div className="flex items-center gap-2">
        <Eye className="h-4 w-4 text-yellow-400" />
        <span>
          Viewing as{' '}
          <strong className="font-semibold">{target.name}</strong>
          {target.code && <span className="text-yellow-300/80"> ({target.code})</span>}
          <span className="ml-2 rounded bg-yellow-500/30 px-2 py-0.5 text-xs uppercase tracking-wider">
            {target.role}
          </span>
        </span>
        <span className="hidden text-xs text-yellow-300/70 md:inline">
          · Read-only — writes are blocked while impersonating
        </span>
      </div>
      <Button
        size="sm"
        variant="outline"
        onClick={() => stopImpersonating()}
        className="h-8 border-yellow-500 text-yellow-100 hover:bg-yellow-500/20 hover:text-white"
      >
        <X className="mr-1 h-3 w-3" />
        Exit
      </Button>
    </div>
  )
}
