'use client'

import { useParams, useRouter } from 'next/navigation'
import { useState } from 'react'
import { ArrowLeft, Trash2, Phone, MapPin, Mail, Calendar, Users, DollarSign, Monitor, Plus, Loader2, FilePlus } from 'lucide-react'
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
import { useManager, useDeleteManager, useInviteManager } from '@/lib/hooks/useManagers'
import { useManagerAssignments } from '@/lib/hooks/useManagerAssignments'
import { useManagerEarnings } from '@/lib/hooks/useManagerEarnings'
import { useDevices } from '@/lib/hooks/useDevices'
import { formatDate, formatCurrency } from '@/lib/utils'
import { getCountryName } from '@/lib/constants/countries'
import { AddManagerAssignmentDialog } from '@/components/managers/AddManagerAssignmentDialog'
import { contractsApi } from '@/lib/api/contracts'

const onboardingLabels: Record<string, string> = {
  not_invited: 'Not Invited',
  invited: 'Invited',
  in_progress: 'In Progress',
  completed: 'Onboarded',
}

const onboardingColors: Record<string, string> = {
  not_invited: '',
  invited: 'bg-amber-500/20 text-amber-500 border-amber-500/30',
  in_progress: 'bg-blue-500/20 text-blue-500 border-blue-500/30',
  completed: 'bg-cta hover:bg-cta/90',
}

