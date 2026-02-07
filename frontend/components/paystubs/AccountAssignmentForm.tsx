'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle } from 'lucide-react'
import type { UnassignedAccountInfo, AccountAssignmentItem } from '@/lib/types/paystub'

interface Props {
  unassignedAccounts: UnassignedAccountInfo[]
  contractorAssignmentId?: string
  adminUserId: string
  onAssignmentComplete: (assignments: AccountAssignmentItem[]) => void
  onCancel?: () => void
}

export function AccountAssignmentForm({
  unassignedAccounts,
  contractorAssignmentId,
  adminUserId,
  onAssignmentComplete,
  onCancel,
}: Props) {
  const [assignments, setAssignments] = useState<Map<string, { owner_type: 'contractor' | 'admin', owner_id: string }>>(
    new Map()
  )

  const handleAssignment = (accountLast4: string, ownerType: 'contractor' | 'admin') => {
    const newAssignments = new Map(assignments)
    newAssignments.set(accountLast4, {
      owner_type: ownerType,
      owner_id: ownerType === 'admin' ? adminUserId : (contractorAssignmentId || ''),
    })
    setAssignments(newAssignments)
  }

  const handleSubmit = () => {
    // Validate all accounts assigned
    if (assignments.size !== unassignedAccounts.length) {
      alert('Please assign all accounts before continuing')
      return
    }

    // Validate contractor assignments have owner_id
    for (const [accountLast4, assignment] of assignments.entries()) {
      if (assignment.owner_type === 'contractor' && !assignment.owner_id) {
        alert(`Cannot assign account ****${accountLast4} to contractor: No contractor assignment found for this paystub`)
        return
      }
    }

    // Build final assignments
    const finalAssignments: AccountAssignmentItem[] = Array.from(assignments.entries()).map(
      ([account_last4, assignment]) => ({
        account_last4,
        owner_type: assignment.owner_type,
        owner_id: assignment.owner_id,
      })
    )

    onAssignmentComplete(finalAssignments)
  }

  const allAssigned = assignments.size === unassignedAccounts.length
  const hasContractorOption = !!contractorAssignmentId

  // Calculate totals
  const totalAmount = unassignedAccounts.reduce((sum, acc) => sum + Number(acc.amount), 0)
  const contractorTotal = Array.from(assignments.entries())
    .filter(([_, assignment]) => assignment.owner_type === 'contractor')
    .reduce((sum, [accountLast4, _]) => {
      const account = unassignedAccounts.find(acc => acc.account_last4 === accountLast4)
      return sum + Number(account?.amount || 0)
    }, 0)
  const adminTotal = Array.from(assignments.entries())
    .filter(([_, assignment]) => assignment.owner_type === 'admin')
    .reduce((sum, [accountLast4, _]) => {
      const account = unassignedAccounts.find(acc => acc.account_last4 === accountLast4)
      return sum + Number(account?.amount || 0)
    }, 0)

  return (
    <div className="space-y-6">
      {/* Warning if no contractor assignment */}
      {!hasContractorOption && (
        <div className="rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-yellow-500">No Contractor Assignment</h4>
            <p className="text-xs text-muted-foreground mt-1">
              This paystub is not linked to a contractor assignment. All accounts must be assigned to Admin.
            </p>
          </div>
        </div>
      )}

      {/* Account List */}
      <div className="space-y-4">
        {unassignedAccounts.map((account, index) => {
          const currentAssignment = assignments.get(account.account_last4)

          return (
            <Card key={account.account_last4} className="border-secondary">
              <CardHeader>
                <CardTitle className="text-lg font-medium flex items-center justify-between">
                  <span>
                    New Account: {account.bank_name} ****{account.account_last4}
                  </span>
                  <span className="text-2xl font-heading text-cta">
                    ${Number(account.amount).toFixed(2)}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {account.account_name && (
                    <div>
                      <p className="text-sm text-muted-foreground">Account Name</p>
                      <p className="font-medium">{account.account_name}</p>
                    </div>
                  )}

                  <div>
                    <Label className="text-sm mb-2 block">Assign to:</Label>
                    <RadioGroup
                      value={currentAssignment?.owner_type || ''}
                      onValueChange={(value) => handleAssignment(account.account_last4, value as 'contractor' | 'admin')}
                    >
                      {hasContractorOption && (
                        <div className="flex items-center space-x-2 mb-2">
                          <RadioGroupItem value="contractor" id={`contractor-${account.account_last4}`} />
                          <Label htmlFor={`contractor-${account.account_last4}`} className="cursor-pointer font-normal">
                            Contractor
                          </Label>
                        </div>
                      )}
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="admin" id={`admin-${account.account_last4}`} />
                        <Label htmlFor={`admin-${account.account_last4}`} className="cursor-pointer font-normal">
                          Admin (Me)
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Summary */}
      {assignments.size > 0 && (
        <Card className="border-secondary bg-secondary/50">
          <CardHeader>
            <CardTitle className="text-base">Assignment Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Amount:</span>
              <span className="font-medium">${totalAmount.toFixed(2)}</span>
            </div>
            {hasContractorOption && contractorTotal > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Contractor:</span>
                <span className="font-medium text-cta">${contractorTotal.toFixed(2)}</span>
              </div>
            )}
            {adminTotal > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Admin:</span>
                <span className="font-medium text-cta">${adminTotal.toFixed(2)}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3">
        {onCancel && (
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button
          onClick={handleSubmit}
          disabled={!allAssigned}
          className="bg-cta hover:bg-cta/90 text-white"
        >
          Assign Accounts
        </Button>
      </div>
    </div>
  )
}
