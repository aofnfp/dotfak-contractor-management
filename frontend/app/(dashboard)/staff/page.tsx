'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Users, Clock } from 'lucide-react'
import { useManagerDashboardStats } from '@/lib/hooks/useDashboard'

/**
 * My Staff page - Manager view
 * Shows managed contractors with hours only (no earnings/rates)
 */
export default function StaffPage() {
  const { data: stats, isLoading, error } = useManagerDashboardStats()

  return (
    <div className="flex-1 space-y-6 p-8">
      <div>
        <h1 className="text-3xl font-heading font-bold tracking-tight">My Staff</h1>
        <p className="text-muted-foreground mt-1">
          View your managed contractors and their hours
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-secondary">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Staff Count</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.staff_count ?? 0}</div>
            <p className="text-xs text-muted-foreground">Active contractors</p>
          </CardContent>
        </Card>

        <Card className="border-secondary">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Staff Hours</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_hours?.toFixed(1) ?? '0'}</div>
            <p className="text-xs text-muted-foreground">Across all periods</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-secondary">
        <CardHeader>
          <CardTitle>Managed Contractors</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Loading staff...</div>
            </div>
          ) : error ? (
            <div className="text-center py-8 text-destructive">
              Failed to load staff data.
            </div>
          ) : !stats?.staff || stats.staff.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No staff assigned yet</p>
            </div>
          ) : (
            <div className="rounded-md border border-border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-secondary/50 hover:bg-secondary/70">
                    <TableHead className="font-heading">Contractor</TableHead>
                    <TableHead className="font-heading">Client</TableHead>
                    <TableHead className="text-right font-heading">Total Hours</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.staff.map((staff) => (
                    <TableRow key={staff.contractor_assignment_id} className="hover:bg-secondary/30">
                      <TableCell className="font-medium">
                        {staff.contractor_name}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {staff.client_name}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {staff.total_hours.toFixed(1)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
