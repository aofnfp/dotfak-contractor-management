'use client'

import { useState, useEffect } from 'react'
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
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { assignmentsApi, type AssignmentWithDetails } from '@/lib/api/assignments'
import { useAssignPaystub } from '@/lib/hooks/usePaystubs'
import { formatCurrency } from '@/lib/utils'

interface AssignPaystubDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  paystubId: string
  clientCompanyId: string
  clientName: string
  onSuccess?: () => void
}

export function AssignPaystubDialog({
  open,
  onOpenChange,
  paystubId,
  clientCompanyId,
  clientName,
  onSuccess,
}: AssignPaystubDialogProps) {
  const assignPaystub = useAssignPaystub()
  const [assignments, setAssignments] = useState<AssignmentWithDetails[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedAssignmentId, setSelectedAssignmentId] = useState('')

  useEffect(() => {
    if (!open || !clientCompanyId) return

    const fetchAssignments = async () => {
      setLoading(true)
      try {
        const data = await assignmentsApi.getByClient(clientCompanyId)
        setAssignments(data)
      } catch {
        setAssignments([])
      } finally {
        setLoading(false)
      }
    }

    fetchAssignments()
    setSelectedAssignmentId('')
  }, [open, clientCompanyId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedAssignmentId) return

    try {
      await assignPaystub.mutateAsync({
        id: paystubId,
        assignmentId: selectedAssignmentId,
      })
      onOpenChange(false)
      onSuccess?.()
    } catch {
      // Error handled by mutation
    }
  }

  const selectedAssignment = assignments.find(a => a.id === selectedAssignmentId)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-secondary border-border">
        <DialogHeader>
          <DialogTitle className="font-heading">Assign to Contractor</DialogTitle>
          <DialogDescription>
            Link this paystub to an existing assignment for <strong>{clientName}</strong>.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>
                Assignment <span className="text-destructive">*</span>
              </Label>
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading assignments...</p>
              ) : assignments.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No assignments found for this client. Create one first from the Assignments page.
                </p>
              ) : (
                <Select
                  value={selectedAssignmentId}
                  onValueChange={setSelectedAssignmentId}
                >
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue placeholder="Select an assignment" />
                  </SelectTrigger>
                  <SelectContent className="bg-secondary border-border">
                    {assignments.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.contractor_name} — {a.rate_type === 'fixed'
                          ? `${formatCurrency(a.fixed_hourly_rate || 0)}/hr`
                          : `${a.percentage_rate}%`}
                        {!a.is_active ? ' (Ended)' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {selectedAssignment && (
              <div className="rounded-md border border-border p-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Contractor</span>
                  <span className="font-medium">{selectedAssignment.contractor_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Rate</span>
                  <span className="font-mono">
                    {selectedAssignment.rate_type === 'fixed'
                      ? `${formatCurrency(selectedAssignment.fixed_hourly_rate || 0)}/hr`
                      : `${selectedAssignment.percentage_rate}%`}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Status</span>
                  <Badge
                    variant={selectedAssignment.is_active ? 'default' : 'secondary'}
                    className={selectedAssignment.is_active ? 'bg-cta hover:bg-cta/90' : ''}
                  >
                    {selectedAssignment.is_active ? 'Active' : 'Ended'}
                  </Badge>
                </div>
              </div>
            )}
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
              disabled={!selectedAssignmentId || assignPaystub.isPending || assignments.length === 0}
            >
              {assignPaystub.isPending ? 'Assigning...' : 'Assign'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