export default function ManagerDetailPage() {
  const params = useParams()
  const router = useRouter()
  const managerId = params.id as string

  const { data: manager, isLoading, error } = useManager(managerId)
  const { data: assignments, isLoading: assignmentsLoading } = useManagerAssignments(managerId)
  const { data: earnings, isLoading: earningsLoading } = useManagerEarnings({ manager_id: managerId })
  const { data: devices, isLoading: devicesLoading } = useDevices()
  const deleteManager = useDeleteManager()
  const inviteManager = useInviteManager()
  const [showAssignDialog, setShowAssignDialog] = useState(false)
  const [generatingContractFor, setGeneratingContractFor] = useState<string | null>(null)

  const handleGenerateManagerContract = async (managerAssignmentId: string) => {
    setGeneratingContractFor(managerAssignmentId)
    try {
      const contract = await contractsApi.generate({ manager_assignment_id: managerAssignmentId })
      router.push(`/contracts/${contract.id}`)
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Failed to generate contract')
    } finally {
      setGeneratingContractFor(null)
    }
  }

  // Filter devices to those belonging to this manager's assignments
  const managerDevices = devices?.filter(d => {
    const assignmentIds = assignments?.map(a => a.id) || []
    return assignmentIds.includes(d.manager_assignment_id || '')
  }) || []

  const handleDelete = async () => {
    if (confirm('Are you sure you want to deactivate this manager?')) {
      await deleteManager.mutateAsync(managerId)
      router.push('/managers')
    }
  }

  const handleInvite = async () => {
    if (!manager?.email) return
    await inviteManager.mutateAsync({ id: managerId, email: manager.email })
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-cta mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading manager...</p>
        </div>
      </div>
    )
  }

  if (error || !manager) {
    return (
      <div className="flex-1 space-y-6 p-8">
        <Button variant="ghost" onClick={() => router.push('/managers')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Managers
        </Button>
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-center text-destructive">Failed to load manager.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Earnings summary
  const totalEarnings = earnings?.reduce((sum, e) => sum + e.total_earnings, 0) || 0
  const totalPaid = earnings?.reduce((sum, e) => sum + e.amount_paid, 0) || 0
  const totalPending = earnings?.reduce((sum, e) => sum + e.amount_pending, 0) || 0

  return (
    <div className="flex-1 space-y-6 p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push('/managers')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-heading font-bold tracking-tight">
                {manager.first_name} {manager.last_name}
              </h1>
              <Badge
                variant={manager.is_active ? 'default' : 'secondary'}
                className={manager.is_active ? 'bg-cta hover:bg-cta/90' : ''}
              >
                {manager.is_active ? 'Active' : 'Inactive'}
              </Badge>
              <Badge
                variant={manager.onboarding_status === 'completed' ? 'default' : 'outline'}
                className={onboardingColors[manager.onboarding_status] || ''}
              >
                {onboardingLabels[manager.onboarding_status] || manager.onboarding_status}
              </Badge>
            </div>
            <p className="text-muted-foreground mt-1">{manager.email}</p>
          </div>
        </div>

        <div className="flex gap-2">
          {manager.onboarding_status === 'not_invited' && (
            <Button
              onClick={handleInvite}
              className="bg-cta hover:bg-cta/90 text-white"
              disabled={inviteManager.isPending}
            >
              <Mail className="mr-2 h-4 w-4" />
              {inviteManager.isPending ? 'Sending...' : 'Send Invitation'}
            </Button>
          )}
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteManager.isPending}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {deleteManager.isPending ? 'Deactivating...' : 'Deactivate'}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-secondary">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Staff Managed</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{assignments?.filter(a => a.is_active).length ?? 0}</div>
          </CardContent>
        </Card>

        <Card className="border-secondary">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalEarnings)}</div>
          </CardContent>
        </Card>

        <Card className="border-secondary">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-cta">{formatCurrency(totalPaid)}</div>
          </CardContent>
        </Card>

        <Card className="border-secondary">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalPending > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
              {formatCurrency(totalPending)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contact Info + Notes */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-secondary">
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Email</p>
                <p className="text-sm text-muted-foreground">{manager.email}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Phone</p>
                <p className="text-sm text-muted-foreground">{manager.phone || 'Not provided'}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Address</p>
                <p className="text-sm text-muted-foreground">
                  {[manager.address, manager.city, manager.state, manager.zip_code].filter(Boolean).join(', ') || 'Not provided'}
                  {manager.country && ` — ${getCountryName(manager.country)}`}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Created</p>
                <p className="text-sm text-muted-foreground">{formatDate(manager.created_at)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {manager.notes && (
          <Card className="border-secondary">
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {manager.notes}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Staff Assignments */}
      <Card className="border-secondary">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Staff Assignments</CardTitle>
            <CardDescription>Contractors managed by this manager</CardDescription>
          </div>
          <Button
            size="sm"
            onClick={() => setShowAssignDialog(true)}
            className="bg-cta hover:bg-cta/90 text-white"
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Assign Staff
          </Button>
        </CardHeader>
        <CardContent>
          {assignmentsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Loading assignments...</div>
            </div>
          ) : !assignments || assignments.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No staff assigned yet</p>
            </div>
          ) : (
            <div className="rounded-md border border-border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-secondary/50 hover:bg-secondary/70">
                    <TableHead className="font-heading">Contractor</TableHead>
                    <TableHead className="font-heading">Client</TableHead>
                    <TableHead className="font-heading">Flat Rate</TableHead>
                    <TableHead className="font-heading">Start Date</TableHead>
                    <TableHead className="font-heading">Status</TableHead>
                    <TableHead className="font-heading">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignments.map((assignment) => (
                    <TableRow key={assignment.id} className="hover:bg-secondary/30">
                      <TableCell className="font-medium">
                        {assignment.contractor_name || '\u2014'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {assignment.client_name || '\u2014'}
                      </TableCell>
                      <TableCell className="font-mono">
                        {formatCurrency(assignment.flat_hourly_rate)}/hr
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDate(assignment.start_date)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={assignment.is_active ? 'default' : 'secondary'}
                          className={assignment.is_active ? 'bg-cta hover:bg-cta/90' : ''}
                        >
                          {assignment.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleGenerateManagerContract(assignment.id)}
                          disabled={generatingContractFor === assignment.id}
                        >
                          <FilePlus className="mr-1.5 h-3.5 w-3.5" />
                          {generatingContractFor === assignment.id ? 'Generating...' : 'Contract'}
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

      {/* Earnings History */}
      <Card className="border-secondary">
        <CardHeader>
          <CardTitle>Earnings History</CardTitle>
          <CardDescription>Earnings from managed staff paystubs</CardDescription>
        </CardHeader>
        <CardContent>
          {earningsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Loading earnings...</div>
            </div>
          ) : !earnings || earnings.length === 0 ? (
            <div className="text-center py-8">
              <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No earnings yet</p>
            </div>
          ) : (
            <div className="rounded-md border border-border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-secondary/50 hover:bg-secondary/70">
                    <TableHead className="font-heading">Period</TableHead>
                    <TableHead className="font-heading">Contractor</TableHead>
                    <TableHead className="font-heading">Hours</TableHead>
                    <TableHead className="font-heading">Rate</TableHead>
                    <TableHead className="font-heading">Total</TableHead>
                    <TableHead className="font-heading">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {earnings.map((earning) => (
                    <TableRow key={earning.id} className="hover:bg-secondary/30">
                      <TableCell className="text-sm">
                        {earning.pay_period_begin && earning.pay_period_end
                          ? `${formatDate(earning.pay_period_begin)} - ${formatDate(earning.pay_period_end)}`
                          : '\u2014'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {earning.contractor_name || '\u2014'}
                      </TableCell>
                      <TableCell className="font-mono">
                        {earning.staff_total_hours}
                      </TableCell>
                      <TableCell className="font-mono">
                        {formatCurrency(earning.flat_hourly_rate)}/hr
                      </TableCell>
                      <TableCell className="font-mono font-medium">
                        {formatCurrency(earning.total_earnings)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={earning.payment_status === 'paid' ? 'default' : 'outline'}
                          className={
                            earning.payment_status === 'paid'
                              ? 'bg-cta hover:bg-cta/90'
                              : earning.payment_status === 'unpaid'
                              ? 'bg-destructive/20 text-destructive border-destructive/30'
                              : ''
                          }
                        >
                          {earning.payment_status.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Devices */}
      <Card className="border-secondary">
        <CardHeader>
          <CardTitle>Devices</CardTitle>
          <CardDescription>Equipment assigned to managed contractors</CardDescription>
        </CardHeader>
        <CardContent>
          {devicesLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Loading devices...</div>
            </div>
          ) : managerDevices.length === 0 ? (
            <div className="text-center py-8">
              <Monitor className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No devices registered</p>
            </div>
          ) : (
            <div className="rounded-md border border-border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-secondary/50 hover:bg-secondary/70">
                    <TableHead className="font-heading">Type</TableHead>
                    <TableHead className="font-heading">Brand / Model</TableHead>
                    <TableHead className="font-heading">Serial</TableHead>
                    <TableHead className="font-heading">Contractor</TableHead>
                    <TableHead className="font-heading">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {managerDevices.map((device) => (
                    <TableRow key={device.id} className="hover:bg-secondary/30">
                      <TableCell className="font-medium capitalize">
                        {device.device_type}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {[device.brand, device.model].filter(Boolean).join(' ') || '\u2014'}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {device.serial_number || '\u2014'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {device.contractor_name || '\u2014'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {device.status.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {showAssignDialog && (
        <AddManagerAssignmentDialog
          open={showAssignDialog}
          onOpenChange={setShowAssignDialog}
          managerId={managerId}
          existingAssignmentIds={assignments?.map(a => a.contractor_assignment_id) || []}
        />
      )}
    </div>
  )
}
