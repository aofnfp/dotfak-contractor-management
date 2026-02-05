'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { Upload, Search, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TableSkeleton } from '@/components/ui/table-skeleton'
import { usePaystubs } from '@/lib/hooks/usePaystubs'

// Lazy load heavy table component
const PaystubsTable = dynamic(
  () => import('@/components/paystubs/PaystubsTable').then(m => ({ default: m.PaystubsTable })),
  {
    loading: () => <TableSkeleton rows={5} columns={6} />
  }
)

export default function PaystubsPage() {
  const router = useRouter()
  const { data: paystubs, isLoading, error } = usePaystubs()
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  // Debounce search query (300ms delay)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setSearchQuery(searchInput)
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchInput])

  // Filter paystubs based on search query (memoized to prevent recalculation)
  const filteredPaystubs = useMemo(() => {
    if (!paystubs) return []
    if (!searchQuery) return paystubs

    const searchLower = searchQuery.toLowerCase()
    return paystubs.filter((paystub) =>
      paystub.contractor_name?.toLowerCase().includes(searchLower) ||
      paystub.contractor_code?.toLowerCase().includes(searchLower) ||
      paystub.client_name?.toLowerCase().includes(searchLower) ||
      paystub.client_code?.toLowerCase().includes(searchLower) ||
      paystub.file_name?.toLowerCase().includes(searchLower)
    )
  }, [paystubs, searchQuery])

  // Calculate stats (memoized - single pass instead of two)
  const stats = useMemo(() => {
    if (!paystubs) return { total: 0, matched: 0, unmatched: 0 }

    let matched = 0
    let unmatched = 0

    paystubs.forEach(p => {
      if (p.contractor_assignment_id) {
        matched++
      } else {
        unmatched++
      }
    })

    return {
      total: paystubs.length,
      matched,
      unmatched
    }
  }, [paystubs])

  return (
    <div className="flex-1 space-y-6 p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold tracking-tight">Paystubs</h1>
          <p className="text-muted-foreground mt-1">
            Upload and manage contractor paystubs
          </p>
        </div>
        <Button
          onClick={() => router.push('/paystubs/upload')}
          className="bg-cta hover:bg-cta/90 text-white"
        >
          <Upload className="mr-2 h-4 w-4" />
          Upload Paystub
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-secondary">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Paystubs</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              All uploaded paystubs
            </p>
          </CardContent>
        </Card>

        <Card className="border-secondary">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Matched</CardTitle>
            <FileText className="h-4 w-4 text-cta" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-cta">{stats.matched}</div>
            <p className="text-xs text-muted-foreground">
              Assigned to contractors
            </p>
          </CardContent>
        </Card>

        <Card className="border-secondary">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unmatched</CardTitle>
            <FileText className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.unmatched}</div>
            <p className="text-xs text-muted-foreground">
              Need assignment
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card className="border-secondary">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by contractor, client, or filename..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-9 bg-secondary border-border"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Paystubs Table */}
      <Card className="border-secondary">
        <CardHeader>
          <CardTitle>All Paystubs</CardTitle>
          <CardDescription>
            {filteredPaystubs.length} paystub(s) found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="text-center py-8 text-destructive">
              Failed to load paystubs. Please try again.
            </div>
          ) : (
            <PaystubsTable
              paystubs={filteredPaystubs}
              isLoading={isLoading}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
