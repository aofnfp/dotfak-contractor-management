'use client'

import { use } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Trash2, ArrowLeft, User, Building2, DollarSign, Calendar, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAssignment, useDeleteAssignment } from '@/lib/hooks/useAssignments'
import { formatCurrency, formatDate } from '@/lib/utils'

interface AssignmentDetailPageProps {
  params: Promise<{
    id: string
  }>
}

export default function AssignmentDetailPage({ params }: AssignmentDetailPageProps) {
  const { id } = use(params)
  const router = useRouter()
  const { data: assignment, isLoading, error } = useAssignment(id)
  const deleteAssignment = useDeleteAssignment()

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this assignment? This action cannot be undone.')) {
      await deleteAssignment.mutateAsync(id)
      router.push('/assignments')
    }
  }

  const handleEdit = () => {
    router.push(`/assignments/${id}/edit`)
  }

  if (isLoading) {
    return (
      <div className="flex-1 space-y-6 p-8">
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">Loading assignment...</div>
        </div>
      </div>
    )
  }

  if (error || !assignment) {
    return (
      <div className="flex-1 space-y-6 p-8">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-destructive mb-4">Failed to load assignment</p>
          <Button onClick={() => router.push('/assignments')} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Assignments
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-6 p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/assignments')}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </div>
          <h1 className="text-3xl font-heading font-bold tracking-tight">Assignment Details</h1>
          <p className="text-muted-foreground">
            {assignment.contractor_name} → {assignment.client_name}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleEdit}
            variant="outline"
            className="border-border"
          >
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <Button
            onClick={handleDelete}
            variant="destructive"
            disabled={deleteAssignment.isPending}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {deleteAssignment.isPending ? 'Deleting...' : 'Delete'}
          </Button>
        </div>
      </div>

      {/* Status Badge */}
      <div>
        <Badge
          variant={assignment.is_active ? 'default' : 'secondary'}
          className={assignment.is_active ? 'bg-cta hover:bg-cta/90' : ''}
        >
          {assignment.is_active ? 'Active' : 'Inactive'}
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Contractor Information */}
        <Card className="border-secondary">
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-cta" />
              <CardTitle>Contractor</CardTitle>
            </div>
            <CardDescription>Assigned contractor details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Name</p>
              <p className="font-medium">{assignment.contractor_name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Code</p>
              <p className="font-mono text-sm">{assignment.contractor_code}</p>
            </div>
            <div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/contractors/${assignment.contractor_id}`)}
                className="border-border"
              >
                View Contractor Profile
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Client Information */}
        <Card className="border-secondary">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-cta" />
              <CardTitle>Client Company</CardTitle>
            </div>
            <CardDescription>Client organization details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Company Name</p>
              <p className="font-medium">{assignment.client_name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Client Code</p>
              <p className="font-mono text-sm">{assignment.client_code}</p>
            </div>
            {assignment.client_employee_id && (
              <div>
                <p className="text-sm text-muted-foreground">Employee ID (on paystub)</p>
                <p className="font-mono text-sm">{assignment.client_employee_id}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Rate Structure */}
        <Card className="border-secondary">
          <CardHeader>
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-cta" />
              <CardTitle>Rate Structure</CardTitle>
            </div>
            <CardDescription>Contractor compensation configuration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Rate Type</p>
              <Badge variant="outline" className="mt-1">
                {assignment.rate_type === 'fixed' ? 'Fixed Hourly Rate' : 'Percentage of Client Payment'}
              </Badge>
            </div>
            {assignment.rate_type === 'fixed' && assignment.fixed_hourly_rate && (
              <div>
                <p className="text-sm text-muted-foreground">Hourly Rate</p>
                <p className="text-2xl font-bold text-cta font-mono">
                  {formatCurrency(assignment.fixed_hourly_rate)}/hr
                </p>
              </div>
            )}
            {assignment.rate_type === 'percentage' && assignment.percentage_rate && (
              <div>
                <p className="text-sm text-muted-foreground">Percentage Rate</p>
                <p className="text-2xl font-bold text-cta font-mono">
                  {assignment.percentage_rate}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  of client's gross payment
                </p>
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground">Bonus Split</p>
              <p className="font-mono">
                {assignment.bonus_split_percentage}% to contractor
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Timeline */}
        <Card className="border-secondary">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-cta" />
              <CardTitle>Timeline</CardTitle>
            </div>
            <CardDescription>Assignment dates and duration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Start Date</p>
              <p className="font-medium">{formatDate(assignment.start_date)}</p>
            </div>
            {assignment.end_date && (
              <div>
                <p className="text-sm text-muted-foreground">End Date</p>
                <p className="font-medium">{formatDate(assignment.end_date)}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground">Created</p>
              <p className="text-sm">{formatDate(assignment.created_at)}</p>
            </div>
            {assignment.updated_at && assignment.updated_at !== assignment.created_at && (
              <div>
                <p className="text-sm text-muted-foreground">Last Updated</p>
                <p className="text-sm">{formatDate(assignment.updated_at)}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Notes */}
      {assignment.notes && (
        <Card className="border-secondary">
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-cta" />
              <CardTitle>Notes</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{assignment.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
