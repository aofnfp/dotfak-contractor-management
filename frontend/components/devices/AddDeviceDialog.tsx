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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCreateDevice } from '@/lib/hooks/useDevices'
import { useManagerAssignments } from '@/lib/hooks/useManagerAssignments'
import type { DeviceType } from '@/lib/types/device'

interface AddDeviceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddDeviceDialog({ open, onOpenChange }: AddDeviceDialogProps) {
  const createDevice = useCreateDevice()
  const { data: assignments } = useManagerAssignments()

  const [formData, setFormData] = useState({
    contractor_assignment_id: '',
    manager_assignment_id: '',
    device_type: 'laptop' as DeviceType,
    brand: '',
    model: '',
    serial_number: '',
    notes: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      await createDevice.mutateAsync({
        contractor_assignment_id: formData.contractor_assignment_id,
        manager_assignment_id: formData.manager_assignment_id || undefined,
        device_type: formData.device_type,
        brand: formData.brand || undefined,
        model: formData.model || undefined,
        serial_number: formData.serial_number || undefined,
        notes: formData.notes || undefined,
      })

      setFormData({
        contractor_assignment_id: '',
        manager_assignment_id: '',
        device_type: 'laptop',
        brand: '',
        model: '',
        serial_number: '',
        notes: '',
      })
      onOpenChange(false)
    } catch (error) {
      // Error handled by mutation
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-secondary border-border">
        <DialogHeader>
          <DialogTitle className="font-heading">Add New Device</DialogTitle>
          <DialogDescription>
            Register a device for a contractor assignment. Fields marked with * are required.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>
                Manager Assignment <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.manager_assignment_id}
                onValueChange={(value) => {
                  const assignment = assignments?.find(a => a.id === value)
                  setFormData({
                    ...formData,
                    manager_assignment_id: value,
                    contractor_assignment_id: assignment?.contractor_assignment_id || '',
                  })
                }}
              >
                <SelectTrigger className="bg-background border-border">
                  <SelectValue placeholder="Select assignment" />
                </SelectTrigger>
                <SelectContent>
                  {assignments?.filter(a => a.is_active).map((assignment) => (
                    <SelectItem key={assignment.id} value={assignment.id}>
                      {assignment.contractor_name} ({assignment.client_name})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>
                  Device Type <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.device_type}
                  onValueChange={(value) =>
                    setFormData({ ...formData, device_type: value as DeviceType })
                  }
                >
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="laptop">Laptop</SelectItem>
                    <SelectItem value="router">Router</SelectItem>
                    <SelectItem value="phone">Phone</SelectItem>
                    <SelectItem value="tablet">Tablet</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="serial_number">Serial Number</Label>
                <Input
                  id="serial_number"
                  placeholder="SN-12345"
                  value={formData.serial_number}
                  onChange={(e) =>
                    setFormData({ ...formData, serial_number: e.target.value })
                  }
                  className="bg-background border-border"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="brand">Brand</Label>
                <Input
                  id="brand"
                  placeholder="Dell, HP, Apple..."
                  value={formData.brand}
                  onChange={(e) =>
                    setFormData({ ...formData, brand: e.target.value })
                  }
                  className="bg-background border-border"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="model">Model</Label>
                <Input
                  id="model"
                  placeholder="Latitude 5520, MacBook Pro..."
                  value={formData.model}
                  onChange={(e) =>
                    setFormData({ ...formData, model: e.target.value })
                  }
                  className="bg-background border-border"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Additional notes about this device..."
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
              disabled={createDevice.isPending || !formData.contractor_assignment_id}
            >
              {createDevice.isPending ? 'Adding...' : 'Add Device'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
