import { Link } from 'react-router-dom'
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  Check,
  ChevronDown,
  CircleHelp,
  CreditCard,
  LayoutDashboard,
  LockKeyhole,
  Menu,
  MoreHorizontal,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Wallet,
  WalletCards,
} from 'lucide-react'
import { useAuth } from '../context/useAuth'

const features = [
  {
    icon: WalletCards,
    number: '01',
    title: 'All accounts, one view',
    description:
      'Keep your accounts together and get a quick picture of the balances you manage.',
  },
  {
    icon: ArrowLeftRight,
    number: '02',
    title: 'Transfers without confusion',
    description:
      'Move money between accounts and follow each transfer with a clear transaction record.',
  },
  {
    icon: BarChart3,
    number: '03',
    title: 'Insights that make sense',
    description:
      'Review incoming and outgoing activity with simple summaries and visual analytics.',
  },
]

const transactions = [
  { name: 'Salary credited', detail: 'Bank account · Today', amount: '+₹45,000', positive: true, initials: 'SC' },
  { name: 'Grocery store', detail: 'Everyday account · Yesterday', amount: '-₹2,450', positive: false, initials: 'GS' },
  { name: 'Monthly savings', detail: 'Internal transfer · 06 Nov', amount: '₹8,000', positive: null, initials: 'MS' },
]

