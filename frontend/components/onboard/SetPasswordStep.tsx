'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useSetupAccount } from '@/lib/hooks/useOnboarding'
import { updateCachedToken } from '@/lib/api/client'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/lib/api/client'

interface SetPasswordStepProps {
  token: string
  firstName: string
  onComplete: (contractorId: string) => void
}

export function SetPasswordStep({ token, firstName, onComplete }: SetPasswordStepProps) {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const setupAccount = useSetupAccount()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    try {
      const result = await setupAccount.mutateAsync({ token, password })

      // Store auth tokens so subsequent API calls work
      updateCachedToken(result.access_token)
      if (typeof window !== 'undefined') {
        localStorage.setItem('access_token', result.access_token)
        localStorage.setItem('refresh_token', result.refresh_token)
      }

      toast.success('Account created successfully!')
      onComplete(result.contractor_id)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to create account'))
    }
  }

  return (
    <Card className="border-secondary">
      <CardHeader>
        <CardTitle className="font-heading text-2xl">
          Welcome, {firstName}!
        </CardTitle>
        <CardDescription>
          Set up your password to create your account.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Minimum 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="bg-secondary border-border"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="confirm-password">Confirm Password</Label>
            <Input
              id="confirm-password"
              type="password"
              placeholder="Re-enter your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="bg-secondary border-border"
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-cta hover:bg-cta/90 text-white"
            disabled={setupAccount.isPending}
          >
            {setupAccount.isPending ? 'Creating Account...' : 'Create Account'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
