'use client'

import { useState, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { Mail, UserCheck, Clock, CheckCircle2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TableSkeleton } from '@/components/ui/table-skeleton'
import { Pagination } from '@/components/ui/pagination'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useOnboardingStatus, useResendInvitation, useRevokeInvitation, useInvitations } from '@/lib/hooks/useOnboarding'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/lib/api/client'
import type { OnboardingStatus } from '@/lib/types/onboarding'

const OnboardingTable = dynamic(
  () => import('@/components/onboarding/OnboardingTable').then(m => ({ default: m.OnboardingTable })),
  { loading: () => <TableSkeleton rows={5} columns={6} /> }
)

const InviteContractorDialog = dynamic(
  () => import('@/components/onboarding/InviteContractorDialog').then(m => ({ default: m.InviteContractorDialog }))
)

const ITEMS_PER_PAGE = 20

export default function OnboardingPage() {
  const { data: statusItems, isLoading, error } = useOnboardingStatus()
  const { data: invitations } = useInvitations()
  const resendInvitation = useResendInvitation()
  const revokeInvitation = useRevokeInvitation()

  const [showInviteDialog, setShowInviteDialog] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)

  const stats = useMemo(() => {
    if (!statusItems) return { total: 0, notInvited: 0, inProgress: 0, onboarded: 0 }
    return {
      total: statusItems.length,
      notInvited: statusItems.filter(s => s.onboarding_status === 'not_invited').length,
      inProgress: statusItems.filter(s =>
        ['invited', 'account_created', 'profile_completed', 'contract_signed'].includes(s.onboarding_status)
      ).length,
      onboarded: statusItems.filter(s => s.onboarding_status === 'fully_onboarded').length,
    }
  }, [statusItems])

  const filteredItems = useMemo(() => {
    if (!statusItems) return []
    if (statusFilter === 'all') return statusItems
    return statusItems.filter(s => s.onboarding_status === statusFilter)
  }, [statusItems, statusFilter])

  const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE)
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredItems.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredItems, currentPage])

  const handleResend = async (contractorId: string) => {
    // Find the pending invitation for this contractor
    const inv = invitations?.find(
      i => i.contractor_id === contractorId && i.status === 'pending'
    )
    if (!inv) {
      toast.error('No pending invitation found')
      return
    }
    try {
      await resendInvitation.mutateAsync(inv.id)
      toast.success('Invitation resent')
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to resend invitation'))
    }
  }

  const handleRevoke = async (contractorId: string) => {
    const inv = invitations?.find(
      i => i.contractor_id === contractorId && i.status === 'pending'
    )
    if (!inv) {
      toast.error('No pending invitation found')
      return
    }
    try {
      await revokeInvitation.mutateAsync(inv.id)
      toast.success('Invitation revoked')
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to revoke invitation'))
    }
  }

  return (
    <div className="flex-1 space-y-6 p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold tracking-tight">Onboarding</h1>
          <p className="text-muted-foreground mt-1">
            Manage contractor invitations and onboarding progress
          </p>
        </div>
        <Button
          onClick={() => setShowInviteDialog(true)}
          className="bg-cta hover:bg-cta/90 text-white"
        >
          <Mail className="mr-2 h-4 w-4" />
          Invite Contractor
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-secondary">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">All contractors</p>
          </CardContent>
        </Card>

        <Card className="border-secondary">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Not Invited</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">{stats.notInvited}</div>
            <p className="text-xs text-muted-foreground">Pending invitation</p>
          </CardContent>
        </Card>

        <Card className="border-secondary">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Clock className="h-4 w-4 text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-400">{stats.inProgress}</div>
            <p className="text-xs text-muted-foreground">Going through steps</p>
          </CardContent>
        </Card>

        <Card className="border-secondary">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fully Onboarded</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-400">{stats.onboarded}</div>
            <p className="text-xs text-muted-foreground">Complete</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <Card className="border-secondary">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Select
              value={statusFilter}
              onValueChange={(val) => { setStatusFilter(val); setCurrentPage(1) }}
            >
              <SelectTrigger className="w-[220px] bg-secondary border-border">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="not_invited">Not Invited</SelectItem>
                <SelectItem value="invited">Invited</SelectItem>
                <SelectItem value="account_created">Account Created</SelectItem>
                <SelectItem value="profile_completed">Profile Completed</SelectItem>
                <SelectItem value="contract_signed">Contract Signed</SelectItem>
                <SelectItem value="fully_onboarded">Fully Onboarded</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Onboarding Table */}
      <Card className="border-secondary">
        <CardHeader>
          <CardTitle>Contractor Onboarding</CardTitle>
          <CardDescription>
            {filteredItems.length} contractor(s) found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="text-center py-8 text-destructive">
              Failed to load onboarding data. Please try again.
            </div>
          ) : (
            <>
              <OnboardingTable
                items={paginatedItems}
                isLoading={isLoading}
                onInvite={(id) => setShowInviteDialog(true)}
                onResend={handleResend}
                onRevoke={handleRevoke}
              />
              {filteredItems.length > 0 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  itemsPerPage={ITEMS_PER_PAGE}
                  totalItems={filteredItems.length}
                />
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Invite Dialog */}
      {showInviteDialog && (
        <InviteContractorDialog
          open={showInviteDialog}
          onOpenChange={setShowInviteDialog}
        />
      )}
    </div>
  )
}
