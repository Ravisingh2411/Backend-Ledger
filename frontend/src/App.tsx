
function App() {
  return (
    <div className="min-h-screen bg-canvas text-ink flex items-center justify-center p-6">
      <div className="max-w-lg text-center">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand text-white text-2xl font-bold">
          B
        </div>

        <h1 className="text-4xl font-semibold tracking-tight">
          Backend Ledger
        </h1>

        <p className="mt-3 text-muted text-base">
          Your finances, organized with clarity.
        </p>

        <div className="mt-8 rounded-xl border border-line bg-white p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted">Application status</span>
            <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-brand">
              Frontend ready
            </span>
          </div>
          <p className="mt-3 text-left text-sm text-muted">
            React, TypeScript and Tailwind CSS are configured successfully.
          </p>
        </div>
      </div>
    </div>
  )
}

export default App
