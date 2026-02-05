'use client'

import { useState, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { Plus, Search, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useContractors } from '@/lib/hooks/useContractors'

// Lazy load heavy components
const ContractorsTable = dynamic(
  () => import('@/components/contractors/ContractorsTable').then(m => ({ default: m.ContractorsTable })),
  {
    loading: () => (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cta"></div>
      </div>
    )
  }
)

const AddContractorDialog = dynamic(
  () => import('@/components/contractors/AddContractorDialog').then(m => ({ default: m.AddContractorDialog }))
)

export default function ContractorsPage() {
  const { data: contractors, isLoading, error } = useContractors()
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddDialog, setShowAddDialog] = useState(false)

  // Filter contractors based on search query (memoized to prevent recalculation)
  const filteredContractors = useMemo(() => {
    if (!contractors) return []
    if (!searchQuery) return contractors

    const searchLower = searchQuery.toLowerCase()
    return contractors.filter((contractor) =>
      contractor.first_name.toLowerCase().includes(searchLower) ||
      contractor.last_name.toLowerCase().includes(searchLower) ||
      contractor.contractor_code.toLowerCase().includes(searchLower) ||
      contractor.phone?.toLowerCase().includes(searchLower)
    )
  }, [contractors, searchQuery])

  // Calculate stats (memoized to prevent recalculation)
  const stats = useMemo(() => {
    if (!contractors) return { total: 0, active: 0, inactive: 0 }

    const active = contractors.filter(c => c.is_active).length
    return {
      total: contractors.length,
      active,
      inactive: contractors.length - active
    }
  }, [contractors])

  return (
    <div className="flex-1 space-y-6 p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold tracking-tight">Contractors</h1>
          <p className="text-muted-foreground mt-1">
            Manage contractor profiles and assignments
          </p>
        </div>
        <Button
          onClick={() => setShowAddDialog(true)}
          className="bg-cta hover:bg-cta/90 text-white"
        >
          <UserPlus className="mr-2 h-4 w-4" />
          Add Contractor
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-secondary">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Contractors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              {stats.active} active
            </p>
          </CardContent>
        </Card>

        <Card className="border-secondary">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-cta">
              {stats.active}
            </div>
            <p className="text-xs text-muted-foreground">Currently working</p>
          </CardContent>
        </Card>

        <Card className="border-secondary">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactive</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">
              {stats.inactive}
            </div>
            <p className="text-xs text-muted-foreground">Not currently working</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="border-secondary">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, code, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-secondary border-border"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contractors Table */}
      <Card className="border-secondary">
        <CardHeader>
          <CardTitle>All Contractors</CardTitle>
          <CardDescription>
            {filteredContractors.length} contractor(s) found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="text-center py-8 text-destructive">
              Failed to load contractors. Please try again.
            </div>
          ) : (
            <ContractorsTable
              contractors={filteredContractors}
              isLoading={isLoading}
            />
          )}
        </CardContent>
      </Card>

      {/* Add Contractor Dialog */}
      {showAddDialog && (
        <AddContractorDialog
          open={showAddDialog}
          onOpenChange={setShowAddDialog}
        />
      )}
    </div>
  )
}
