import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, NavLink, useNavigationType } from 'react-router-dom'
import {
  Activity,
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  BarChart3,
  LayoutDashboard,
  LogOut,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
  Wallet,
  TrendingUp,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useAuth } from '../context/useAuth'
import api from '../services/api'

type AccountReference = string | {
  _id: string
  currency?: string
}

interface Transaction {
  _id: string
  fromAccount: AccountReference
  toAccount: AccountReference
  amount: number
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REVERSED'
  createdAt: string
}

interface TransactionsResponse {
  transactions: Transaction[]
}

interface AccountsResponse {
  accounts: { _id: string }[]
}

const SCROLL_STORAGE_KEY = 'backend-ledger-analytics-scroll'

const navigationItems = [
  { label: 'Overview', to: '/dashboard', icon: LayoutDashboard },
  { label: 'Transactions', to: '/transactions', icon: ReceiptText },
  { label: 'Analytics', to: '/analytics', icon: BarChart3 },
]

const formatAmount = (amount: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)

const getAccountId = (account: AccountReference) =>
  typeof account === 'string' ? account : account?._id ?? ''

const STATUS_COLORS: Record<string, string> = {
  COMPLETED: '#16845b',
  PENDING: '#e6a23c',
  FAILED: '#dc6262',
  REVERSED: '#84918a',
}

