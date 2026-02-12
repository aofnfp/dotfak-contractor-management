'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Save, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useContractor, useUpdateContractor } from '@/lib/hooks/useContractors'

export default function EditContractorPage() {
  const params = useParams()
  const router = useRouter()
  const contractorId = params.id as string

  const { data: contractor, isLoading } = useContractor(contractorId)
  const updateContractor = useUpdateContractor()

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    address: '',
    ssn_last_4: '',
    notes: '',
    is_active: true,
  })

  // Populate form when contractor data loads
  useEffect(() => {
    if (contractor) {
      setFormData({
        first_name: contractor.first_name,
        last_name: contractor.last_name,
        phone: contractor.phone || '',
        address: contractor.address || '',
        ssn_last_4: contractor.ssn_last_4 || '',
        notes: contractor.notes || '',
        is_active: contractor.is_active,
      })
    }
  }, [contractor])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      await updateContractor.mutateAsync({
        id: contractorId,
        data: {
          ...formData,
          // Remove empty optional fields
          phone: formData.phone || undefined,
          address: formData.address || undefined,
          ssn_last_4: formData.ssn_last_4 || undefined,
          notes: formData.notes || undefined,
        },
      })

      // Navigate back to detail page
      router.push(`/contractors/${contractorId}`)
    } catch (error) {
      // Error is handled by the mutation
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-cta mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading contractor...</p>
        </div>
      </div>
    )
  }

  if (!contractor) {
    return (
      <div className="flex-1 space-y-6 p-8">
        <p className="text-center text-destructive">Contractor not found</p>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-6 p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-heading font-bold tracking-tight">
              Edit Contractor
            </h1>
            <p className="text-muted-foreground mt-1">
              Update contractor profile for <span className="font-mono font-medium text-foreground">{contractor.contractor_code}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Edit Form */}
      <Card className="border-secondary max-w-3xl">
        <CardHeader>
          <CardTitle>Contractor Details</CardTitle>
          <CardDescription>
            Update contractor information. Contractor code cannot be changed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Contractor Code (Read-only) */}
            <div className="grid gap-2">
              <Label htmlFor="contractor_code">Contractor Code</Label>
              <Input
                id="contractor_code"
                value={contractor.contractor_code}
                disabled
                className="bg-muted border-border"
              />
              <p className="text-xs text-muted-foreground">
                Contractor code is auto-generated and cannot be changed
              </p>
            </div>

            {/* Name Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="first_name">
                  First Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="first_name"
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
                rows={4}
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

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                className="border-border"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-cta hover:bg-cta/90 text-white"
                disabled={updateContractor.isPending}
              >
                <Save className="mr-2 h-4 w-4" />
                {updateContractor.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
