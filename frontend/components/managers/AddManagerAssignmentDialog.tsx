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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useAssignments } from '@/lib/hooks/useAssignments'
import { useCreateManagerAssignment } from '@/lib/hooks/useManagerAssignments'

interface AddManagerAssignmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  managerId: string
  existingAssignmentIds: string[]
}

export function AddManagerAssignmentDialog({
  open,
  onOpenChange,
  managerId,
  existingAssignmentIds,
}: AddManagerAssignmentDialogProps) {
  const { data: allAssignments, isLoading: assignmentsLoading } = useAssignments()
  const createAssignment = useCreateManagerAssignment()

  const [formData, setFormData] = useState({
    contractor_assignment_id: '',
    flat_hourly_rate: '',
    start_date: new Date().toISOString().split('T')[0],
    notes: '',
    backfill: 'false',
  })

  // Filter out assignments already linked to this manager
  const availableAssignments = allAssignments?.filter(
    (a) => a.is_active && !existingAssignmentIds.includes(a.id)
  ) || []

  const selectedAssignment = availableAssignments.find(
    (a) => a.id === formData.contractor_assignment_id
  )

  const handleBackfillChange = (value: string) => {
    const today = new Date().toISOString().split('T')[0]
    if (value === 'true' && selectedAssignment?.start_date) {
      setFormData({ ...formData, backfill: value, start_date: selectedAssignment.start_date })
    } else {
      setFormData({ ...formData, backfill: value, start_date: today })
    }
  }

  const handleAssignmentChange = (value: string) => {
    const assignment = availableAssignments.find((a) => a.id === value)
    if (formData.backfill === 'true' && assignment?.start_date) {
      setFormData({ ...formData, contractor_assignment_id: value, start_date: assignment.start_date })
    } else {
      setFormData({ ...formData, contractor_assignment_id: value })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.contractor_assignment_id || !formData.flat_hourly_rate) return

    try {
      await createAssignment.mutateAsync({
        manager_id: managerId,
        contractor_assignment_id: formData.contractor_assignment_id,
        flat_hourly_rate: parseFloat(formData.flat_hourly_rate),
        start_date: formData.start_date,
        notes: formData.notes || undefined,
        backfill: formData.backfill === 'true',
      })

      setFormData({
        contractor_assignment_id: '',
        flat_hourly_rate: '',
        start_date: new Date().toISOString().split('T')[0],
        notes: '',
        backfill: 'false',
      })
      onOpenChange(false)
    } catch (error) {
      // Error handled by mutation
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-secondary border-border">
        <DialogHeader>
          <DialogTitle className="font-heading">Assign Staff</DialogTitle>
          <DialogDescription>
            Link a contractor assignment to this manager with a flat hourly rate.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="contractor_assignment">
                Contractor Assignment <span className="text-destructive">*</span>
              </Label>
              {assignmentsLoading ? (
                <div className="h-10 bg-muted rounded animate-pulse" />
              ) : availableAssignments.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No available contractor assignments to assign.
                </p>
              ) : (
                <Select
                  value={formData.contractor_assignment_id}
                  onValueChange={handleAssignmentChange}
                >
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue placeholder="Select a contractor assignment" />
                  </SelectTrigger>
                  <SelectContent className="bg-secondary border-border">
                    {availableAssignments.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.contractor_name} @ {a.client_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="flat_hourly_rate">
                  Flat Hourly Rate ($) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="flat_hourly_rate"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="2.00"
                  value={formData.flat_hourly_rate}
                  onChange={(e) =>
                    setFormData({ ...formData, flat_hourly_rate: e.target.value })
                  }
                  required
                  className="bg-background border-border"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="start_date">
                  Start Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) =>
                    setFormData({ ...formData, start_date: e.target.value })
                  }
                  required
                  className="bg-background border-border"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Earnings Calculation</Label>
              <RadioGroup
                value={formData.backfill}
                onValueChange={handleBackfillChange}
                className="flex flex-col gap-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="false" id="backfill-no" />
                  <Label htmlFor="backfill-no" className="font-normal cursor-pointer">
                    From today (future paystubs only)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="true" id="backfill-yes" />
                  <Label htmlFor="backfill-yes" className="font-normal cursor-pointer">
                    From start date (backfill all historical paystubs)
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Optional notes about this assignment..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
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
              disabled={
                createAssignment.isPending ||
                !formData.contractor_assignment_id ||
                !formData.flat_hourly_rate
              }
            >
              {createAssignment.isPending ? 'Assigning...' : 'Assign Staff'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
