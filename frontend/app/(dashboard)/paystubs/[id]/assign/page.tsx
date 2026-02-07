'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AccountAssignmentForm } from '@/components/paystubs/AccountAssignmentForm'
import { paystubsApi } from '@/lib/api/paystubs'
import { getApiErrorMessage } from '@/lib/api/client'
import { toast } from 'sonner'
import type { UnassignedAccountInfo, AccountAssignmentItem } from '@/lib/types/paystub'

export default function AssignAccountsPage() {
  const router = useRouter()
  const params = useParams()
  const paystubId = params.id as string

  const [unassignedAccounts, setUnassignedAccounts] = useState<UnassignedAccountInfo[]>([])
  const [contractorAssignmentId, setContractorAssignmentId] = useState<string | undefined>()
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Get admin user ID from stored user object (set during login)
  const adminUserId = (() => {
    if (typeof window === 'undefined') return ''
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}')
      return user.id || ''
    } catch { return '' }
  })()

  useEffect(() => {
    if (!paystubId) return
    loadUnassignedAccounts()
  }, [paystubId])

  const loadUnassignedAccounts = async () => {
    try {
      setIsLoading(true)

      // First get paystub details to get contractor_assignment_id
      const paystub = await paystubsApi.get(paystubId)
      setContractorAssignmentId(paystub.contractor_assignment_id || undefined)

      // Then check for unassigned accounts
      const result = await paystubsApi.checkAccounts(paystubId)

      if (!result.needs_assignment) {
        // All accounts already assigned, redirect to details
        toast.success('All accounts already assigned')
        router.push(`/paystubs/${paystubId}`)
        return
      }

      setUnassignedAccounts(result.unassigned_accounts)
    } catch (error: any) {
      console.error('Failed to load accounts:', error)
      toast.error(getApiErrorMessage(error, 'Failed to load accounts'))
      router.push(`/paystubs/${paystubId}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAssignmentComplete = async (assignments: AccountAssignmentItem[]) => {
    try {
      setIsSubmitting(true)

      await paystubsApi.assignAccounts(paystubId, { assignments })

      toast.success('Accounts assigned successfully!')
      router.push(`/paystubs/${paystubId}`)
    } catch (error: any) {
      console.error('Failed to assign accounts:', error)
      toast.error(getApiErrorMessage(error, 'Failed to assign accounts'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    router.push(`/paystubs/${paystubId}`)
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-cta" />
          <p className="text-muted-foreground">Loading accounts...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-6 p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/paystubs/${paystubId}`)}
              className="gap-2"
              disabled={isSubmitting}
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </div>
          <h1 className="text-3xl font-heading font-bold tracking-tight">
            Assign New Bank Accounts
          </h1>
          <p className="text-muted-foreground">
            {unassignedAccounts.length} new account(s) detected. Please assign each one.
          </p>
        </div>
      </div>

      {/* Assignment Form */}
      {isSubmitting ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-cta" />
            <p className="text-muted-foreground">Assigning accounts...</p>
          </div>
        </div>
      ) : (
        <AccountAssignmentForm
          unassignedAccounts={unassignedAccounts}
          contractorAssignmentId={contractorAssignmentId}
          adminUserId={adminUserId}
          onAssignmentComplete={handleAssignmentComplete}
          onCancel={handleCancel}
        />
      )}
    </div>
  )
}
