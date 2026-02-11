'use client'

import { Suspense, useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { useVerifyManagerToken, useManagerSetupAccount, useManagerCompleteProfile } from '@/lib/hooks/useManagerOnboarding'
import { useContract, useSignContract } from '@/lib/hooks/useContracts'
import { ContractViewer } from '@/components/contracts/ContractViewer'
import { SignatureCapture } from '@/components/contracts/SignatureCapture'
import { updateCachedToken, getApiErrorMessage } from '@/lib/api/client'
import { toast } from 'sonner'
import { CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import type { SignatureMethod } from '@/lib/types/contract'

type WizardStep = 'password' | 'profile' | 'contract' | 'done'

const STEPS: { key: WizardStep; label: string }[] = [
  { key: 'password', label: 'Set Password' },
  { key: 'profile', label: 'Verify Profile' },
  { key: 'contract', label: 'Sign Contract(s)' },
  { key: 'done', label: 'Complete' },
]

// Persist wizard state in sessionStorage
function getStorageKey(token: string) {
  return `manager-onboard-wizard-${token}`
}

interface WizardState {
  step: WizardStep
  managerId: string
  contractIds: string[]
  currentContractIndex: number
}

function loadWizardState(token: string): WizardState | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(getStorageKey(token))
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function saveWizardState(token: string, state: WizardState) {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(getStorageKey(token), JSON.stringify(state))
  } catch {}
}

// ============================================================================
// Step Components
// ============================================================================

function ManagerSetPasswordStep({
  token,
  firstName,
  onComplete,
}: {
  token: string
  firstName: string
  onComplete: (managerId: string) => void
}) {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const setupAccount = useManagerSetupAccount()

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
      if (result.access_token) {
        updateCachedToken(result.access_token)
        if (typeof window !== 'undefined') {
          localStorage.setItem('access_token', result.access_token)
          if (result.refresh_token) {
            localStorage.setItem('refresh_token', result.refresh_token)
          }
        }
      }

      toast.success('Account created successfully!')
      onComplete(result.manager_id || '')
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
          Set up your password to create your manager account.
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

function ManagerVerifyProfileStep({
  firstName,
  lastName,
  phone,
  address,
  onComplete,
}: {
  firstName: string
  lastName: string
  phone?: string | null
  address?: string | null
  onComplete: (contractIds: string[]) => void
}) {
  const [formData, setFormData] = useState({
    first_name: firstName,
    last_name: lastName,
    phone: phone || '',
    address: address || '',
    bank_account_last4: '',
  })

  const completeProfile = useManagerCompleteProfile()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.bank_account_last4 || formData.bank_account_last4.length !== 4) {
      toast.error('Please enter the last 4 digits of your bank account')
      return
    }

    try {
      const result = await completeProfile.mutateAsync(formData)
      if (result.contract_ids && result.contract_ids.length > 0) {
        toast.success(`Profile completed! ${result.contract_ids.length} contract(s) generated.`)
        onComplete(result.contract_ids)
      } else {
        toast.error('Profile saved but no contracts were generated. Contact admin.')
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
              This is used to match your payment deposits.
            </p>
          </div>

          <Button
            type="submit"
            className="w-full bg-cta hover:bg-cta/90 text-white"
            disabled={completeProfile.isPending}
          >
            {completeProfile.isPending ? 'Saving...' : 'Continue to Contract(s)'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

function ManagerSignContractStep({
  contractIds,
  currentIndex,
  onContractSigned,
  onAllComplete,
}: {
  contractIds: string[]
  currentIndex: number
  onContractSigned: (nextIndex: number) => void
  onAllComplete: () => void
}) {
  const contractId = contractIds[currentIndex]
  const { data: contract, isLoading } = useContract(contractId)
  const signContract = useSignContract()

  const [agreed, setAgreed] = useState(false)
  const [signature, setSignature] = useState<{
    signature_data: string | null
    signature_method: SignatureMethod
    signer_name: string
  }>({ signature_data: null, signature_method: 'draw', signer_name: '' })

  const canSign = agreed && signature.signature_data && signature.signer_name.trim()
  const isLast = currentIndex >= contractIds.length - 1
  const totalContracts = contractIds.length

  const handleSign = async () => {
    if (!canSign || !signature.signature_data) return

    try {
      await signContract.mutateAsync({
        id: contractId,
        data: {
          signer_name: signature.signer_name,
          signature_data: signature.signature_data,
          signature_method: signature.signature_method,
        },
      })

      if (isLast) {
        toast.success('All contracts signed successfully!')
        onAllComplete()
      } else {
        toast.success(`Contract ${currentIndex + 1} of ${totalContracts} signed!`)
        // Reset state for next contract
        setAgreed(false)
        setSignature({ signature_data: null, signature_method: 'draw', signer_name: '' })
        onContractSigned(currentIndex + 1)
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to sign contract'))
    }
  }

  if (isLoading) {
    return (
      <Card className="border-secondary">
        <CardContent className="py-12 text-center text-muted-foreground">
          Loading contract...
        </CardContent>
      </Card>
    )
  }

  if (!contract) {
    return (
      <Card className="border-secondary">
        <CardContent className="py-12 text-center text-destructive">
          Contract not found. Please contact admin.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {totalContracts > 1 && (
        <div className="text-center text-sm text-muted-foreground">
          Contract {currentIndex + 1} of {totalContracts}
        </div>
      )}

      <Card className="border-secondary">
        <CardHeader>
          <CardTitle className="font-heading text-2xl">Review & Sign Contract</CardTitle>
          <CardDescription>
            Please read the contract carefully before signing.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ContractViewer htmlContent={contract.html_content} />
        </CardContent>
      </Card>

      <Card className="border-secondary">
        <CardHeader>
          <CardTitle className="text-lg">Your Signature</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <SignatureCapture onSignatureChange={setSignature} />

          <div
            className="flex items-start gap-3 mt-4 p-4 rounded-lg border border-border bg-secondary cursor-pointer"
            onClick={() => setAgreed(!agreed)}
          >
            <Checkbox
              checked={agreed}
              onCheckedChange={(checked) => setAgreed(checked as boolean)}
            />
            <span className="text-sm leading-relaxed">
              I have read and agree to the terms of this Management Agreement.
              I understand that this constitutes a legally binding agreement.
            </span>
          </div>

          <Button
            onClick={handleSign}
            className="w-full bg-cta hover:bg-cta/90 text-white"
            disabled={!canSign || signContract.isPending}
          >
            {signContract.isPending
              ? 'Signing...'
              : isLast
              ? 'Sign Contract'
              : `Sign & Continue (${currentIndex + 1}/${totalContracts})`
            }
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

function ManagerCompletionStep() {
  return (
    <Card className="border-secondary text-center">
      <CardHeader>
        <div className="flex justify-center mb-4">
          <CheckCircle2 className="h-16 w-16 text-green-400" />
        </div>
        <CardTitle className="font-heading text-2xl">You're All Set!</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground">
          Your manager account is set up and your contract(s) have been signed.
          An admin will review and counter-sign your contract(s) shortly.
        </p>
        <p className="text-muted-foreground text-sm">
          You'll receive an email once your contracts are fully executed.
        </p>
        <Link href="/login">
          <Button className="bg-cta hover:bg-cta/90 text-white mt-4">
            Login to Dashboard
          </Button>
        </Link>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// Main Wizard
// ============================================================================

function ManagerOnboardWizard() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token') || ''

  const { data: tokenData, isLoading } = useVerifyManagerToken(token)

  // Restore state from sessionStorage
  const saved = loadWizardState(token)
  const [step, setStep] = useState<WizardStep>(saved?.step || 'password')
  const [managerId, setManagerId] = useState<string>(saved?.managerId || '')
  const [contractIds, setContractIds] = useState<string[]>(saved?.contractIds || [])
  const [currentContractIndex, setCurrentContractIndex] = useState<number>(saved?.currentContractIndex || 0)

  // Save state to sessionStorage whenever it changes
  useEffect(() => {
    if (token) {
      saveWizardState(token, { step, managerId, contractIds, currentContractIndex })
    }
  }, [token, step, managerId, contractIds, currentContractIndex])

  // Block browser back-button during onboarding
  useEffect(() => {
    if (!token || step === 'done') return

    window.history.pushState({ onboarding: true }, '')

    const handlePopState = () => {
      window.history.pushState({ onboarding: true }, '')
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [token, step])

  if (!token) {
    return (
      <Card className="border-secondary">
        <CardContent className="py-12 text-center text-destructive">
          Invalid link. No invitation token provided.
        </CardContent>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <Card className="border-secondary">
        <CardContent className="py-12 text-center text-muted-foreground">
          Verifying your invitation...
        </CardContent>
      </Card>
    )
  }

  // Only show invalid-token error if we have NO saved progress
  if (!tokenData?.valid && step === 'password') {
    return (
      <Card className="border-secondary">
        <CardContent className="py-12 text-center text-destructive">
          This invitation link is invalid or has expired. Please contact your admin for a new invitation.
        </CardContent>
      </Card>
    )
  }

  const currentStepIndex = STEPS.findIndex(s => s.key === step)

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s.key} className="flex items-center gap-2 flex-1">
            <div
              className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold shrink-0 ${
                i < currentStepIndex
                  ? 'bg-green-500 text-white'
                  : i === currentStepIndex
                  ? 'bg-cta text-white'
                  : 'bg-secondary text-muted-foreground border border-border'
              }`}
            >
              {i < currentStepIndex ? '\u2713' : i + 1}
            </div>
            <span
              className={`text-sm hidden sm:block ${
                i === currentStepIndex ? 'text-foreground font-medium' : 'text-muted-foreground'
              }`}
            >
              {s.label}
            </span>
            {i < STEPS.length - 1 && (
              <div
                className={`flex-1 h-px ${
                  i < currentStepIndex ? 'bg-green-500' : 'bg-border'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Steps */}
      {step === 'password' && (
        <ManagerSetPasswordStep
          token={token}
          firstName={tokenData?.first_name || ''}
          onComplete={(id) => {
            setManagerId(id)
            setStep('profile')
          }}
        />
      )}

      {step === 'profile' && (
        <ManagerVerifyProfileStep
          firstName={tokenData?.first_name || ''}
          lastName={tokenData?.last_name || ''}
          phone={tokenData?.phone}
          address={tokenData?.address}
          onComplete={(ids) => {
            setContractIds(ids)
            setCurrentContractIndex(0)
            setStep('contract')
          }}
        />
      )}

      {step === 'contract' && contractIds.length > 0 && (
        <ManagerSignContractStep
          contractIds={contractIds}
          currentIndex={currentContractIndex}
          onContractSigned={(nextIndex) => setCurrentContractIndex(nextIndex)}
          onAllComplete={() => setStep('done')}
        />
      )}

      {step === 'done' && <ManagerCompletionStep />}
    </div>
  )
}

export default function ManagerOnboardPage() {
  return (
    <Suspense
      fallback={
        <Card className="border-secondary">
          <CardContent className="py-12 text-center text-muted-foreground">
            Loading...
          </CardContent>
        </Card>
      }
    >
      <ManagerOnboardWizard />
    </Suspense>
  )
}