function Home() {
  const { isAuthenticated } = useAuth()

  return (
    <main className="min-h-screen overflow-hidden bg-[#F7F9F6] text-[#172D26]">
      <header className="sticky top-0 z-40 border-b border-[#E5ECE6] bg-white/90 backdrop-blur-xl">
        <nav className="mx-auto flex h-[74px] max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-10">
          <Link to="/" className="flex items-center gap-3" aria-label="Backend Ledger home">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#176B52] text-white shadow-sm">
              <WalletCards size={22} strokeWidth={2.2} />
            </span>
            <span className="text-lg font-bold tracking-tight sm:text-xl">Backend Ledger</span>
          </Link>

          <div className="hidden items-center gap-8 text-sm font-medium text-[#64746B] md:flex">
            <a href="#product" className="transition hover:text-[#176B52]">Product</a>
            <a href="#features" className="transition hover:text-[#176B52]">Features</a>
            <a href="#how-it-works" className="transition hover:text-[#176B52]">How it works</a>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {isAuthenticated ? (
              <Link to="/dashboard" className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#176B52] px-4 text-sm font-semibold text-white transition hover:bg-[#12543F]">
                Open workspace <ArrowUpRight size={16} />
              </Link>
            ) : (
              <>
                <Link to="/login" className="rounded-xl px-3 py-2.5 text-sm font-semibold text-[#34483D] transition hover:bg-[#F0F5F0] sm:px-4">Sign in</Link>
                <Link to="/register" className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#176B52] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#12543F] sm:px-5">
                  Create account <ArrowRight size={16} />
                </Link>
              </>
            )}
          </div>
        </nav>
      </header>

      <section className="relative isolate">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_78%_18%,_rgba(193,220,198,0.55),_transparent_38%),linear-gradient(180deg,#F7F9F6_0%,#F2F7F1_100%)]" />
        <div className="mx-auto grid max-w-7xl items-center gap-14 px-5 pb-20 pt-16 sm:px-8 sm:pt-20 lg:grid-cols-[0.88fr_1.12fr] lg:gap-10 lg:px-10 lg:pb-28 lg:pt-24">
          <div className="relative z-10">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#D7E5D9] bg-white/80 px-4 py-2 text-xs font-bold tracking-[0.12em] text-[#267A5B] shadow-sm">
              <Sparkles size={14} /> YOUR FINANCIAL WORKSPACE
            </div>

            <h1 className="max-w-2xl text-[2.8rem] font-semibold leading-[1.08] tracking-[-0.055em] text-[#172D26] sm:text-5xl lg:text-[4.1rem]">
              Your money.
              <span className="block text-[#267A5B]">Clearly in control.</span>
            </h1>

            <p className="mt-7 max-w-xl text-base leading-8 text-[#687970] sm:text-lg">
              Backend Ledger brings your accounts, transfers and transaction activity into one simple workspace. See what you have, follow where it goes and understand your finances at a glance.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link to={isAuthenticated ? '/dashboard' : '/register'} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#176B52] px-6 text-sm font-bold text-white shadow-[0_12px_28px_rgba(23,107,82,0.2)] transition hover:-translate-y-0.5 hover:bg-[#12543F]">
                {isAuthenticated ? 'Go to dashboard' : 'Create your account'} <ArrowRight size={17} />
              </Link>
              <a href="#product" className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-[#D8E4DA] bg-white/90 px-6 text-sm font-bold text-[#34483D] transition hover:border-[#B8CEBE] hover:bg-white">
                Take a product tour <ArrowDownLeft size={17} />
              </a>
            </div>

            <div className="mt-9 flex flex-wrap gap-x-6 gap-y-3 text-xs font-medium text-[#718078] sm:text-sm">
              <span className="inline-flex items-center gap-2"><LockKeyhole size={15} className="text-[#267A5B]" /> Protected sign-in</span>
              <span className="inline-flex items-center gap-2"><Check size={16} className="text-[#267A5B]" /> Organized records</span>
            </div>

            <div className="mt-12 grid max-w-md grid-cols-3 gap-4 border-t border-[#DCE7DD] pt-6">
              <div><p className="text-xl font-bold tracking-tight text-[#203B2E]">01</p><p className="mt-1 text-xs leading-5 text-[#7A8980]">Unified overview</p></div>
              <div><p className="text-xl font-bold tracking-tight text-[#203B2E]">02</p><p className="mt-1 text-xs leading-5 text-[#7A8980]">Clear transfers</p></div>
              <div><p className="text-xl font-bold tracking-tight text-[#203B2E]">03</p><p className="mt-1 text-xs leading-5 text-[#7A8980]">Useful insights</p></div>
            </div>
          </div>

          <div id="product" className="relative mx-auto w-full max-w-[700px] scroll-mt-28">
            <div className="absolute -right-12 -top-12 h-56 w-56 rounded-full bg-[#D6E9D8] blur-3xl" />
            <div className="absolute -bottom-12 -left-12 h-56 w-56 rounded-full bg-[#DCEBDD] blur-3xl" />

            <div className="relative overflow-hidden rounded-[26px] border border-[#DDE8DE] bg-white shadow-[0_30px_90px_rgba(31,68,48,0.16)]">
              <div className="flex h-14 items-center justify-between border-b border-[#EDF1ED] px-4 sm:px-5">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#176B52] text-white"><WalletCards size={17} /></span>
                  <span className="text-sm font-bold text-[#233A2D]">Backend Ledger</span>
                  <span className="hidden rounded-md bg-[#EEF5EF] px-2 py-1 text-[9px] font-bold tracking-wider text-[#428061] sm:inline-flex">WORKSPACE PREVIEW</span>
                </div>
                <div className="flex items-center gap-3 text-[#819087]">
                  <Search size={16} />
                  <Bell size={16} />
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#E5F0E7] text-[10px] font-bold text-[#267A5B]">JD</span>
                </div>
              </div>

              <div className="grid min-h-[440px] grid-cols-[54px_1fr] sm:grid-cols-[155px_1fr]">
                <aside className="border-r border-[#EDF1ED] bg-[#FBFCFA] p-2 sm:p-3">
                  <p className="hidden px-3 pb-3 pt-2 text-[9px] font-bold tracking-[0.16em] text-[#9AA69E] sm:block">WORKSPACE</p>
                  <div className="space-y-1">
                    <div className="flex items-center justify-center gap-2 rounded-lg bg-[#EAF3EB] px-2 py-2.5 text-[#176B52] sm:justify-start sm:px-3"><LayoutDashboard size={16} /><span className="hidden text-xs font-semibold sm:inline">Overview</span></div>
                    <div className="flex items-center justify-center gap-2 rounded-lg px-2 py-2.5 text-[#78877E] sm:justify-start sm:px-3"><Wallet size={16} /><span className="hidden text-xs font-medium sm:inline">Accounts</span></div>
                    <div className="flex items-center justify-center gap-2 rounded-lg px-2 py-2.5 text-[#78877E] sm:justify-start sm:px-3"><ArrowLeftRight size={16} /><span className="hidden text-xs font-medium sm:inline">Transfers</span></div>
                    <div className="flex items-center justify-center gap-2 rounded-lg px-2 py-2.5 text-[#78877E] sm:justify-start sm:px-3"><CreditCard size={16} /><span className="hidden text-xs font-medium sm:inline">Transactions</span></div>
                    <div className="flex items-center justify-center gap-2 rounded-lg px-2 py-2.5 text-[#78877E] sm:justify-start sm:px-3"><BarChart3 size={16} /><span className="hidden text-xs font-medium sm:inline">Analytics</span></div>
                  </div>
                  <div className="mt-8 hidden rounded-xl bg-[#F0F5F0] p-3 sm:block">
                    <CircleHelp size={16} className="text-[#4C8061]" />
                    <p className="mt-2 text-[10px] font-semibold text-[#3A5D47]">Need a hand?</p>
                    <p className="mt-1 text-[9px] leading-4 text-[#829087]">Your workspace, made simple.</p>
                  </div>
                </aside>

                <div className="min-w-0 bg-white p-3 sm:p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div><p className="text-[9px] font-bold tracking-[0.14em] text-[#91A096]">MONDAY, 08 NOVEMBER</p><h2 className="mt-1 text-base font-bold text-[#20372B] sm:text-xl">Good morning, Jamie</h2><p className="mt-1 text-[10px] text-[#8A978F] sm:text-xs">Here’s your financial snapshot.</p></div>
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-[#E7EDE8] px-2 py-1.5 text-[9px] font-semibold text-[#63756A] sm:px-3"><Menu size={12} /> This month <ChevronDown size={11} /></span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2.5 sm:mt-5 sm:grid-cols-3 sm:gap-3">
                    <div className="col-span-2 rounded-xl bg-[#173B2D] p-3.5 text-white sm:col-span-1 sm:p-4">
                      <div className="flex items-center justify-between"><span className="text-[9px] font-medium text-[#B9D0C1] sm:text-[10px]">TOTAL BALANCE</span><WalletCards size={15} className="text-[#C4DDCC]" /></div>
                      <p className="mt-2 text-xl font-bold tracking-tight sm:text-2xl">₹2,48,650</p>
                      <div className="mt-2 flex items-center gap-1 text-[9px] text-[#B8D9C2]"><TrendingUp size={11} /> All accounts combined</div>
                    </div>
                    <div className="rounded-xl border border-[#E9EFEB] bg-[#FBFCFA] p-3.5 sm:p-4">
                      <div className="flex items-center justify-between"><span className="text-[9px] font-medium text-[#87958C] sm:text-[10px]">MONEY IN</span><span className="rounded-md bg-[#E8F4EA] p-1 text-[#3D9460]"><ArrowDownLeft size={13} /></span></div>
                      <p className="mt-2 text-lg font-bold text-[#244333] sm:text-xl">₹45,000</p>
                      <p className="mt-1 text-[9px] text-[#8B9990]">This month</p>
                    </div>
                    <div className="rounded-xl border border-[#E9EFEB] bg-[#FBFCFA] p-3.5 sm:p-4">
                      <div className="flex items-center justify-between"><span className="text-[9px] font-medium text-[#87958C] sm:text-[10px]">MONEY OUT</span><span className="rounded-md bg-[#FCEFED] p-1 text-[#C66C5D]"><ArrowUpRight size={13} /></span></div>
                      <p className="mt-2 text-lg font-bold text-[#244333] sm:text-xl">₹12,800</p>
                      <p className="mt-1 text-[9px] text-[#8B9990]">This month</p>
                    </div>
                  </div>

                  <div className="mt-3 grid gap-3 sm:mt-4 sm:grid-cols-[1.25fr_0.75fr]">
                    <div className="rounded-xl border border-[#E9EFEB] p-3 sm:p-4">
                      <div className="flex items-center justify-between"><div><p className="text-[11px] font-bold text-[#344B3D]">Cash flow</p><p className="mt-0.5 text-[9px] text-[#91A096]">Income vs expenses</p></div><MoreHorizontal size={16} className="text-[#9AA69E]" /></div>
                      <div className="mt-3 flex h-[104px] items-end justify-between gap-2 border-b border-[#EEF2EE] px-1">
                        {[{a:45,b:22},{a:66,b:31},{a:52,b:27},{a:78,b:38},{a:61,b:29},{a:88,b:42},{a:72,b:34}].map((bar, i) => (
                          <div key={i} className="flex h-full flex-1 items-end justify-center gap-1">
                            <span className="w-[38%] rounded-t-[3px] bg-[#75B68A]" style={{ height: bar.a + '%' }} />
                            <span className="w-[38%] rounded-t-[3px] bg-[#E7B7A8]" style={{ height: bar.b + '%' }} />
                          </div>
                        ))}
                      </div>
                      <div className="mt-2 flex justify-between text-[8px] text-[#9AA69E]"><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span></div>
                      <div className="mt-3 flex gap-4 text-[9px] text-[#78877E]"><span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-sm bg-[#75B68A]" /> Income</span><span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-sm bg-[#E7B7A8]" /> Expenses</span></div>
                    </div>
                    <div className="rounded-xl border border-[#E9EFEB] p-3 sm:p-4">
                      <div className="flex items-center justify-between"><p className="text-[11px] font-bold text-[#344B3D]">My accounts</p><Plus size={14} className="text-[#6D8C76]" /></div>
                      <div className="mt-3 space-y-3">
                        <div className="flex items-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#EAF2EB] text-[#367451]"><Wallet size={13} /></span><div className="min-w-0 flex-1"><p className="text-[9px] font-semibold text-[#405448]">Main account</p><p className="text-[8px] text-[#9AA69E]">Savings</p></div><p className="text-[9px] font-bold text-[#344B3D]">₹1,80,000</p></div>
                        <div className="flex items-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#F5EFE5] text-[#A77C42]"><CreditCard size={13} /></span><div className="min-w-0 flex-1"><p className="text-[9px] font-semibold text-[#405448]">Daily spend</p><p className="text-[8px] text-[#9AA69E]">Current</p></div><p className="text-[9px] font-bold text-[#344B3D]">₹68,650</p></div>
                      </div>
                      <div className="mt-4 rounded-lg bg-[#F1F6F1] px-2.5 py-2 text-center text-[9px] font-semibold text-[#4D765B]">View all accounts <ArrowRight size={10} className="ml-1 inline" /></div>
                    </div>
                  </div>

                  <div className="mt-3 rounded-xl border border-[#E9EFEB] p-3 sm:mt-4 sm:p-4">
                    <div className="mb-3 flex items-center justify-between"><p className="text-[11px] font-bold text-[#344B3D]">Recent transactions</p><span className="text-[9px] font-semibold text-[#4C8061]">View all</span></div>
                    <div className="space-y-2.5">
                      {transactions.map((item) => (
                        <div key={item.name} className="flex items-center gap-2.5">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#F0F5F0] text-[8px] font-bold text-[#5D7D66]">{item.initials}</span>
                          <div className="min-w-0 flex-1"><p className="truncate text-[9px] font-semibold text-[#405448]">{item.name}</p><p className="truncate text-[8px] text-[#9AA69E]">{item.detail}</p></div>
                          <p className={`text-[9px] font-bold ${item.positive === true ? 'text-[#39865A]' : item.positive === false ? 'text-[#B66A5D]' : 'text-[#718078]'}`}>{item.amount}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between border-t border-[#EDF1ED] bg-[#FBFCFA] px-4 py-2.5 text-[9px] text-[#8A978F] sm:px-5">
                <span>Illustrative product preview · Sample information</span>
                <span className="inline-flex items-center gap-1"><ShieldCheck size={11} /> Workspace overview</span>
              </div>
            </div>
            <div className="absolute -bottom-5 -right-3 hidden items-center gap-2 rounded-xl border border-[#E1EAE2] bg-white px-4 py-3 text-xs font-semibold text-[#365746] shadow-lg sm:flex">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#EAF3EB] text-[#267A5B]"><Check size={15} /></span>
              Everything in one view
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="border-y border-[#E7EDE7] bg-white py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div className="max-w-2xl">
              <p className="text-xs font-bold tracking-[0.18em] text-[#267A5B]">BUILT AROUND YOUR EVERYDAY FINANCES</p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-[#172D26] sm:text-4xl">Less scattered. More clarity.</h2>
            </div>
            <p className="max-w-md text-sm leading-7 text-[#718078]">The essentials work together, giving you a more organized way to manage your money and understand your activity.</p>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {features.map(({ icon: Icon, number, title, description }) => (
              <article key={number} className="group rounded-2xl border border-[#E6ECE7] bg-[#FBFCFA] p-7 transition duration-200 hover:-translate-y-1 hover:border-[#C9DCCF] hover:shadow-[0_16px_40px_rgba(30,68,48,0.07)]">
                <div className="flex items-center justify-between"><span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#E8F1E9] text-[#176B52] transition group-hover:bg-[#176B52] group-hover:text-white"><Icon size={22} /></span><span className="text-xs font-bold tracking-widest text-[#9BA99F]">{number}</span></div>
                <h3 className="mt-7 text-lg font-semibold text-[#20352B]">{title}</h3>
                <p className="mt-3 text-sm leading-7 text-[#718078]">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="py-20 sm:py-24">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20 lg:px-10">
          <div>
            <p className="text-xs font-bold tracking-[0.18em] text-[#267A5B]">A SIMPLE WORKFLOW</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-[#172D26] sm:text-4xl">From sign-in to a clearer picture.</h2>
            <p className="mt-5 max-w-md text-base leading-7 text-[#718078]">Get started with a focused workspace. Add your accounts, keep track of activity and use your overview to see the bigger picture.</p>
            <Link to={isAuthenticated ? '/dashboard' : '/register'} className="mt-8 inline-flex items-center gap-2 text-sm font-bold text-[#176B52] transition hover:text-[#12543F]">
              {isAuthenticated ? 'Open your workspace' : 'Get started with Backend Ledger'} <ArrowUpRight size={17} />
            </Link>
          </div>
          <div className="space-y-4">
            {[
              ['01', 'Create your workspace', 'Sign in to your personal ledger and set up the accounts you want to manage.'],
              ['02', 'Record and follow activity', 'Keep deposits, payments and transfers organized with a clear transaction history.'],
              ['03', 'Review your financial picture', 'Use your dashboard and analytics to understand balances and money movement.'],
            ].map(([number, title, description]) => (
              <div key={number} className="flex gap-5 rounded-2xl border border-[#E5ECE6] bg-white p-5 sm:gap-7 sm:p-7">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#EAF2EB] text-sm font-bold text-[#267A5B]">{number}</span>
                <div><h3 className="text-base font-semibold text-[#20352B]">{title}</h3><p className="mt-2 text-sm leading-6 text-[#718078]">{description}</p></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 pb-20 sm:px-8 sm:pb-24 lg:px-10">
        <div className="mx-auto max-w-7xl overflow-hidden rounded-[28px] bg-[#173B2D] px-7 py-12 text-center sm:px-12 sm:py-16">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-[#C4DDCC]"><WalletCards size={24} /></div>
          <h2 className="mx-auto mt-6 max-w-2xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">A better view of your finances starts here.</h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-[#C1CEC6] sm:text-base">Bring your accounts and activity together in one organized financial workspace.</p>
          <a href="#product" className="mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-white px-6 text-sm font-bold text-[#176B52] transition hover:bg-[#EAF2EB]">
            Explore the workspace <ArrowUpRight size={17} />
          </a>
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
            <a href="#product" className="hover:text-[#176B52]">Product tour</a>
            <Link to="/login" className="hover:text-[#176B52]">Sign in</Link>
          </div>
        </div>
      </footer>
    </main>
  )
}

export default Home
