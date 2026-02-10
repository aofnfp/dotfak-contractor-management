'use client'

import { memo } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Mail, RotateCcw, XCircle } from 'lucide-react'
import { TableSkeleton } from '@/components/ui/table-skeleton'
import { OnboardingStatusBadge } from './OnboardingStatusBadge'
import type { OnboardingStatusItem } from '@/lib/types/onboarding'

interface OnboardingTableProps {
  items: OnboardingStatusItem[]
  isLoading: boolean
  onInvite?: (contractorId: string, contractorName: string) => void
  onResend?: (contractorId: string) => void
  onRevoke?: (contractorId: string) => void
}

export const OnboardingTable = memo(function OnboardingTable({
  items,
  isLoading,
  onInvite,
  onResend,
  onRevoke,
}: OnboardingTableProps) {
  if (isLoading) {
    return <TableSkeleton rows={5} columns={6} />
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No contractors found.
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="border-border hover:bg-transparent">
          <TableHead>Contractor</TableHead>
          <TableHead>Code</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Contract</TableHead>
          <TableHead className="w-[70px]">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TableRow key={item.contractor_id} className="border-border">
            <TableCell className="font-medium">{item.contractor_name}</TableCell>
            <TableCell className="text-muted-foreground">{item.contractor_code}</TableCell>
            <TableCell className="text-muted-foreground">{item.email || '—'}</TableCell>
            <TableCell>
              <OnboardingStatusBadge status={item.onboarding_status} />
            </TableCell>
            <TableCell className="text-muted-foreground">
              {item.contract_status || '—'}
            </TableCell>
            <TableCell>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-secondary border-border">
                  {item.onboarding_status === 'not_invited' && item.has_active_assignment && (
                    <DropdownMenuItem
                      onClick={() => onInvite?.(item.contractor_id, item.contractor_name)}
                    >
                      <Mail className="mr-2 h-4 w-4" />
                      Send Invitation
                    </DropdownMenuItem>
                  )}
                  {item.onboarding_status === 'invited' && (
                    <>
                      <DropdownMenuItem onClick={() => onResend?.(item.contractor_id)}>
                        <RotateCcw className="mr-2 h-4 w-4" />
                        Resend Invitation
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onRevoke?.(item.contractor_id)}
                        className="text-destructive"
                      >
                        <XCircle className="mr-2 h-4 w-4" />
                        Revoke Invitation
                      </DropdownMenuItem>
                    </>
                  )}
                  {item.onboarding_status === 'not_invited' && !item.has_active_assignment && (
                    <DropdownMenuItem disabled>
                      No active assignment
                    </DropdownMenuItem>
                  )}
                  {!['not_invited', 'invited'].includes(item.onboarding_status) && (
                    <DropdownMenuItem disabled>
                      No actions available
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
})
