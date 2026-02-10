'use client'

import { Badge } from '@/components/ui/badge'
import type { ContractStatus } from '@/lib/types/contract'

const statusConfig: Record<ContractStatus, { label: string; className: string }> = {
  draft: {
    label: 'Draft',
    className: 'bg-secondary text-muted-foreground border-border',
  },
  pending_contractor: {
    label: 'Awaiting Contractor',
    className: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  },
  pending_admin: {
    label: 'Awaiting Admin',
    className: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  },
  fully_executed: {
    label: 'Executed',
    className: 'bg-green-500/10 text-green-400 border-green-500/20',
  },
  superseded: {
    label: 'Superseded',
    className: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  },
  voided: {
    label: 'Voided',
    className: 'bg-red-500/10 text-red-400 border-red-500/20',
  },
}

interface ContractStatusBadgeProps {
  status: ContractStatus
}

export function ContractStatusBadge({ status }: ContractStatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.draft
  return <Badge className={config.className}>{config.label}</Badge>
}
