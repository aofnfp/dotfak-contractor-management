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
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCompleteProfile } from '@/lib/hooks/useOnboarding'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/lib/api/client'
import { PINNED_COUNTRIES, ALL_OTHER_COUNTRIES } from '@/lib/constants/countries'

interface VerifyProfileStepProps {
  firstName: string
  lastName: string
  phone?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
  country?: string | null
  zip_code?: string | null
  onComplete: (contractId: string) => void
}

export function VerifyProfileStep({
  firstName: initialFirst,
  lastName: initialLast,
  phone: initialPhone,
  address: initialAddress,
  city: initialCity,
  state: initialState,
  country: initialCountry,
  zip_code: initialZipCode,
  onComplete,
}: VerifyProfileStepProps) {
  const [formData, setFormData] = useState({
    first_name: initialFirst,
    last_name: initialLast,
    phone: initialPhone || '',
    address: initialAddress || '',
    city: initialCity || '',
    state: initialState || '',
    country: initialCountry || 'NG',
    zip_code: initialZipCode || '',
    bank_account_last4: '',
  })

  const completeProfile = useCompleteProfile()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.address.trim()) {
      toast.error('Please enter your street address')
      return
    }
    if (!formData.city.trim()) {
      toast.error('Please enter your city')
      return
    }
    if (!formData.state.trim()) {
      toast.error('Please enter your state')
      return
    }
    if (!formData.country) {
      toast.error('Please select your country')
      return
    }
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
            <Label htmlFor="address">
              Street Address <span className="text-destructive">*</span>
            </Label>
            <Input
              id="address"
              placeholder="123 Main Street"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="bg-secondary border-border"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="city">
                City <span className="text-destructive">*</span>
              </Label>
              <Input
                id="city"
                placeholder="Lagos"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="bg-secondary border-border"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="state">
                State / Province <span className="text-destructive">*</span>
              </Label>
              <Input
                id="state"
                placeholder="Lagos"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                className="bg-secondary border-border"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="country">
                Country <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.country}
                onValueChange={(val) => setFormData({ ...formData, country: val })}
              >
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  {PINNED_COUNTRIES.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.name}
                    </SelectItem>
                  ))}
                  <SelectSeparator />
                  {ALL_OTHER_COUNTRIES.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="zip_code">ZIP / Postal Code</Label>
              <Input
                id="zip_code"
                placeholder="100001"
                value={formData.zip_code}
                onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
                className="bg-secondary border-border"
              />
            </div>
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
