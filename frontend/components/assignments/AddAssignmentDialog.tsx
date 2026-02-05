'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { useCreateAssignment } from '@/lib/hooks/useAssignments'
import { useContractors } from '@/lib/hooks/useContractors'
import { useClients } from '@/lib/hooks/useClients'

interface AddAssignmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddAssignmentDialog({ open, onOpenChange }: AddAssignmentDialogProps) {
  const createAssignment = useCreateAssignment()
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
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      await createAssignment.mutateAsync({
        contractor_id: formData.contractor_id,
        client_company_id: formData.client_company_id,
        client_employee_id: formData.client_employee_id || undefined,
        rate_type: formData.rate_type,
        fixed_hourly_rate: formData.rate_type === 'fixed' ? parseFloat(formData.fixed_hourly_rate) : undefined,
        percentage_rate: formData.rate_type === 'percentage' ? parseFloat(formData.percentage_rate) : undefined,
        bonus_split_percentage: parseFloat(formData.bonus_split_percentage),
        start_date: formData.start_date,
        end_date: formData.end_date || undefined,
        notes: formData.notes || undefined,
      })

      // Reset form and close dialog
      setFormData({
        contractor_id: '',
        client_company_id: '',
        client_employee_id: '',
        rate_type: 'fixed',
        fixed_hourly_rate: '',
        percentage_rate: '',
        bonus_split_percentage: '50',
        start_date: '',
        end_date: '',
        notes: '',
      })
      onOpenChange(false)
    } catch (error) {
      // Error is handled by the mutation
    }
  }

  // Filter active contractors and clients
  const activeContractors = contractors?.filter(c => c.is_active) || []
  const activeClients = clients?.filter(c => c.is_active) || []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl bg-secondary border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">Create New Assignment</DialogTitle>
          <DialogDescription>
            Link a contractor to a client company and set up the rate structure.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Contractor Selection */}
            <div className="grid gap-2">
              <Label htmlFor="contractor">
                Contractor <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.contractor_id}
                onValueChange={(value) => setFormData({ ...formData, contractor_id: value })}
                required
              >
                <SelectTrigger className="bg-background border-border">
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
            </div>

            {/* Client Selection */}
            <div className="grid gap-2">
              <Label htmlFor="client">
                Client Company <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.client_company_id}
                onValueChange={(value) => setFormData({ ...formData, client_company_id: value })}
                required
              >
                <SelectTrigger className="bg-background border-border">
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
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-border"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-cta hover:bg-cta/90 text-white"
              disabled={createAssignment.isPending}
            >
              {createAssignment.isPending ? 'Creating...' : 'Create Assignment'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
