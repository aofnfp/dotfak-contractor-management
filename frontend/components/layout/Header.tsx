'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { useImpersonation } from '@/lib/hooks/useImpersonation'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Menu, User, LogOut, Settings, Eye } from 'lucide-react'
import { ImpersonatePicker } from '@/components/admin/ImpersonatePicker'

interface HeaderProps {
  onMenuClick?: () => void
}

/**
 * Header Component
 *
 * Top navigation bar with user menu and mobile menu trigger
 */

export function Header({ onMenuClick }: HeaderProps) {
  const { user, logout } = useAuth()
  const { target: impersonationTarget, stopImpersonating } = useImpersonation()
  const [pickerOpen, setPickerOpen] = useState(false)

  // Admin-only feature. We gate on the locally-stored user.role which always
  // reflects the actual admin (impersonation only affects backend identity).
  const isAdmin = user?.role === 'admin'

  const handleLogout = () => {
    logout()
    window.location.href = '/login'
  }

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b border-gold/30 bg-secondary px-6">
      {/* Mobile Menu Button */}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={onMenuClick}
      >
        <Menu className="h-5 w-5" />
        <span className="sr-only">Toggle menu</span>
      </Button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* User Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="relative h-11 w-11 rounded-full border-2 border-border hover:border-gold cursor-pointer"
          >
            <User className="h-4 w-4" />
            <span className="sr-only">Open user menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 bg-secondary border-gold/30">
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none text-text">
                {user?.email}
              </p>
              <p className="text-xs leading-none text-muted-foreground mt-1">
                <span className="inline-flex items-center rounded-full bg-cta/10 px-2 py-0.5 text-xs font-medium text-cta">
                  {user?.role}
                </span>
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-border" />
          <DropdownMenuItem className="cursor-pointer hover:bg-primary/10">
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </DropdownMenuItem>
          {isAdmin && (
            <>
              <DropdownMenuSeparator className="bg-border" />
              {impersonationTarget ? (
                <DropdownMenuItem
                  className="cursor-pointer hover:bg-yellow-500/10 text-yellow-300 focus:text-yellow-200"
                  onClick={() => stopImpersonating()}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  <span>Exit "View as {impersonationTarget.name}"</span>
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  className="cursor-pointer hover:bg-primary/10"
                  onClick={() => setPickerOpen(true)}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  <span>View as another user…</span>
                </DropdownMenuItem>
              )}
            </>
          )}
          <DropdownMenuSeparator className="bg-border" />
          <DropdownMenuItem
            className="cursor-pointer hover:bg-destructive/10 text-destructive focus:text-destructive"
            onClick={handleLogout}
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>Log out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {isAdmin && (
        <ImpersonatePicker open={pickerOpen} onOpenChange={setPickerOpen} />
      )}
    </header>
  )
}
