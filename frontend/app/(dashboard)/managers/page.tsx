'use client'

import { useState, useMemo, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { Search, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TableSkeleton } from '@/components/ui/table-skeleton'
import { Pagination } from '@/components/ui/pagination'
import { useManagers } from '@/lib/hooks/useManagers'

const ManagersTable = dynamic(
  () => import('@/components/managers/ManagersTable').then(m => ({ default: m.ManagersTable })),
  { loading: () => <TableSkeleton rows={5} columns={7} /> }
)

const AddManagerDialog = dynamic(
  () => import('@/components/managers/AddManagerDialog').then(m => ({ default: m.AddManagerDialog }))
)

const ITEMS_PER_PAGE = 20

export default function ManagersPage() {
  const { data: managers, isLoading, error } = useManagers()
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setSearchQuery(searchInput)
      setCurrentPage(1)
    }, 300)
    return () => clearTimeout(timeoutId)
  }, [searchInput])

  const filteredManagers = useMemo(() => {
    if (!managers) return []
    if (!searchQuery) return managers

    const searchLower = searchQuery.toLowerCase()
    return managers.filter((manager) =>
      manager.first_name.toLowerCase().includes(searchLower) ||
      manager.last_name.toLowerCase().includes(searchLower) ||
      manager.email.toLowerCase().includes(searchLower) ||
      manager.phone?.toLowerCase().includes(searchLower)
    )
  }, [managers, searchQuery])

  const stats = useMemo(() => {
    if (!managers) return { total: 0, active: 0, onboarded: 0 }
    const active = managers.filter(m => m.is_active).length
    const onboarded = managers.filter(m => m.onboarding_status === 'completed').length
    return { total: managers.length, active, onboarded }
  }, [managers])

  const totalPages = Math.ceil(filteredManagers.length / ITEMS_PER_PAGE)
  const paginatedManagers = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredManagers.slice(startIndex, startIndex + ITEMS_PER_PAGE)
  }, [filteredManagers, currentPage])

  return (
    <div className="flex-1 space-y-6 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold tracking-tight">Managers</h1>
          <p className="text-muted-foreground mt-1">
            Manage staff managers and their assignments
          </p>
        </div>
        <Button
          onClick={() => setShowAddDialog(true)}
          className="bg-cta hover:bg-cta/90 text-white"
        >
          <UserPlus className="mr-2 h-4 w-4" />
          Add Manager
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-secondary">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Managers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">{stats.active} active</p>
          </CardContent>
        </Card>

        <Card className="border-secondary">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-cta">{stats.active}</div>
            <p className="text-xs text-muted-foreground">Currently managing staff</p>
          </CardContent>
        </Card>

        <Card className="border-secondary">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Onboarded</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">{stats.onboarded}</div>
            <p className="text-xs text-muted-foreground">Completed onboarding</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-secondary">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or phone..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-9 bg-secondary border-border"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-secondary">
        <CardHeader>
          <CardTitle>All Managers</CardTitle>
          <CardDescription>{filteredManagers.length} manager(s) found</CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="text-center py-8 text-destructive">
              Failed to load managers. Please try again.
            </div>
          ) : (
            <>
              <ManagersTable managers={paginatedManagers} isLoading={isLoading} />
              {filteredManagers.length > 0 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  itemsPerPage={ITEMS_PER_PAGE}
                  totalItems={filteredManagers.length}
                />
              )}
            </>
          )}
        </CardContent>
      </Card>

      {showAddDialog && (
        <AddManagerDialog
          open={showAddDialog}
          onOpenChange={setShowAddDialog}
        />
      )}
    </div>
  )
}
