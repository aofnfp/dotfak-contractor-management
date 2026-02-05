import {
  LayoutDashboard,
  Users,
  Briefcase,
  FileText,
  DollarSign,
  CreditCard,
  BarChart3,
} from 'lucide-react'
import type { NavSection } from '@/lib/types/navigation'

/**
 * Navigation Configuration
 *
 * Defines all navigation items for the admin dashboard
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
      },
      {
        title: 'Assignments',
        href: '/assignments',
        icon: Briefcase,
        description: 'Contractor-client assignments',
      },
      {
        title: 'Paystubs',
        href: '/paystubs',
        icon: FileText,
        description: 'Upload and view paystubs',
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
      {
        title: 'Reports',
        href: '/reports',
        icon: BarChart3,
        description: 'Financial reports',
      },
    ],
  },
]
