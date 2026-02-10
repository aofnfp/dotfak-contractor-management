'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCompleteProfile } from '@/lib/hooks/useOnboarding'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/lib/api/client'

interface VerifyProfileStepProps {
  firstName: string
  lastName: string
  phone?: string | null
  address?: string | null
  onComplete: (contractId: string) => void
}

export function VerifyProfileStep({
  firstName: initialFirst,
  lastName: initialLast,
  phone: initialPhone,
  address: initialAddress,
  onComplete,
}: VerifyProfileStepProps) {
  const [formData, setFormData] = useState({
    first_name: initialFirst,
    last_name: initialLast,
    phone: initialPhone || '',
    address: initialAddress || '',
    country: 'NG',
    bank_account_last4: '',
  })

  const completeProfile = useCompleteProfile()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.bank_account_last4 || formData.bank_account_last4.length !== 4) {
      toast.error('Please enter the last 4 digits of your bank account')
      return
    }

    try {
      const result = await completeProfile.mutateAsync(formData)
      if (result.contract_id) {
        toast.success('Profile completed! Contract generated.')
        onComplete(result.contract_id)
      } else {
        toast.error('Profile saved but no contract was generated. Contact admin.')
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to complete profile'))
    }
  }

  return (
    <Card className="border-secondary">
      <CardHeader>
        <CardTitle className="font-heading text-2xl">Verify Your Profile</CardTitle>
        <CardDescription>
          Confirm your information and provide your bank details.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="first_name">First Name</Label>
              <Input
                id="first_name"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                required
                className="bg-secondary border-border"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="last_name">Last Name</Label>
              <Input
                id="last_name"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                required
                className="bg-secondary border-border"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+234 xxx xxx xxxx"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="bg-secondary border-border"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              placeholder="Your full address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="bg-secondary border-border"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="country">Country</Label>
            <Select
              value={formData.country}
              onValueChange={(val) => setFormData({ ...formData, country: val })}
            >
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NG">Nigeria</SelectItem>
                <SelectItem value="US">United States</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="bank_last4">
              Bank Account Last 4 Digits <span className="text-destructive">*</span>
            </Label>
            <Input
              id="bank_last4"
              type="text"
              placeholder="1234"
              maxLength={4}
              pattern="[0-9]{4}"
              value={formData.bank_account_last4}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 4)
                setFormData({ ...formData, bank_account_last4: val })
              }}
              required
              className="bg-secondary border-border w-32"
            />
            <p className="text-xs text-muted-foreground">
              This is used to match your payment deposits from paystubs.
            </p>
          </div>

          <Button
            type="submit"
            className="w-full bg-cta hover:bg-cta/90 text-white"
            disabled={completeProfile.isPending}
          >
            {completeProfile.isPending ? 'Saving...' : 'Continue to Contract'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
