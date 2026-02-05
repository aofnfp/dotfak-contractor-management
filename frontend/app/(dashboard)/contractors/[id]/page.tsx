'use client'

import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Pencil, Trash2, Building2, Calendar, Phone, MapPin, FileText, Link as LinkIcon, DollarSign } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useContractor, useDeleteContractor } from '@/lib/hooks/useContractors'
import { useContractorAssignments } from '@/lib/hooks/useAssignments'
import { formatDate, formatCurrency } from '@/lib/utils'

export default function ContractorDetailPage() {
  const params = useParams()
  const router = useRouter()
  const contractorId = params.id as string

  const { data: contractor, isLoading, error } = useContractor(contractorId)
  const { data: assignments, isLoading: assignmentsLoading } = useContractorAssignments(contractorId)
  const deleteContractor = useDeleteContractor()

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this contractor? This action cannot be undone.')) {
      await deleteContractor.mutateAsync(contractorId)
      router.push('/contractors')
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cta mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading contractor...</p>
        </div>
      </div>
    )
  }

  if (error || !contractor) {
    return (
      <div className="flex-1 space-y-6 p-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push('/contractors')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Contractors
          </Button>
        </div>
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-center text-destructive">
              Failed to load contractor. Please try again.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-6 p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push('/contractors')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-heading font-bold tracking-tight">
                {contractor.first_name} {contractor.last_name}
              </h1>
              <Badge variant={contractor.is_active ? 'default' : 'secondary'} className={contractor.is_active ? 'bg-cta hover:bg-cta/90' : ''}>
                {contractor.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            <p className="text-muted-foreground mt-1">
              Contractor Code: <span className="font-mono font-medium text-foreground">{contractor.contractor_code}</span>
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push(`/contractors/${contractorId}/edit`)}
            className="border-border"
          >
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteContractor.isPending}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {deleteContractor.isPending ? 'Deleting...' : 'Delete'}
          </Button>
        </div>
      </div>

      {/* Contractor Details */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Personal Information */}
        <Card className="border-secondary">
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>Basic contractor details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Phone</p>
                <p className="text-sm text-muted-foreground">
                  {contractor.phone || 'Not provided'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Address</p>
                <p className="text-sm text-muted-foreground">
                  {contractor.address || 'Not provided'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">SSN (Last 4)</p>
                <p className="text-sm text-muted-foreground font-mono">
                  {contractor.ssn_last_4 ? `•••• ${contractor.ssn_last_4}` : 'Not provided'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* System Information */}
        <Card className="border-secondary">
          <CardHeader>
            <CardTitle>System Information</CardTitle>
            <CardDescription>Account and record details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Created</p>
                <p className="text-sm text-muted-foreground">
                  {formatDate(contractor.created_at)}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Last Updated</p>
                <p className="text-sm text-muted-foreground">
                  {formatDate(contractor.updated_at)}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Status</p>
                <p className="text-sm text-muted-foreground">
                  {contractor.is_active ? 'Active Contractor' : 'Inactive'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notes */}
      {contractor.notes && (
        <Card className="border-secondary">
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {contractor.notes}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Assignments Section */}
      <Card className="border-secondary">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Assignments</CardTitle>
              <CardDescription>
                Client assignments and rate structures
              </CardDescription>
            </div>
            <Button
              onClick={() => router.push('/assignments')}
              variant="outline"
              className="border-border"
              size="sm"
            >
              <LinkIcon className="mr-2 h-4 w-4" />
              View All Assignments
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {assignmentsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Loading assignments...</div>
            </div>
          ) : !assignments || assignments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">No assignments found</p>
              <p className="text-sm text-muted-foreground mb-4">
                This contractor has not been assigned to any clients yet.
              </p>
              <Button
                onClick={() => router.push('/assignments')}
                className="bg-cta hover:bg-cta/90 text-white"
                size="sm"
              >
                <LinkIcon className="mr-2 h-4 w-4" />
                Create Assignment
              </Button>
            </div>
          ) : (
            <div className="rounded-md border border-border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-secondary/50 hover:bg-secondary/70">
                    <TableHead className="font-heading">Client</TableHead>
                    <TableHead className="font-heading">Rate Type</TableHead>
                    <TableHead className="font-heading">Rate</TableHead>
                    <TableHead className="font-heading">Bonus Split</TableHead>
                    <TableHead className="font-heading">Period</TableHead>
                    <TableHead className="font-heading">Status</TableHead>
                    <TableHead className="text-right font-heading">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignments.map((assignment) => (
                    <TableRow
                      key={assignment.id}
                      className="hover:bg-secondary/30 cursor-pointer"
                      onClick={() => router.push(`/assignments/${assignment.id}`)}
                    >
                      <TableCell>
                        <div>
                          <p className="font-medium">{assignment.client_name}</p>
                          <p className="text-sm text-muted-foreground font-mono">
                            {assignment.client_code}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {assignment.rate_type === 'fixed' ? 'Fixed Hourly' : 'Percentage'}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono">
                        {assignment.rate_type === 'fixed' && assignment.fixed_hourly_rate
                          ? `${formatCurrency(assignment.fixed_hourly_rate)}/hr`
                          : assignment.rate_type === 'percentage' && assignment.percentage_rate
                          ? `${assignment.percentage_rate}%`
                          : '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {assignment.bonus_split_percentage}%
                      </TableCell>
                      <TableCell className="text-sm">
                        <div>
                          <p>{formatDate(assignment.start_date)}</p>
                          {assignment.end_date && (
                            <p className="text-muted-foreground">
                              to {formatDate(assignment.end_date)}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={assignment.is_active ? 'default' : 'secondary'}
                          className={assignment.is_active ? 'bg-cta hover:bg-cta/90' : ''}
                        >
                          {assignment.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/assignments/${assignment.id}`)}
                        >
                          View
                        </Button>
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
