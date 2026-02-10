export default function OnboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
      {/* Minimal header */}
      <header className="border-b border-border bg-secondary">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <h1 className="text-xl font-heading font-bold tracking-tight">
            Dotfak Group LLC
          </h1>
          <p className="text-xs text-muted-foreground">Contractor Onboarding</p>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  )
}
