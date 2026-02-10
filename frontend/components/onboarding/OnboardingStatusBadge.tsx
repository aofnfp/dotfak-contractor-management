'use client'

import { Badge } from '@/components/ui/badge'
import type { OnboardingStatus } from '@/lib/types/onboarding'

const statusConfig: Record<OnboardingStatus, { label: string; className: string }> = {
  not_invited: {
    label: 'Not Invited',
    className: 'bg-secondary text-muted-foreground border-border',
  },
  invited: {
    label: 'Invited',
    className: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  },
  account_created: {
    label: 'Account Created',
    className: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  },
  profile_completed: {
    label: 'Profile Done',
    className: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  },
  contract_signed: {
    label: 'Contract Signed',
    className: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  },
  fully_onboarded: {
    label: 'Fully Onboarded',
    className: 'bg-green-500/10 text-green-400 border-green-500/20',
  },
}

interface OnboardingStatusBadgeProps {
  status: OnboardingStatus
}

export function OnboardingStatusBadge({ status }: OnboardingStatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.not_invited
  return <Badge className={config.className}>{config.label}</Badge>
}
