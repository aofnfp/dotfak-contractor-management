'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle2 } from 'lucide-react'
import Link from 'next/link'

export function CompletionStep() {
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
          Your account is set up and your contract has been signed.
          An admin will review and counter-sign your contract shortly.
        </p>
        <p className="text-muted-foreground text-sm">
          You'll receive an email once your contract is fully executed.
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
