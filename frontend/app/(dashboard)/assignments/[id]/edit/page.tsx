'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useAssignment, useUpdateAssignment } from '@/lib/hooks/useAssignments'
import { useContractors } from '@/lib/hooks/useContractors'
import { useClients } from '@/lib/hooks/useClients'

interface EditAssignmentPageProps {
  params: {
    id: string
  }
}

export default function EditAssignmentPage({ params }: EditAssignmentPageProps) {
  const router = useRouter()
  const { data: assignment, isLoading: assignmentLoading } = useAssignment(params.id)
  const updateAssignment = useUpdateAssignment()
  const { data: contractors } = useContractors()
  const { data: clients } = useClients()

  const [formData, setFormData] = useState({
    contractor_id: '',
    client_company_id: '',
    client_employee_id: '',
    rate_type: 'fixed' as 'fixed' | 'percentage',
    fixed_hourly_rate: '',
    percentage_rate: '',
    bonus_split_percentage: '50',
    start_date: '',
    end_date: '',
    notes: '',
    is_active: true,
  })

  // Pre-fill form when assignment data loads
  useEffect(() => {
    if (assignment) {
      setFormData({
        contractor_id: assignment.contractor_id,
        client_company_id: assignment.client_company_id,
        client_employee_id: assignment.client_employee_id || '',
        rate_type: assignment.rate_type,
        fixed_hourly_rate: assignment.fixed_hourly_rate?.toString() || '',
        percentage_rate: assignment.percentage_rate?.toString() || '',
        bonus_split_percentage: assignment.bonus_split_percentage.toString(),
        start_date: assignment.start_date,
        end_date: assignment.end_date || '',
        notes: assignment.notes || '',
        is_active: assignment.is_active,
      })
    }
  }, [assignment])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      await updateAssignment.mutateAsync({
        id: params.id,
        data: {
          client_employee_id: formData.client_employee_id || undefined,
          rate_type: formData.rate_type,
          fixed_hourly_rate: formData.rate_type === 'fixed' ? parseFloat(formData.fixed_hourly_rate) : undefined,
          percentage_rate: formData.rate_type === 'percentage' ? parseFloat(formData.percentage_rate) : undefined,
          bonus_split_percentage: parseFloat(formData.bonus_split_percentage),
          start_date: formData.start_date,
          end_date: formData.end_date || undefined,
          notes: formData.notes || undefined,
          is_active: formData.is_active,
        },
      })

      router.push(`/assignments/${params.id}`)
    } catch (error) {
      // Error is handled by the mutation
    }
  }

  // Filter active contractors and clients
  const activeContractors = contractors?.filter(c => c.is_active) || []
  const activeClients = clients?.filter(c => c.is_active) || []

  if (assignmentLoading) {
    return (
      <div className="flex-1 space-y-6 p-8">
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">Loading assignment...</div>
        </div>
      </div>
    )
  }

  if (!assignment) {
    return (
      <div className="flex-1 space-y-6 p-8">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-destructive mb-4">Assignment not found</p>
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
              onClick={() => router.push(`/assignments/${params.id}`)}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </div>
          <h1 className="text-3xl font-heading font-bold tracking-tight">Edit Assignment</h1>
          <p className="text-muted-foreground">
            Update assignment details and rate structure
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="border-secondary">
          <CardHeader>
            <CardTitle>Assignment Information</CardTitle>
            <CardDescription>
              Modify the contractor-client assignment and rate configuration
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Contractor Selection (Read-Only) */}
            <div className="grid gap-2">
              <Label htmlFor="contractor">
                Contractor <span className="text-muted-foreground text-xs">(Cannot be changed)</span>
              </Label>
              <Select
                value={formData.contractor_id}
                disabled
              >
                <SelectTrigger className="bg-muted border-border cursor-not-allowed">
                  <SelectValue placeholder="Select a contractor" />
                </SelectTrigger>
                <SelectContent className="bg-secondary border-border">
                  {activeContractors.map((contractor) => (
                    <SelectItem key={contractor.id} value={contractor.id}>
                      {contractor.first_name} {contractor.last_name} ({contractor.contractor_code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Contractor cannot be changed after assignment is created
              </p>
            </div>

            {/* Client Selection (Read-Only) */}
            <div className="grid gap-2">
              <Label htmlFor="client">
                Client Company <span className="text-muted-foreground text-xs">(Cannot be changed)</span>
              </Label>
              <Select
                value={formData.client_company_id}
                disabled
              >
                <SelectTrigger className="bg-muted border-border cursor-not-allowed">
                  <SelectValue placeholder="Select a client company" />
                </SelectTrigger>
                <SelectContent className="bg-secondary border-border">
                  {activeClients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name} ({client.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Client company cannot be changed after assignment is created
              </p>
            </div>

            {/* Client Employee ID */}
            <div className="grid gap-2">
              <Label htmlFor="client_employee_id">Client Employee ID</Label>
              <Input
                id="client_employee_id"
                placeholder="Employee ID on client's paystub (for auto-matching)"
                value={formData.client_employee_id}
                onChange={(e) => setFormData({ ...formData, client_employee_id: e.target.value })}
                className="bg-background border-border"
              />
              <p className="text-xs text-muted-foreground">
                Optional: Used for automatic paystub matching
              </p>
            </div>

            {/* Rate Type */}
            <div className="grid gap-2">
              <Label>
                Rate Type <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.rate_type}
                onValueChange={(value: 'fixed' | 'percentage') =>
                  setFormData({ ...formData, rate_type: value })
                }
              >
                <SelectTrigger className="bg-background border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-secondary border-border">
                  <SelectItem value="fixed">Fixed Hourly Rate</SelectItem>
                  <SelectItem value="percentage">Percentage of Client Payment</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Rate Fields (conditional) */}
            {formData.rate_type === 'fixed' ? (
              <div className="grid gap-2">
                <Label htmlFor="fixed_rate">
                  Fixed Hourly Rate <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    id="fixed_rate"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="4.00"
                    value={formData.fixed_hourly_rate}
                    onChange={(e) => setFormData({ ...formData, fixed_hourly_rate: e.target.value })}
                    className="bg-background border-border pl-7"
                    required
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Contractor earns this fixed amount per hour
                </p>
              </div>
            ) : (
              <div className="grid gap-2">
                <Label htmlFor="percentage_rate">
                  Percentage Rate <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="percentage_rate"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    placeholder="25"
                    value={formData.percentage_rate}
                    onChange={(e) => setFormData({ ...formData, percentage_rate: e.target.value })}
                    className="bg-background border-border pr-7"
                    required
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Contractor earns this percentage of the client's gross payment
                </p>
              </div>
            )}

            {/* Bonus Split */}
            <div className="grid gap-2">
              <Label htmlFor="bonus_split">
                Bonus Split Percentage <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="bonus_split"
                  type="number"
                  step="1"
                  min="0"
                  max="100"
                  value={formData.bonus_split_percentage}
                  onChange={(e) => setFormData({ ...formData, bonus_split_percentage: e.target.value })}
                  className="bg-background border-border pr-7"
                  required
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Contractor's share of any bonuses (default: 50%)
              </p>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="start_date">
                  Start Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="bg-background border-border"
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="end_date">End Date</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  className="bg-background border-border"
                />
              </div>
            </div>

            {/* Status */}
            <div className="grid gap-2">
              <Label>
                Status <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.is_active.toString()}
                onValueChange={(value) =>
                  setFormData({ ...formData, is_active: value === 'true' })
                }
              >
                <SelectTrigger className="bg-background border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-secondary border-border">
                  <SelectItem value="true">Active</SelectItem>
                  <SelectItem value="false">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div className="grid gap-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Additional notes about this assignment..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="bg-background border-border"
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2 mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(`/assignments/${params.id}`)}
            className="border-border"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="bg-cta hover:bg-cta/90 text-white"
            disabled={updateAssignment.isPending}
          >
            {updateAssignment.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  )
}
