import {
  LayoutDashboard,
  Users,
  Briefcase,
  FileText,
  DollarSign,
  CreditCard,
  UserCheck,
  FileSignature,
} from 'lucide-react'
import type { NavSection } from '@/lib/types/navigation'

/**
 * Navigation Configuration
 *
 * Items with `roles` are only visible to those roles.
 * Items without `roles` are visible to everyone.
 */

export const navigationConfig: NavSection[] = [
  {
    title: 'Overview',
    items: [
      {
        title: 'Dashboard',
        href: '/dashboard',
        icon: LayoutDashboard,
        description: 'Overview and statistics',
      },
    ],
  },
  {
    title: 'Management',
    items: [
      {
        title: 'Contractors',
        href: '/contractors',
        icon: Users,
        description: 'Manage contractor profiles',
        roles: ['admin'],
      },
      {
        title: 'Assignments',
        href: '/assignments',
        icon: Briefcase,
        description: 'Contractor-client assignments',
        roles: ['admin'],
      },
      {
        title: 'Paystubs',
        href: '/paystubs',
        icon: FileText,
        description: 'Upload and view paystubs',
        roles: ['admin'],
      },
    ],
  },
  {
    title: 'Onboarding',
    items: [
      {
        title: 'Onboarding',
        href: '/onboarding',
        icon: UserCheck,
        description: 'Contractor invitations and setup',
        roles: ['admin'],
      },
      {
        title: 'Contracts',
        href: '/contracts',
        icon: FileSignature,
        description: 'Agreements and signatures',
      },
    ],
  },
  {
    title: 'Financials',
    items: [
      {
        title: 'Earnings',
        href: '/earnings',
        icon: DollarSign,
        description: 'Contractor earnings tracking',
      },
      {
        title: 'Payments',
        href: '/payments',
        icon: CreditCard,
        description: 'Record and track payments',
      },
    ],
  },
]
