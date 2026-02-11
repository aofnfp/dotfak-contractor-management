'use client'

import { Suspense, useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { useVerifyToken } from '@/lib/hooks/useOnboarding'
import { SetPasswordStep } from '@/components/onboard/SetPasswordStep'
import { VerifyProfileStep } from '@/components/onboard/VerifyProfileStep'
import { ReviewContractStep } from '@/components/onboard/ReviewContractStep'
import { CompletionStep } from '@/components/onboard/CompletionStep'

type WizardStep = 'password' | 'profile' | 'contract' | 'done'

const STEPS: { key: WizardStep; label: string }[] = [
  { key: 'password', label: 'Set Password' },
  { key: 'profile', label: 'Verify Profile' },
  { key: 'contract', label: 'Sign Contract' },
  { key: 'done', label: 'Complete' },
]

// Persist wizard state in sessionStorage so accidental back-navigation doesn't lose progress
function getStorageKey(token: string) {
  return `onboard-wizard-${token}`
}

function loadWizardState(token: string): { step: WizardStep; contractorId: string; contractId: string } | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(getStorageKey(token))
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function saveWizardState(token: string, state: { step: WizardStep; contractorId: string; contractId: string }) {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(getStorageKey(token), JSON.stringify(state))
  } catch {}
}

function OnboardWizard() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token') || ''

  const { data: tokenData, isLoading } = useVerifyToken(token)

  // Restore state from sessionStorage if available (survives back-button)
  const saved = loadWizardState(token)
  const [step, setStep] = useState<WizardStep>(saved?.step || 'password')
  const [contractorId, setContractorId] = useState<string>(saved?.contractorId || '')
  const [contractId, setContractId] = useState<string>(saved?.contractId || '')

  // Save state to sessionStorage whenever it changes
  useEffect(() => {
    if (token) {
      saveWizardState(token, { step, contractorId, contractId })
    }
  }, [token, step, contractorId, contractId])

  // Block browser back-button / mouse side buttons during onboarding
  useEffect(() => {
    if (!token || step === 'done') return

    // Push a dummy history entry so back-button hits our handler instead of leaving
    window.history.pushState({ onboarding: true }, '')

    const handlePopState = (e: PopStateEvent) => {
      // Re-push state to prevent actually navigating away
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

  // Only show invalid-token error if we have NO saved progress.
  // After account setup, the token status changes to "accepted" and verify-token returns valid=false,
  // but we should still allow the wizard to continue from saved state.
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
        <SetPasswordStep
          token={token}
          firstName={tokenData?.first_name || ''}
          onComplete={(id) => {
            setContractorId(id)
            setStep('profile')
          }}
        />
      )}

      {step === 'profile' && (
        <VerifyProfileStep
          firstName={tokenData?.first_name || ''}
          lastName={tokenData.last_name || ''}
          phone={tokenData.phone}
          address={tokenData.address}
          onComplete={(cId) => {
            setContractId(cId)
            setStep('contract')
          }}
        />
      )}

      {step === 'contract' && contractId && (
        <ReviewContractStep
          contractId={contractId}
          onComplete={() => setStep('done')}
        />
      )}

      {step === 'done' && <CompletionStep />}
    </div>
  )
}

export default function OnboardPage() {
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
      <OnboardWizard />
    </Suspense>
  )
}
