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
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { useCreateContractor } from '@/lib/hooks/useContractors'

interface AddContractorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddContractorDialog({ open, onOpenChange }: AddContractorDialogProps) {
  const createContractor = useCreateContractor()

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    address: '',
    ssn_last_4: '',
    notes: '',
    is_active: true,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      await createContractor.mutateAsync({
        ...formData,
        // Remove empty optional fields
        phone: formData.phone || undefined,
        address: formData.address || undefined,
        ssn_last_4: formData.ssn_last_4 || undefined,
        notes: formData.notes || undefined,
      })

      // Reset form and close dialog
      setFormData({
        first_name: '',
        last_name: '',
        phone: '',
        address: '',
        ssn_last_4: '',
        notes: '',
        is_active: true,
      })
      onOpenChange(false)
    } catch (error) {
      // Error is handled by the mutation
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-secondary border-border">
        <DialogHeader>
          <DialogTitle className="font-heading">Add New Contractor</DialogTitle>
          <DialogDescription>
            Create a new contractor profile. Contractor code will be auto-generated (DTK-001, DTK-002, etc.). Fields marked with * are required.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Contractor code will be auto-generated as DTK-001, DTK-002, etc. */}

            {/* Name Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="first_name">
                  First Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="first_name"
                  placeholder="John"
                  value={formData.first_name}
                  onChange={(e) =>
                    setFormData({ ...formData, first_name: e.target.value })
                  }
                  required
                  className="bg-background border-border"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="last_name">
                  Last Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="last_name"
                  placeholder="Doe"
                  value={formData.last_name}
                  onChange={(e) =>
                    setFormData({ ...formData, last_name: e.target.value })
                  }
                  required
                  className="bg-background border-border"
                />
              </div>
            </div>

            {/* Contact Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="(555) 123-4567"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="bg-background border-border"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="ssn_last_4">SSN (Last 4 digits)</Label>
                <Input
                  id="ssn_last_4"
                  type="text"
                  placeholder="1234"
                  maxLength={4}
                  pattern="[0-9]{4}"
                  value={formData.ssn_last_4}
                  onChange={(e) =>
                    setFormData({ ...formData, ssn_last_4: e.target.value })
                  }
                  className="bg-background border-border"
                />
              </div>
            </div>

            {/* Address */}
            <div className="grid gap-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                placeholder="123 Main St, City, State ZIP"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="bg-background border-border"
              />
            </div>

            {/* Notes */}
            <div className="grid gap-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Additional notes about this contractor..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="bg-background border-border"
              />
            </div>

            {/* Active Status */}
            <div className="flex items-center justify-between rounded-lg border border-border p-4 bg-background">
              <div className="space-y-0.5">
                <Label htmlFor="is_active" className="cursor-pointer">
                  Active Status
                </Label>
                <p className="text-sm text-muted-foreground">
                  Set contractor as active or inactive
                </p>
              </div>
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_active: checked })
                }
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
              disabled={createContractor.isPending}
            >
              {createContractor.isPending ? 'Creating...' : 'Create Contractor'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
