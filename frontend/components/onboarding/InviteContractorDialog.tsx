'use client'

import { useState, useMemo } from 'react'
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
import { useContractors } from '@/lib/hooks/useContractors'
import { useCreateInvitation } from '@/lib/hooks/useOnboarding'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/lib/api/client'

interface InviteContractorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function InviteContractorDialog({ open, onOpenChange }: InviteContractorDialogProps) {
  const { data: contractors } = useContractors()
  const createInvitation = useCreateInvitation()

  const [contractorId, setContractorId] = useState('')
  const [email, setEmail] = useState('')

  // Only show contractors who haven't been invited yet
  const eligibleContractors = useMemo(() => {
    if (!contractors) return []
    return contractors.filter(
      (c: any) => !c.onboarding_status || c.onboarding_status === 'not_invited'
    )
  }, [contractors])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!contractorId || !email) return

    try {
      await createInvitation.mutateAsync({
        contractor_id: contractorId,
        email,
      })
      toast.success('Invitation sent successfully')
      setContractorId('')
      setEmail('')
      onOpenChange(false)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to send invitation'))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-secondary border-border">
        <DialogHeader>
          <DialogTitle className="font-heading">Invite Contractor</DialogTitle>
          <DialogDescription>
            Send an onboarding invitation to a contractor. They must have an active assignment.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="contractor">
                Contractor <span className="text-destructive">*</span>
              </Label>
              <Select value={contractorId} onValueChange={setContractorId}>
                <SelectTrigger className="bg-background border-border">
                  <SelectValue placeholder="Select a contractor" />
                </SelectTrigger>
                <SelectContent>
                  {eligibleContractors.length === 0 ? (
                    <SelectItem value="_none" disabled>
                      No eligible contractors
                    </SelectItem>
                  ) : (
                    eligibleContractors.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.first_name} {c.last_name} ({c.contractor_code})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="email">
                Email Address <span className="text-destructive">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="contractor@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
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
              disabled={createInvitation.isPending || !contractorId || !email}
            >
              {createInvitation.isPending ? 'Sending...' : 'Send Invitation'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
