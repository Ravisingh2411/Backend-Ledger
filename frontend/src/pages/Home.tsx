import { Link } from 'react-router-dom'
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Check,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  ShieldCheck,
  WalletCards,
  ArrowLeftRight,
  ChartNoAxesCombined,
  Menu,
} from 'lucide-react'
import { useAuth } from '../context/useAuth'

const features = [
  {
    icon: WalletCards,
    title: 'Accounts in one place',
    description:
      'Keep your financial accounts organized and get a clear view of the balances that matter.',
  },
  {
    icon: ArrowLeftRight,
    title: 'Transfers made clear',
    description:
      'Move money between accounts and follow every transfer with a transparent record.',
  },
  {
    icon: ChartNoAxesCombined,
    title: 'Understand your activity',
    description:
      'Explore transaction history and useful summaries to make sense of your financial activity.',
  },
]

const steps = [
  ['01', 'Create your workspace', 'Sign up and bring your financial accounts together.'],
  ['02', 'Manage everyday activity', 'Record transfers and keep track of incoming and outgoing transactions.'],
  ['03', 'Review with confidence', 'Use your history and analytics to understand your activity over time.'],
]

function Home() {
  const { isAuthenticated } = useAuth()

  return (
    <main className="min-h-screen overflow-hidden bg-[#F7F8F5] text-[#17211F]">
      <header className="sticky top-0 z-30 border-b border-[#E7ECE7] bg-[#F7F8F5]/95 backdrop-blur">
        <nav className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-10">
          <Link to="/" className="flex items-center gap-3" aria-label="Backend Ledger home">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#176B52] text-white shadow-sm">
              <WalletCards size={22} strokeWidth={2.2} />
            </span>
            <span className="text-lg font-bold tracking-tight sm:text-xl">Backend Ledger</span>
          </Link>

          <div className="hidden items-center gap-8 text-sm font-medium text-[#5F6E66] md:flex">
            <a href="#features" className="transition hover:text-[#176B52]">Features</a>
            <a href="#how-it-works" className="transition hover:text-[#176B52]">How it works</a>
            <a href="#about" className="transition hover:text-[#176B52]">About</a>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {isAuthenticated ? (
              <Link to="/dashboard" className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#176B52] px-4 text-sm font-semibold text-white transition hover:bg-[#12543F] sm:px-5">
                Open workspace <ArrowUpRight size={16} />
              </Link>
            ) : (
              <>
                <Link to="/login" className="hidden rounded-xl px-4 py-2.5 text-sm font-semibold text-[#34443B] transition hover:bg-[#EAF0EB] sm:inline-flex">Sign in</Link>
                <Link to="/register" className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#176B52] px-4 text-sm font-semibold text-white transition hover:bg-[#12543F] sm:px-5">
                  Get started <ArrowRight size={16} />
                </Link>
              </>
            )}
          </div>
        </nav>
      </header>

      <section className="relative isolate">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,_rgba(183,211,190,0.42),_transparent_48%)]" />
        <div className="mx-auto grid max-w-7xl items-center gap-14 px-5 pb-20 pt-16 sm:px-8 sm:pt-20 lg:grid-cols-[1.02fr_0.98fr] lg:gap-16 lg:px-10 lg:pb-28 lg:pt-24">
          <div>
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#D7E4DA] bg-white/80 px-4 py-2 text-xs font-semibold tracking-wide text-[#176B52] shadow-sm sm:text-sm">
              <span className="h-2 w-2 rounded-full bg-[#39966F]" />
              YOUR FINANCES, IN CLEAR VIEW
            </div>

            <h1 className="max-w-2xl text-[2.65rem] font-semibold leading-[1.1] tracking-[-0.045em] text-[#172D26] sm:text-5xl lg:text-[3.75rem]">
              A clearer way to
              <span className="block text-[#267A5B]">manage your money.</span>
            </h1>

            <p className="mt-7 max-w-xl text-base leading-8 text-[#68776E] sm:text-lg">
              Bring accounts, transfers and transaction history together in one organized financial workspace. Stay informed about your activity without the clutter.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link to={isAuthenticated ? '/dashboard' : '/register'} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#176B52] px-6 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(23,107,82,0.18)] transition hover:-translate-y-0.5 hover:bg-[#12543F]">
                {isAuthenticated ? 'Go to dashboard' : 'Create your free account'} <ArrowRight size={17} />
              </Link>
              <a href="#features" className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-[#DCE5DE] bg-white px-6 text-sm font-semibold text-[#34443B] transition hover:border-[#B7CDBD] hover:bg-[#F2F6F2]">
                Explore features <ChevronRight size={17} />
              </a>
            </div>

            <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs font-medium text-[#718078] sm:text-sm">
              <span className="inline-flex items-center gap-2"><ShieldCheck size={16} className="text-[#267A5B]" /> Secure account access</span>
              <span className="inline-flex items-center gap-2"><Check size={16} className="text-[#267A5B]" /> Clear transaction records</span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[570px]">
            <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-[#DDEBDD] blur-3xl" />
            <div className="absolute -bottom-8 -left-8 h-40 w-40 rounded-full bg-[#D5E6DB] blur-3xl" />
            <div className="relative rounded-[28px] border border-[#E1E9E2] bg-white p-4 shadow-[0_28px_80px_rgba(27,57,43,0.12)] sm:p-6">
              <div className="flex items-center justify-between border-b border-[#EDF1ED] pb-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E7F1E9] text-[#176B52]"><WalletCards size={21} /></div>
                  <div>
                    <p className="text-sm font-bold text-[#20352B]">Financial overview</p>
                    <p className="mt-0.5 text-xs text-[#8A978F]">Workspace preview</p>
                  </div>
                </div>
                <span className="rounded-full bg-[#EDF5EF] px-3 py-1 text-[10px] font-bold tracking-wider text-[#267A5B]">PREVIEW</span>
              </div>

              <div className="mt-5 rounded-2xl bg-[#172D26] p-5 text-white sm:p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-[#B8CFC0]">TOTAL ACCOUNT BALANCE</p>
                    <p className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">₹ 2,48,650.00</p>
                    <p className="mt-2 text-xs text-[#A8C5B2]">Illustrative dashboard preview</p>
                  </div>
                  <span className="rounded-xl bg-white/10 p-2.5 text-[#C4DDCC]"><CircleDollarSign size={22} /></span>
                </div>
                <div className="mt-7 grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-white/10 bg-white/[0.07] p-3">
                    <p className="text-[11px] text-[#B8CFC0]">INCOME</p>
                    <p className="mt-1.5 text-lg font-semibold">₹ 38,500</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/[0.07] p-3">
                    <p className="text-[11px] text-[#B8CFC0]">EXPENSES</p>
                    <p className="mt-1.5 text-lg font-semibold">₹ 12,800</p>
                  </div>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-[#E8EEE9] bg-[#FAFCFA] p-4">
                  <div className="flex items-center justify-between text-[#7C8B81]"><span className="text-xs font-medium">Accounts</span><WalletCards size={17} /></div>
                  <p className="mt-3 text-xl font-bold text-[#20352B]">Organized</p>
                  <p className="mt-1 text-xs text-[#8A978F]">All in one place</p>
                </div>
                <div className="rounded-2xl border border-[#E8EEE9] bg-[#FAFCFA] p-4">
                  <div className="flex items-center justify-between text-[#7C8B81]"><span className="text-xs font-medium">Activity</span><Clock3 size={17} /></div>
                  <p className="mt-3 text-xl font-bold text-[#20352B]">Trackable</p>
                  <p className="mt-1 text-xs text-[#8A978F]">Clear records</p>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between rounded-xl bg-[#F1F6F1] px-4 py-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-[#345344]"><BarChart3 size={17} /> Financial insights</div>
                <span className="text-xs font-medium text-[#6B8A76]">At a glance</span>
              </div>
            </div>
            <div className="absolute -bottom-5 right-5 hidden items-center gap-2 rounded-xl border border-[#E3ECE4] bg-white px-4 py-3 text-xs font-semibold text-[#365746] shadow-lg sm:flex">
              <ShieldCheck size={16} className="text-[#267A5B]" /> Built for financial clarity
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="border-y border-[#E8EDE8] bg-white py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
          <div className="max-w-2xl">
            <p className="text-xs font-bold tracking-[0.18em] text-[#267A5B]">A BETTER FINANCIAL WORKFLOW</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-[#172D26] sm:text-4xl">Everything important. In one place.</h2>
            <p className="mt-4 text-base leading-7 text-[#718078]">Simple tools to help you stay organized, follow your money and review your financial activity.</p>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {features.map(({ icon: Icon, title, description }, index) => (
              <article key={title} className="group rounded-2xl border border-[#E6ECE7] bg-[#FBFCFA] p-7 transition duration-200 hover:-translate-y-1 hover:border-[#C9DCCF] hover:shadow-[0_16px_40px_rgba(30,68,48,0.07)]">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#E8F1E9] text-[#176B52] transition group-hover:bg-[#176B52] group-hover:text-white"><Icon size={22} /></div>
                <p className="mt-7 text-xs font-bold tracking-widest text-[#8A9B90]">0{index + 1}</p>
                <h3 className="mt-2 text-lg font-semibold text-[#20352B]">{title}</h3>
                <p className="mt-3 text-sm leading-7 text-[#718078]">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="py-20 sm:py-24">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20 lg:px-10">
          <div>
            <p className="text-xs font-bold tracking-[0.18em] text-[#267A5B]">GET STARTED</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-[#172D26] sm:text-4xl">Clarity, one step at a time.</h2>
            <p className="mt-5 max-w-md text-base leading-7 text-[#718078]">Backend Ledger keeps the everyday essentials straightforward, so you can focus on understanding your finances.</p>
            <Link to={isAuthenticated ? '/dashboard' : '/register'} className="mt-8 inline-flex items-center gap-2 text-sm font-bold text-[#176B52] hover:text-[#12543F]">
              {isAuthenticated ? 'Open your workspace' : 'Start managing your finances'} <ArrowUpRight size={17} />
            </Link>
          </div>
          <div className="space-y-4">
            {steps.map(([number, title, description]) => (
              <div key={number} className="flex gap-5 rounded-2xl border border-[#E5ECE6] bg-white p-5 sm:gap-7 sm:p-7">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#EAF2EB] text-sm font-bold text-[#267A5B]">{number}</span>
                <div>
                  <h3 className="text-base font-semibold text-[#20352B]">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[#718078]">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="about" className="px-5 pb-20 sm:px-8 sm:pb-24 lg:px-10">
        <div className="mx-auto max-w-7xl overflow-hidden rounded-[28px] bg-[#172D26] px-7 py-12 text-center sm:px-12 sm:py-16">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-[#C4DDCC]"><WalletCards size={24} /></div>
          <h2 className="mx-auto mt-6 max-w-2xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">Make every financial detail easier to follow.</h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-[#C1CEC6] sm:text-base">A focused workspace for managing accounts, tracking transactions and reviewing your financial activity.</p>
          <Link to={isAuthenticated ? '/dashboard' : '/register'} className="mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-white px-6 text-sm font-bold text-[#176B52] transition hover:bg-[#EAF2EB]">
            {isAuthenticated ? 'Go to workspace' : 'Create your account'} <ArrowRight size={17} />
          </Link>
        </div>
      </section>

      <footer className="border-t border-[#E5EBE5] bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-8 sm:px-8 md:flex-row md:items-center md:justify-between lg:px-10">
          <Link to="/" className="flex items-center gap-2.5 text-sm font-bold text-[#20352B]">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#176B52] text-white"><WalletCards size={18} /></span>
            Backend Ledger
          </Link>
          <p className="text-xs text-[#87948B]">© {new Date().getFullYear()} Backend Ledger. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-5 text-xs font-medium text-[#718078]">
            <Link to="/login" className="hover:text-[#176B52]">Sign in</Link>
            <Link to="/register" className="hover:text-[#176B52]">Create account</Link>
          </div>
        </div>
      </footer>
    </main>
  )
}

export default Home
