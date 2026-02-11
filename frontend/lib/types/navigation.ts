import { LucideIcon } from 'lucide-react'

/**
 * Navigation Types
 */

export interface NavItem {
  title: string
  href: string
  icon: LucideIcon
  badge?: string
  description?: string
  roles?: ('admin' | 'contractor' | 'manager')[]
}

export interface NavSection {
  title: string
  items: NavItem[]
}
