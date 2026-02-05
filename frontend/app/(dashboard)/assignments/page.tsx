'use client'

import { useState } from 'react'
import { Plus, Search, Link as LinkIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAssignments } from '@/lib/hooks/useAssignments'
import { AssignmentsTable } from '@/components/assignments/AssignmentsTable'
import { AddAssignmentDialog } from '@/components/assignments/AddAssignmentDialog'

export default function AssignmentsPage() {
  const { data: assignments, isLoading, error } = useAssignments()
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddDialog, setShowAddDialog] = useState(false)

  // Filter assignments based on search query
  const filteredAssignments = assignments?.filter((assignment) => {
    // If no search query, show all assignments
    if (!searchQuery) return true

    const searchLower = searchQuery.toLowerCase()
    return (
      assignment.contractor_name?.toLowerCase().includes(searchLower) ||
      assignment.contractor_code?.toLowerCase().includes(searchLower) ||
      assignment.client_name?.toLowerCase().includes(searchLower) ||
      assignment.client_code?.toLowerCase().includes(searchLower)
    )
  })

  return (
    <div className="flex-1 space-y-6 p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold tracking-tight">Assignments</h1>
          <p className="text-muted-foreground mt-1">
            Manage contractor-client assignments and rate structures
          </p>
        </div>
        <Button
          onClick={() => setShowAddDialog(true)}
          className="bg-cta hover:bg-cta/90 text-white"
        >
          <LinkIcon className="mr-2 h-4 w-4" />
          Create Assignment
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-secondary">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Assignments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{assignments?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              {assignments?.filter((a) => a.is_active).length || 0} active
            </p>
          </CardContent>
        </Card>

        <Card className="border-secondary">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-cta">
              {assignments?.filter((a) => a.is_active).length || 0}
            </div>
            <p className="text-xs text-muted-foreground">Currently active</p>
          </CardContent>
        </Card>

        <Card className="border-secondary">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactive</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">
              {assignments?.filter((a) => !a.is_active).length || 0}
            </div>
            <p className="text-xs text-muted-foreground">Ended or paused</p>
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
                placeholder="Search by contractor or client name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-secondary border-border"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Assignments Table */}
      <Card className="border-secondary">
        <CardHeader>
          <CardTitle>All Assignments</CardTitle>
          <CardDescription>
            {filteredAssignments?.length || 0} assignment(s) found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="text-center py-8 text-destructive">
              Failed to load assignments. Please try again.
            </div>
          ) : (
            <AssignmentsTable
              assignments={filteredAssignments || []}
              isLoading={isLoading}
            />
          )}
        </CardContent>
      </Card>

      {/* Add Assignment Dialog */}
      <AddAssignmentDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
      />
    </div>
  )
}