export default function Analytics() {
  const { user, logout } = useAuth()

  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [accountIds, setAccountIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  const navigationType = useNavigationType()
  const hasRestoredScroll = useRef(false)

  const loadAnalytics = async (refresh = false) => {
    try {
      if (refresh) setRefreshing(true)
      else setLoading(true)

      setError('')

      const [transactionResponse, accountResponse] = await Promise.all([
        api.get<TransactionsResponse>('/transactions/'),
        api.get<AccountsResponse>('/accounts/'),
      ])

      setTransactions(transactionResponse.data.transactions ?? [])
      setAccountIds(
        (accountResponse.data.accounts ?? []).map(account => account._id),
      )
    } catch {
      setError('Unable to load analytics. Please try again.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    void loadAnalytics()
  }, [])

  useEffect(() => {
    const saveScrollPosition = () => {
      sessionStorage.setItem(
        SCROLL_STORAGE_KEY,
        String(window.scrollY),
      )
    }

    window.addEventListener('scroll', saveScrollPosition, {
      passive: true,
    })

    window.addEventListener('pagehide', saveScrollPosition)

    return () => {
      saveScrollPosition()
      window.removeEventListener('scroll', saveScrollPosition)
      window.removeEventListener('pagehide', saveScrollPosition)
    }
  }, [])

  useEffect(() => {
    if (loading || hasRestoredScroll.current) return

    hasRestoredScroll.current = true

    if (navigationType !== 'POP') {
      sessionStorage.removeItem(SCROLL_STORAGE_KEY)
      return
    }

    const savedPosition = sessionStorage.getItem(SCROLL_STORAGE_KEY)

    if (savedPosition === null) return

    const scrollPosition = Number(savedPosition)

    if (!Number.isFinite(scrollPosition) || scrollPosition < 0) {
      sessionStorage.removeItem(SCROLL_STORAGE_KEY)
      return
    }

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.scrollTo({
          top: scrollPosition,
          behavior: 'auto',
        })
      })
    })
  }, [loading, navigationType])

  const analytics = useMemo(() => {
    const personalTransactions = transactions.filter(transaction => {
      const from = getAccountId(transaction.fromAccount)
      const to = getAccountId(transaction.toAccount)

      return accountIds.includes(from) || accountIds.includes(to)
    })

    const completedTransactions = personalTransactions.filter(
      transaction => transaction.status === 'COMPLETED',
    )

    let incoming = 0
    let outgoing = 0

    completedTransactions.forEach(transaction => {
      const from = getAccountId(transaction.fromAccount)
      const to = getAccountId(transaction.toAccount)

      if (accountIds.includes(from)) {
        outgoing += transaction.amount
      } else if (accountIds.includes(to)) {
        incoming += transaction.amount
      }
    })

    const now = new Date()
    const monthlyData = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(
        now.getFullYear(),
        now.getMonth() - (5 - index),
        1,
      )

      return {
        month: date.toLocaleDateString('en-IN', { month: 'short' }),
        year: date.getFullYear(),
        incoming: 0,
        outgoing: 0,
        monthIndex: date.getMonth(),
      }
    })

    completedTransactions.forEach(transaction => {
      const date = new Date(transaction.createdAt)
      const month = monthlyData.find(
        item =>
          item.monthIndex === date.getMonth() &&
          item.year === date.getFullYear(),
      )

      if (!month) return

      const from = getAccountId(transaction.fromAccount)
      const to = getAccountId(transaction.toAccount)

      if (accountIds.includes(from)) {
        month.outgoing += transaction.amount
      } else if (accountIds.includes(to)) {
        month.incoming += transaction.amount
      }
    })

    const statusData = ['COMPLETED', 'PENDING', 'FAILED', 'REVERSED']
      .map(status => ({
        name: status,
        value: personalTransactions.filter(
          transaction => transaction.status === status,
        ).length,
      }))
      .filter(item => item.value > 0)

    return {
      personalTransactions,
      completedTransactions,
      incoming,
      outgoing,
      netFlow: incoming - outgoing,
      monthlyData,
      statusData,
    }
  }, [transactions, accountIds])

  return (
    <div className="flex min-h-screen bg-[#f6f8f5] text-[#172b24]">
      <aside className="sticky top-0 flex h-screen w-20 shrink-0 flex-col border-r border-[#e5ebe6] bg-white px-3 py-6 lg:w-64 lg:px-5">
        <Link
          to="/dashboard"
          className="mb-10 flex items-center justify-center gap-3 lg:justify-start"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#176b4a] text-white">
            <Wallet size={23} />
          </div>

          <div className="hidden lg:block">
            <span className="text-lg font-bold tracking-tight text-[#172b24]">
              Backend Ledger
            </span>
            <p className="text-xs text-[#849188]">
              Financial workspace
            </p>
          </div>
        </Link>

        <p className="mb-3 hidden px-3 text-[11px] font-bold uppercase tracking-[0.12em] text-[#9aa59e] lg:block">
          WORKSPACE
        </p>

        <nav aria-label="User navigation" className="flex flex-col gap-2">
          {navigationItems.slice(0, 1).map(item => {
            const Icon = item.icon

            return (
              <NavLink
                key={item.to}
                to={item.to}
                end
                title={item.label}
                className={({ isActive }) =>
                  `flex items-center justify-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition lg:justify-start ${
                    isActive
                      ? 'bg-[#eaf3ed] text-[#176b4a]'
                      : 'text-[#64756b] hover:bg-[#edf5ef] hover:text-[#176b4a]'
                  }`
                }
              >
                <Icon size={19} className="shrink-0" />
                <span className="hidden lg:block">{item.label}</span>
              </NavLink>
            )
          })}

          <Link
            to="/dashboard#accounts"
            title="Accounts"
            className="flex items-center justify-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-[#64756b] transition hover:bg-[#edf5ef] hover:text-[#176b4a] lg:justify-start"
          >
            <Wallet size={19} className="shrink-0" />
            <span className="hidden lg:block">Accounts</span>
          </Link>

          <Link
            to="/dashboard#transfer"
            title="Transfers"
            className="flex items-center justify-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-[#64756b] transition hover:bg-[#edf5ef] hover:text-[#176b4a] lg:justify-start"
          >
            <ArrowLeftRight size={19} className="shrink-0" />
            <span className="hidden lg:block">Transfers</span>
          </Link>

          {navigationItems.slice(1).map(item => {
            const Icon = item.icon

            return (
              <NavLink
                key={item.to}
                to={item.to}
                end
                title={item.label}
                className={({ isActive }) =>
                  `flex items-center justify-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition lg:justify-start ${
                    isActive
                      ? 'bg-[#eaf3ed] text-[#176b4a]'
                      : 'text-[#64756b] hover:bg-[#edf5ef] hover:text-[#176b4a]'
                  }`
                }
              >
                <Icon size={19} className="shrink-0" />
                <span className="hidden lg:block">{item.label}</span>
              </NavLink>
            )
          })}
        </nav>

        <div className="mt-auto hidden rounded-2xl bg-[#f1f5f1] p-4 lg:block">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#176b4a]">
            <ShieldCheck size={17} />
            <span className="text-[#172b24]">Ledger security</span>
          </div>
          <p className="mt-2 text-xs leading-5 text-[#849188]">
            Account balances are calculated from transaction ledger records.
          </p>
        </div>

        <div className="mt-auto border-t border-[#e5ebe6] pt-4 lg:mt-5">
          <button
            onClick={() => void logout()}
            title="Sign out"
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-[#CFE4D5] bg-[#F5FAF6] px-3 py-3 text-sm font-semibold text-[#176B52] transition hover:border-[#A9D0B5] hover:bg-[#EAF3EE] lg:justify-start"
          >
            <LogOut size={19} className="shrink-0" />
            <span className="hidden lg:block">Sign out</span>
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-[#e5ebe6] bg-white/95 px-5 py-4 backdrop-blur sm:px-8 lg:px-10">
          <div>
            <p className="text-sm font-bold">Backend Ledger</p>
            <p className="text-xs text-[#829087]">
              Your financial workspace
            </p>
          </div>

          <div className="flex min-w-0 items-center gap-3 rounded-xl border border-[#E1EAE3] bg-white px-4 py-2.5 shadow-sm">
            <div className="hidden min-w-0 text-right sm:block">
              <p className="truncate text-sm font-semibold">{user?.name}</p>
              <p className="truncate text-xs text-[#829087]">{user?.email}</p>
            </div>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#e4efe8] text-sm font-bold text-[#176b4a]">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-[1440px] px-5 py-7 sm:px-8 sm:py-9 lg:px-10">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-[#176b4a]">
                YOUR WORKSPACE
              </p>
              <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
                Personal Analytics
              </h1>
              <p className="mt-2 text-sm text-[#718078]">
                Understand your money flow and transaction activity.
              </p>
            </div>

            <button
              onClick={() => void loadAnalytics(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-xl border border-[#dce5de] bg-white px-4 py-2.5 text-sm font-semibold transition hover:bg-[#f0f5f1] disabled:opacity-60"
            >
              <RefreshCw
                size={16}
                className={refreshing ? 'animate-spin' : ''}
              />
              Refresh
            </button>
          </div>

          {error && (
            <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              {error}
              <button
                onClick={() => void loadAnalytics()}
                className="ml-2 font-bold underline"
              >
                Try again
              </button>
            </div>
          )}

          {loading ? (
            <div className="flex min-h-72 items-center justify-center gap-3 text-sm text-[#718078]">
              <RefreshCw size={18} className="animate-spin" />
              Loading your analytics...
            </div>
          ) : (
            <>
              <section className="mb-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-[#e5ebe6] bg-white p-5">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-[#718078]">Total incoming</p>
                    <span className="rounded-xl bg-emerald-50 p-2 text-emerald-700">
                      <ArrowDownLeft size={19} />
                    </span>
                  </div>
                  <p className="mt-4 text-2xl font-bold">
                    {formatAmount(analytics.incoming)}
                  </p>
                  <p className="mt-1 text-xs text-[#87948c]">
                    Completed money received
                  </p>
                </div>

                <div className="rounded-2xl border border-[#e5ebe6] bg-white p-5">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-[#718078]">Total outgoing</p>
                    <span className="rounded-xl bg-amber-50 p-2 text-amber-700">
                      <ArrowUpRight size={19} />
                    </span>
                  </div>
                  <p className="mt-4 text-2xl font-bold">
                    {formatAmount(analytics.outgoing)}
                  </p>
                  <p className="mt-1 text-xs text-[#87948c]">
                    Completed money sent
                  </p>
                </div>

                <div className="rounded-2xl border border-[#e5ebe6] bg-white p-5">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-[#718078]">Net money flow</p>
                    <span className="rounded-xl bg-[#edf5ef] p-2 text-[#398664]">
                      <TrendingUp size={19} />
                    </span>
                  </div>
                  <p className={`mt-4 text-2xl font-bold ${
                    analytics.netFlow >= 0 ? 'text-emerald-700' : 'text-rose-600'
                  }`}>
                    {formatAmount(analytics.netFlow)}
                  </p>
                  <p className="mt-1 text-xs text-[#87948c]">
                    Incoming minus outgoing
                  </p>
                </div>

                <div className="rounded-2xl border border-[#e5ebe6] bg-white p-5">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-[#718078]">Total transactions</p>
                    <span className="rounded-xl bg-sky-50 p-2 text-sky-700">
                      <ReceiptText size={19} />
                    </span>
                  </div>
                  <p className="mt-4 text-2xl font-bold">
                    {analytics.personalTransactions.length}
                  </p>
                  <p className="mt-1 text-xs text-[#87948c]">
                    Your recorded activity
                  </p>
                </div>
              </section>

              <section className="mb-7 grid gap-6 xl:grid-cols-[1.7fr_1fr]">
                <div className="rounded-2xl border border-[#e5ebe6] bg-white p-5 sm:p-6">
                  <div className="mb-6">
                    <h2 className="text-lg font-bold">Money flow</h2>
                    <p className="mt-1 text-sm text-[#849188]">
                      Monthly incoming vs outgoing · Last 6 months
                    </p>
                  </div>

                  <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={analytics.monthlyData}
                        margin={{ top: 8, right: 8, left: 8, bottom: 0 }}
                      >
                        <CartesianGrid
                          stroke="#edf1ed"
                          strokeDasharray="4 4"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="month"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: '#849188', fontSize: 12 }}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: '#849188', fontSize: 11 }}
                          tickFormatter={value =>
                            value >= 1000 ? `₹${value / 1000}k` : `₹${value}`
                          }
                        />
                        <Tooltip
                          formatter={value => formatAmount(Number(value))}
                          contentStyle={{
                            borderRadius: 12,
                            border: '1px solid #e5ebe6',
                            fontSize: 12,
                          }}
                        />
                        <Legend />
                        <Bar
                          dataKey="incoming"
                          name="Incoming"
                          fill="#16845b"
                          radius={[5, 5, 0, 0]}
                        />
                        <Bar
                          dataKey="outgoing"
                          name="Outgoing"
                          fill="#e6a23c"
                          radius={[5, 5, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="rounded-2xl border border-[#e5ebe6] bg-white p-5 sm:p-6">
                  <div className="mb-3">
                    <h2 className="text-lg font-bold">Transaction status</h2>
                    <p className="mt-1 text-sm text-[#849188]">
                      Breakdown of your transactions
                    </p>
                  </div>

                  {analytics.statusData.length === 0 ? (
                    <div className="flex h-72 items-center justify-center text-sm text-[#849188]">
                      No transaction activity yet.
                    </div>
                  ) : (
                    <>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={analytics.statusData}
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              innerRadius={65}
                              outerRadius={95}
                              paddingAngle={4}
                            >
                              {analytics.statusData.map(entry => (
                                <Cell
                                  key={entry.name}
                                  fill={STATUS_COLORS[entry.name]}
                                />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>

                      <div className="space-y-3">
                        {analytics.statusData.map(item => (
                          <div
                            key={item.name}
                            className="flex items-center justify-between text-sm"
                          >
                            <div className="flex items-center gap-2">
                              <span
                                className="h-2.5 w-2.5 rounded-full"
                                style={{
                                  backgroundColor: STATUS_COLORS[item.name],
                                }}
                              />
                              <span className="text-[#64756b]">
                                {item.name}
                              </span>
                            </div>
                            <span className="font-semibold">{item.value}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </section>

              <section className="rounded-2xl border border-[#e5ebe6] bg-white p-5 sm:p-6">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold">Monthly activity</h2>
                    <p className="mt-1 text-sm text-[#849188]">
                      Completed transaction amounts over the last six months
                    </p>
                  </div>
                  <Activity size={21} className="text-[#398664]" />
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {analytics.monthlyData.map(month => (
                    <div
                      key={`${month.year}-${month.month}`}
                      className="rounded-xl border border-[#edf1ed] bg-[#fbfcfb] p-4"
                    >
                      <p className="text-sm font-semibold">
                        {month.month} {month.year}
                      </p>
                      <div className="mt-3 flex items-center justify-between text-xs">
                        <span className="text-[#849188]">Incoming</span>
                        <span className="font-semibold text-emerald-700">
                          {formatAmount(month.incoming)}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-xs">
                        <span className="text-[#849188]">Outgoing</span>
                        <span className="font-semibold text-amber-700">
                          {formatAmount(month.outgoing)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}

          <footer className="mt-8 flex flex-col justify-between gap-2 border-t border-[#e4eae4] py-5 text-xs text-[#829087] sm:flex-row">
            <p>© 2026 Backend Ledger</p>
            <p className="flex items-center gap-2">
              <ShieldCheck size={14} />
              Balances sourced from immutable ledger entries
            </p>
          </footer>
        </div>
      </main>
    </div>
  )
}