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
import { useEndAssignment } from '@/lib/hooks/useAssignments'
import type { EndReason } from '@/lib/api/assignments'

interface EndAssignmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  assignmentId: string
  assignmentLabel: string
  onSuccess?: () => void
}

const END_REASONS: { value: EndReason; label: string }[] = [
  { value: 'transferred', label: 'Transferred' },
  { value: 'end_of_contract', label: 'End of Contract' },
  { value: 'laid_off', label: 'Laid Off' },
  { value: 'termination', label: 'Termination' },
]

export function EndAssignmentDialog({
  open,
  onOpenChange,
  assignmentId,
  assignmentLabel,
  onSuccess,
}: EndAssignmentDialogProps) {
  const endAssignment = useEndAssignment()
  const [formData, setFormData] = useState({
    end_reason: '' as EndReason | '',
    end_notes: '',
    end_date: new Date().toISOString().split('T')[0],
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.end_reason) return

    try {
      await endAssignment.mutateAsync({
        id: assignmentId,
        data: {
          end_reason: formData.end_reason as EndReason,
          end_notes: formData.end_notes || undefined,
          end_date: formData.end_date,
        },
      })

      setFormData({
        end_reason: '',
        end_notes: '',
        end_date: new Date().toISOString().split('T')[0],
      })
      onOpenChange(false)
      onSuccess?.()
    } catch {
      // Error handled by mutation
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-secondary border-border">
        <DialogHeader>
          <DialogTitle className="font-heading">End Assignment</DialogTitle>
          <DialogDescription>
            End the assignment for <strong>{assignmentLabel}</strong>. This will
            also end any linked manager assignments.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* End Reason */}
            <div className="grid gap-2">
              <Label>
                Reason <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.end_reason}
                onValueChange={(value) =>
                  setFormData({ ...formData, end_reason: value as EndReason })
                }
              >
                <SelectTrigger className="bg-background border-border">
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent className="bg-secondary border-border">
                  {END_REASONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* End Date */}
            <div className="grid gap-2">
              <Label htmlFor="end_date">End Date</Label>
              <Input
                id="end_date"
                type="date"
                value={formData.end_date}
                onChange={(e) =>
                  setFormData({ ...formData, end_date: e.target.value })
                }
                className="bg-background border-border"
              />
              <p className="text-xs text-muted-foreground">
                Defaults to today
              </p>
            </div>

            {/* Notes */}
            <div className="grid gap-2">
              <Label htmlFor="end_notes">Notes</Label>
              <Textarea
                id="end_notes"
                placeholder="Additional context about why this assignment is ending..."
                value={formData.end_notes}
                onChange={(e) =>
                  setFormData({ ...formData, end_notes: e.target.value })
                }
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
              variant="destructive"
              disabled={!formData.end_reason || endAssignment.isPending}
            >
              {endAssignment.isPending ? 'Ending...' : 'End Assignment'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
