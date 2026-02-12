import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a date string to a human-readable format
 */
export function formatDate(dateString: string): string {
  // Parse YYYY-MM-DD manually to avoid UTC timezone shift
  // (new Date("2026-01-12") treats it as UTC midnight, which shifts back 1 day in US timezones)
  const [year, month, day] = dateString.split('-').map(Number)
  if (year && month && day) {
    const date = new Date(year, month - 1, day)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }
  // Fallback for non-YYYY-MM-DD formats (timestamps, etc.)
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/**
 * Format a date string to include time
 */
export function formatDateTime(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Format currency
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

const END_REASON_LABELS: Record<string, string> = {
  transferred: 'Transferred',
  end_of_contract: 'End of Contract',
  laid_off: 'Laid Off',
  termination: 'Terminated',
}

export function formatEndReason(reason: string): string {
  return END_REASON_LABELS[reason] || reason
}
