
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  WalletCards,
  ShieldCheck,
  ArrowUpRight,
} from 'lucide-react'
import { useAuth } from '../context/useAuth'

function Login() {
  const { login, loading } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')

    try {
      await login({ email, password })
      navigate('/dashboard', { replace: true })
    } catch (err: unknown) {
      const message = (
        err as { response?: { data?: { message?: string } } }
      )?.response?.data?.message

      setError(message || 'Unable to sign in. Please check your credentials.')
    }
  }

  return (
    <main className="flex min-h-screen bg-canvas">
      {/* Left branding panel */}
      <section className="hidden w-1/2 flex-col justify-between bg-[#172D26] px-10 py-10 text-white lg:flex xl:px-14 xl:py-12">
        <Link to="/" className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand text-white">
            <WalletCards size={25} strokeWidth={2.2} />
          </div>
          <span className="text-xl font-semibold tracking-tight">
            Backend Ledger
          </span>
        </Link>

        <div className="w-full max-w-2xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm text-[#C4D7CC]">
            <ShieldCheck size={15} />
            Financial clarity starts here
          </div>

          <h1 className="text-4xl font-semibold leading-[1.2] tracking-tight xl:text-[2.75rem]">
            Take control of your money.
            <span className="mt-1 block text-[#A8CBB7]">
              One transaction at a time.
            </span>
          </h1>

          <p className="mt-5 max-w-lg text-base leading-7 text-[#C1CEC6]">
            A clearer way to manage accounts, monitor transactions and
            understand where your money goes.
          </p>

          {/* Account preview */}
          <div className="mt-9 max-w-xl rounded-2xl border border-white/10 bg-white/[0.06] p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-white">
                  Your financial workspace
                </p>
                <p className="mt-1 text-xs text-[#AFC2B6]">
                  A preview of what you can manage
                </p>
              </div>

              <span className="rounded-full border border-white/15 px-3 py-1 text-[10px] font-medium tracking-wide text-[#C4D7CC]">
                PREVIEW
              </span>
            </div>

            <div className="mt-5 rounded-xl border border-white/10 bg-[#203B31] p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#315D49]">
                    <WalletCards size={19} className="text-[#C4DCCB]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">
                      Account management
                    </p>
                    <p className="text-xs text-[#AFC2B6]">
                      Your accounts in one place
                    </p>
                  </div>
                </div>

                <ArrowUpRight size={19} className="text-[#A8CBB7]" />
              </div>

              <div className="mt-5 grid grid-cols-3 gap-2 border-t border-white/10 pt-4">
                <div>
                  <p className="text-xs text-[#AFC2B6]">Accounts</p>
                  <p className="mt-1 text-sm font-semibold text-white">
                    Organized
                  </p>
                </div>

                <div>
                  <p className="text-xs text-[#AFC2B6]">Transfers</p>
                  <p className="mt-1 text-sm font-semibold text-white">
                    Trackable
                  </p>
                </div>

                <div>
                  <p className="text-xs text-[#AFC2B6]">Ledger</p>
                  <p className="mt-1 text-sm font-semibold text-white">
                    Transparent
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-[#AFC2B6]">01 / ACCOUNTS</p>
                <p className="mt-1 text-sm font-medium text-white">
                  Organized finances
                </p>
              </div>

              <div>
                <p className="text-xs text-[#AFC2B6]">02 / TRANSACTIONS</p>
                <p className="mt-1 text-sm font-medium text-white">
                  Clear records
                </p>
              </div>
            </div>
          </div>
        </div>

        <p className="text-sm text-[#9BAFA3]">
          Â© 2026 Backend Ledger. Manage money with clarity.
        </p>
      </section>

      {/* Login form */}
      <section className="flex min-h-screen flex-1 items-center justify-center px-5 py-10 sm:px-8 sm:py-12 lg:px-10">
        <div className="w-full max-w-md">
          <div className="mb-10 lg:hidden">
            <Link to="/" className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-white">
                <WalletCards size={23} strokeWidth={2.2} />
              </div>
              <span className="text-xl font-semibold tracking-tight">
                Backend Ledger
              </span>
            </Link>
          </div>

          <div className="mb-8">
            <p className="mb-3 text-sm font-medium tracking-wide text-brand">
              WELCOME BACK
            </p>

            <h2 className="text-3xl font-semibold tracking-tight sm:text-[2rem]">
              Sign in to your account
            </h2>

            <p className="mt-3 text-sm leading-6 text-muted">
              Enter your details to access your financial dashboard.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-medium text-ink"
              >
                Email address
              </label>

              <div className="flex items-center gap-3 rounded-xl border border-line bg-white px-4 transition focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/10">
                <Mail size={18} className="shrink-0 text-muted" />

                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="h-12 w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-gray-400"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium text-ink"
              >
                Password
              </label>

              <div className="flex items-center gap-3 rounded-xl border border-line bg-white px-4 transition focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/10">
                <LockKeyhole size={18} className="shrink-0 text-muted" />

                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="h-12 w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-gray-400"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="shrink-0 text-muted transition hover:text-ink"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand text-sm font-semibold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Signing in...' : 'Sign in'}
              {!loading && <ArrowRight size={17} />}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-muted">
            Don't have an account?{' '}
            <Link
              to="/register"
              className="font-semibold text-brand hover:underline"
            >
              Create account
            </Link>
          </p>

          <p className="mt-10 flex items-center justify-center gap-2 text-center text-xs text-muted">
            <ShieldCheck size={14} />
            Secure account access Â· Backend Ledger
          </p>
        </div>
      </section>
    </main>
  )
}

export default Login
