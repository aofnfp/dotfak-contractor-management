export default function OnboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
      {/* Minimal header */}
      <header className="border-b border-gold/30 bg-secondary">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <h1 className="text-xl font-heading font-bold text-gold tracking-[0.1em] uppercase">
            DOTFAK GROUP LLC
          </h1>
          <p className="text-xs text-gold-dark">Contractor Onboarding</p>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  )
}
