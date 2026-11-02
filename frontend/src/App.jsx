export default function App() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-md rounded-lg border border-line bg-surface p-8">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-accent text-sm font-bold text-white">
            IQ
          </div>
          <div>
            <p className="text-base font-semibold text-text-primary">
              IncidentIQ
            </p>
            <p className="text-xs text-text-secondary">
              Engineering Intelligence
            </p>
          </div>
        </div>

        <h1 className="mt-8 text-xl font-semibold tracking-tight">
          Frontend foundation ready
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-text-secondary">
          The dark enterprise design system, Vite build setup, Tailwind tokens,
          routing entry point, and application shell are now in place.
        </p>
      </div>
    </main>
  );
}