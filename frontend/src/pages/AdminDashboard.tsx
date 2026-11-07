import { useCallback, useEffect, useState } from 'react'
import {
  Activity,
  ArrowUpRight,
  Building2,
  CheckCircle2,
  Clock3,
  CreditCard,
  LayoutDashboard,
  LogOut,
  RefreshCw,
  ShieldCheck,
  Users,
  Wallet,
  XCircle,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../services/api'

interface TransactionCategory {
  count: number
  volume: number
}

interface DashboardData {
  customers: {
    total: number
    admins: number
  }
  accounts: {
    total: number
  }
  transactions: {
    total: number
    pending: number
    completed: number
    failed: number
    reversed: number
    completedVolume: number
    customerInitiated: TransactionCategory
    internalSystem: TransactionCategory
    unattributed: TransactionCategory
  }
}

interface Transaction {
  _id: string
  transactionId?: string
  type?: string
  amount: number
  status: string
  createdAt: string
  sender?: {
    name?: string
    email?: string
  }
  receiver?: {
    name?: string
    email?: string
  }
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount || 0)

const formatDate = (date: string) =>
  new Date(date).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

const getStatusStyle = (status: string) => {
  switch (status?.toUpperCase()) {
    case 'COMPLETED':
      return 'bg-green-50 text-green-700 border-green-200'
    case 'PENDING':
      return 'bg-amber-50 text-amber-700 border-amber-200'
    case 'FAILED':
      return 'bg-red-50 text-red-700 border-red-200'
    case 'REVERSED':
      return 'bg-slate-100 text-slate-600 border-slate-200'
    default:
      return 'bg-gray-100 text-gray-600 border-gray-200'
  }
}

const AdminDashboard = () => {
  const navigate = useNavigate()

  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [dashboardError, setDashboardError] = useState('')
  const [transactionsError, setTransactionsError] = useState('')

  const fetchDashboard = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    setDashboardError('')
    setTransactionsError('')

    const [dashboardResult, transactionsResult] = await Promise.allSettled([
      api.get('/admin/dashboard'),
      api.get('/admin/transactions', {
        params: {
          page: 1,
          limit: 5,
        },
      }),
    ])

    if (dashboardResult.status === 'fulfilled') {
      setDashboard(dashboardResult.value.data.dashboard)
    } else {
      setDashboardError(
        'Unable to load dashboard statistics. Please try again.',
      )
    }

    if (transactionsResult.status === 'fulfilled') {
      const response = transactionsResult.value.data
      const transactionData =
        response.transactions ||
        response.data?.transactions ||
        response.data ||
        []

      setTransactions(Array.isArray(transactionData) ? transactionData : [])
    } else {
      setTransactionsError('Unable to load recent transactions.')
    }

    setLoading(false)
    setRefreshing(false)
  }, [])

  useEffect(() => {
    fetchDashboard()
  }, [fetchDashboard])

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout')
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      navigate('/login')
    }
  }

  const transactionStats = dashboard?.transactions

  const statusItems = [
    {
      label: 'Completed',
      value: transactionStats?.completed || 0,
      color: 'bg-green-500',
      icon: CheckCircle2,
      textColor: 'text-green-700',
    },
    {
      label: 'Pending',
      value: transactionStats?.pending || 0,
      color: 'bg-amber-400',
      icon: Clock3,
      textColor: 'text-amber-700',
    },
    {
      label: 'Failed',
      value: transactionStats?.failed || 0,
      color: 'bg-red-400',
      icon: XCircle,
      textColor: 'text-red-700',
    },
    {
      label: 'Reversed',
      value: transactionStats?.reversed || 0,
      color: 'bg-slate-400',
      icon: RefreshCw,
      textColor: 'text-slate-600',
    },
  ]

  const totalStatusTransactions =
    (transactionStats?.completed || 0) +
    (transactionStats?.pending || 0) +
    (transactionStats?.failed || 0) +
    (transactionStats?.reversed || 0)

  const activityBreakdown = [
    {
      label: 'Customer initiated',
      description: 'Transactions linked to customer accounts',
      data: transactionStats?.customerInitiated,
      icon: Users,
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-600',
    },
    {
      label: 'Internal system',
      description: 'System-initiated transactions, including seed activity',
      data: transactionStats?.internalSystem,
      icon: ShieldCheck,
      iconBg: 'bg-purple-50',
      iconColor: 'text-purple-600',
    },
    {
      label: 'Unattributed legacy',
      description: 'Initiator reference unavailable or unverified',
      data: transactionStats?.unattributed,
      icon: Activity,
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-700',
    },
  ]

  const statCards = [
    {
      title: 'Total Customers',
      value: dashboard?.customers.total ?? 0,
      icon: Users,
      description: `${dashboard?.customers.admins ?? 0} administrators`,
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-600',
    },
    {
      title: 'Total Accounts',
      value: dashboard?.accounts.total ?? 0,
      icon: Wallet,
      description: 'Registered user accounts',
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-700',
    },
    {
      title: 'Total Transactions',
      value: transactionStats?.total ?? 0,
      icon: Activity,
      description: 'All platform transactions',
      iconBg: 'bg-purple-50',
      iconColor: 'text-purple-600',
    },
    {
      title: 'Completed Volume',
      value: formatCurrency(transactionStats?.completedVolume ?? 0),
      icon: CreditCard,
      description: 'Total completed platform amount',
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-700',
      isCurrency: true,
    },
  ]

  return (
    <div className="min-h-screen bg-[#F6F9F6] text-[#24352C]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[250px] flex-col border-r border-[#E1EAE3] bg-white lg:flex">
        <div className="flex h-[82px] items-center gap-3 border-b border-[#E8EEE9] px-7">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#176B52] text-white">
            <ShieldCheck size={22} />
          </div>

          <div>
            <h1 className="text-[19px] font-bold tracking-tight text-[#176B52]">
              Backend Ledger
            </h1>
            <p className="text-[10px] font-semibold uppercase tracking-[1.7px] text-[#829087]">
              Admin Console
            </p>
          </div>
        </div>

        <div className="px-5 pt-8">
          <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[1.5px] text-[#A0AAA3]">
            Workspace
          </p>

          <nav className="space-y-1.5">
            <Link
              to="/admin/dashboard"
              className="flex items-center gap-3 rounded-xl bg-[#EAF3EE] px-4 py-3 text-sm font-semibold text-[#176B52]"
            >
              <LayoutDashboard size={19} />
              Dashboard
            </Link>

            <Link
              to="/admin/transactions"
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-[#758179] transition hover:bg-[#F3F7F4] hover:text-[#176B52]"
            >
              <Activity size={19} />
              Transactions
            </Link>

            <Link
              to="/admin/users"
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-[#758179] transition hover:bg-[#F3F7F4] hover:text-[#176B52]"
            >
              <Users size={19} />
              Users
            </Link>

            <Link
              to="/admin/accounts"
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-[#758179] transition hover:bg-[#F3F7F4] hover:text-[#176B52]"
            >
              <Wallet size={19} />
              Accounts
            </Link>
          </nav>
        </div>

        <div className="mt-auto border-t border-[#E8EEE9] p-5">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl border border-[#E2ECE5] bg-[#F5F9F6] px-4 py-3 text-left transition hover:border-[#C8DDD0] hover:bg-[#EAF3EE]"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#E4EFE8] text-[#176B52]">
              <LogOut size={17} />
            </div>

            <div>
              <p className="text-sm font-semibold text-[#176B52]">Sign out</p>
              <p className="text-[11px] text-[#829087]">End your session</p>
            </div>
          </button>
        </div>
      </aside>

      <main className="min-h-screen lg:ml-[250px]">
        <header className="sticky top-0 z-20 flex h-[82px] items-center justify-between border-b border-[#E1EAE3] bg-white/95 px-5 backdrop-blur-md sm:px-8 lg:px-10">
          <div>
            <p className="text-xs font-medium text-[#829087]">
              Backend Ledger / Admin
            </p>
            <h2 className="mt-1 text-xl font-bold tracking-tight text-[#26382E]">
              Dashboard Overview
            </h2>
          </div>

          <div className="flex items-center gap-3 border-l border-[#E5ECE6] pl-3 sm:gap-5 sm:pl-5">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-[#26382E]">
                Administrator
              </p>
              <p className="text-[11px] text-[#829087]">
                Platform Management
              </p>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#E4EFE8] text-sm font-bold text-[#176B52] ring-2 ring-[#F2F7F3]">
              A
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-[1500px] space-y-7 px-5 py-8 sm:px-8 lg:px-10">
          <section className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-medium text-[#829087]">
                Platform administration
              </p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#26382E] sm:text-[28px]">
                Welcome back, Admin
              </h1>
              <p className="mt-1 text-sm text-[#829087]">
                Monitor your platform activity and transaction performance.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 self-start sm:self-center">
              <button
                onClick={() => fetchDashboard(true)}
                disabled={refreshing}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#DCE9E0] bg-white px-4 text-sm font-semibold text-[#176B52] shadow-sm transition hover:border-[#BFD8C8] hover:bg-[#F0F6F2] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw
                  size={16}
                  className={refreshing ? 'animate-spin' : ''}
                />
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </button>

              <div className="flex h-10 items-center gap-2 rounded-full border border-[#DCE9E0] bg-white px-3">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                <span className="text-xs font-semibold text-[#537260]">
                  Admin overview
                </span>
              </div>
            </div>
          </section>

          {dashboardError && (
            <div className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-red-700">{dashboardError}</p>
              <button
                onClick={() => fetchDashboard(true)}
                className="text-sm font-semibold text-red-700 underline"
              >
                Try again
              </button>
            </div>
          )}

          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {statCards.map((card) => {
              const Icon = card.icon

              return (
                <div
                  key={card.title}
                  className="rounded-2xl border border-[#E2EBE4] bg-white p-5 shadow-[0_2px_10px_rgba(25,65,43,0.025)] transition hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(25,65,43,0.06)]"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-[#829087]">
                      {card.title}
                    </p>
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-xl ${card.iconBg} ${card.iconColor}`}
                    >
                      <Icon size={20} />
                    </div>
                  </div>

                  {loading ? (
                    <div className="mt-5 h-8 w-32 animate-pulse rounded-lg bg-[#EDF2EE]" />
                  ) : (
                    <p
                      className={`mt-4 font-bold tracking-tight text-[#26382E] ${
                        card.isCurrency
                          ? 'text-[22px] sm:text-[25px]'
                          : 'text-[30px]'
                      }`}
                    >
                      {card.value}
                    </p>
                  )}

                  <p className="mt-2 text-xs text-[#9AA49D]">
                    {card.description}
                  </p>
                </div>
              )
            })}
          </section>

          <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.35fr_1fr]">
            <div className="rounded-2xl border border-[#E2EBE4] bg-white p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-[#26382E]">
                    Transaction Overview
                  </h3>
                  <p className="mt-1 text-xs text-[#929D95]">
                    Distribution by transaction status
                  </p>
                </div>

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EAF3EE] text-[#176B52]">
                  <Activity size={20} />
                </div>
              </div>

              <div className="mt-7 space-y-6">
                {statusItems.map((item) => {
                  const percentage =
                    totalStatusTransactions > 0
                      ? (item.value / totalStatusTransactions) * 100
                      : 0

                  const Icon = item.icon

                  return (
                    <div key={item.label}>
                      <div className="mb-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Icon size={16} className={item.textColor} />
                          <span className="text-sm font-medium text-[#66746A]">
                            {item.label}
                          </span>
                        </div>

                        <span className="text-sm font-bold text-[#34473A]">
                          {loading ? '—' : item.value.toLocaleString('en-IN')}
                        </span>
                      </div>

                      <div className="h-2.5 overflow-hidden rounded-full bg-[#EEF2EF]">
                        <div
                          className={`h-full rounded-full ${item.color} transition-all duration-500`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="mt-7 flex items-center justify-between border-t border-[#EDF1ED] pt-5">
                <span className="text-xs font-medium text-[#829087]">
                  Total transactions
                </span>
                <span className="text-sm font-bold text-[#26382E]">
                  {loading
                    ? '—'
                    : (transactionStats?.total ?? 0).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-[#E2EBE4] bg-white p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-[#26382E]">
                    Platform Summary
                  </h3>
                  <p className="mt-1 text-xs text-[#929D95]">
                    Current platform statistics
                  </p>
                </div>

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EAF3EE] text-[#176B52]">
                  <Building2 size={20} />
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <div className="flex items-center justify-between rounded-xl bg-[#F7FAF7] p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                      <Users size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#435348]">
                        Customers
                      </p>
                      <p className="text-[11px] text-[#9AA49D]">
                        Registered users
                      </p>
                    </div>
                  </div>
                  <span className="text-lg font-bold text-[#26382E]">
                    {loading ? '—' : dashboard?.customers.total ?? 0}
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-xl bg-[#F7FAF7] p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                      <Wallet size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#435348]">
                        Accounts
                      </p>
                      <p className="text-[11px] text-[#9AA49D]">
                        Total user accounts
                      </p>
                    </div>
                  </div>
                  <span className="text-lg font-bold text-[#26382E]">
                    {loading ? '—' : dashboard?.accounts.total ?? 0}
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-xl bg-[#F7FAF7] p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
                      <ShieldCheck size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#435348]">
                        Administrators
                      </p>
                      <p className="text-[11px] text-[#9AA49D]">
                        Platform admins
                      </p>
                    </div>
                  </div>
                  <span className="text-lg font-bold text-[#26382E]">
                    {loading ? '—' : dashboard?.customers.admins ?? 0}
                  </span>
                </div>
              </div>

              <div className="mt-5 rounded-xl border border-[#DCE9E0] bg-[#EAF3EE] p-4">
                <p className="text-xs font-semibold text-[#537260]">
                  Total completed platform volume
                </p>
                <p className="mt-1 text-2xl font-bold text-[#176B52]">
                  {loading
                    ? '—'
                    : formatCurrency(transactionStats?.completedVolume ?? 0)}
                </p>
                <p className="mt-1 text-[11px] text-[#6F8A79]">
                  Includes customer, internal system, and unattributed legacy
                  activity
                </p>
              </div>

              <div className="mt-6 border-t border-[#EDF1ED] pt-5">
                <div className="mb-4">
                  <h4 className="text-sm font-bold text-[#34473A]">
                    Completed transaction breakdown
                  </h4>
                  <p className="mt-1 text-[11px] text-[#929D95]">
                    Classified using transaction initiator records
                  </p>
                </div>

                <div className="space-y-3">
                  {activityBreakdown.map((item) => {
                    const Icon = item.icon

                    return (
                      <div
                        key={item.label}
                        className="rounded-xl border border-[#EDF1ED] p-3.5"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-2.5">
                            <div
                              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${item.iconBg} ${item.iconColor}`}
                            >
                              <Icon size={17} />
                            </div>

                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-[#435348]">
                                {item.label}
                              </p>
                              <p className="mt-0.5 text-[10px] leading-4 text-[#9AA49D]">
                                {item.description}
                              </p>
                            </div>
                          </div>

                          <div className="shrink-0 text-right">
                            <p className="text-sm font-bold text-[#26382E]">
                              {loading
                                ? '—'
                                : formatCurrency(item.data?.volume ?? 0)}
                            </p>
                            <p className="mt-0.5 text-[10px] text-[#929D95]">
                              {loading
                                ? '—'
                                : `${item.data?.count ?? 0} transactions`}
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                <p className="mt-3 text-[10px] leading-4 text-[#929D95]">
                  Unattributed transactions are retained in total platform
                  volume but cannot be confidently assigned to a customer or
                  internal system initiator.
                </p>
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-[#E2EBE4] bg-white">
            <div className="flex flex-col gap-3 border-b border-[#E9EFEA] px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-base font-bold text-[#26382E]">
                  Recent Transactions
                </h3>
                <p className="mt-1 text-xs text-[#929D95]">
                  Latest activity across the platform
                </p>
              </div>

              <Link
                to="/admin/transactions"
                className="inline-flex items-center gap-2 self-start rounded-lg bg-[#EAF3EE] px-4 py-2.5 text-xs font-bold text-[#176B52] transition hover:bg-[#DCECE1]"
              >
                View all transactions
                <ArrowUpRight size={15} />
              </Link>
            </div>

            {transactionsError && (
              <div className="m-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {transactionsError}
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left">
                <thead>
                  <tr className="bg-[#F8FAF8] text-[11px] font-bold uppercase tracking-wider text-[#929D95]">
                    <th className="px-6 py-4">Transaction</th>
                    <th className="px-6 py-4">Type</th>
                    <th className="px-6 py-4">Amount</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Status</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#EEF2EE]">
                  {loading ? (
                    Array.from({ length: 5 }).map((_, index) => (
                      <tr key={index}>
                        {Array.from({ length: 5 }).map((__, cellIndex) => (
                          <td className="px-6 py-5" key={cellIndex}>
                            <div className="h-4 w-24 animate-pulse rounded bg-[#EDF2EE]" />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : transactions.length > 0 ? (
                    transactions.map((transaction) => (
                      <tr
                        key={transaction._id}
                        className="transition hover:bg-[#FAFCFA]"
                      >
                        <td className="px-6 py-4">
                          <p className="text-sm font-semibold text-[#34473A]">
                            {transaction.transactionId ||
                              transaction._id.slice(-10).toUpperCase()}
                          </p>
                          <p className="mt-1 text-[11px] text-[#9AA49D]">
                            {transaction.sender?.name ||
                              transaction.sender?.email ||
                              'Platform transaction'}
                          </p>
                        </td>

                        <td className="px-6 py-4">
                          <span className="text-xs font-semibold capitalize text-[#66746A]">
                            {transaction.type?.replace(/_/g, ' ') || 'Transfer'}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <span className="text-sm font-bold text-[#34473A]">
                            {formatCurrency(transaction.amount)}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <span className="text-xs text-[#829087]">
                            {formatDate(transaction.createdAt)}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wide ${getStatusStyle(
                              transaction.status,
                            )}`}
                          >
                            {transaction.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-12 text-center text-sm text-[#929D95]"
                      >
                        No recent transactions found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between border-t border-[#E9EFEA] px-6 py-4">
              <p className="text-xs text-[#929D95]">
                Showing latest {transactions.length} transactions
              </p>

              <Link
                to="/admin/transactions"
                className="text-xs font-bold text-[#176B52] hover:underline"
              >
                Open transaction management
              </Link>
            </div>
          </section>

          <footer className="flex flex-col items-center justify-between gap-2 border-t border-[#E4EBE5] py-5 text-xs text-[#9AA49D] sm:flex-row">
            <p>Backend Ledger · Admin Console</p>
            <p>Secure financial management platform</p>
          </footer>
        </div>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-30 flex border-t border-[#DCE9E0] bg-white px-3 py-3 shadow-[0_-4px_15px_rgba(25,65,43,0.05)] lg:hidden">
        <Link
          to="/admin/dashboard"
          className="flex flex-1 flex-col items-center gap-1 text-[#176B52]"
        >
          <LayoutDashboard size={20} />
          <span className="text-[10px] font-semibold">Dashboard</span>
        </Link>

        <Link
          to="/admin/transactions"
          className="flex flex-1 flex-col items-center gap-1 text-[#829087]"
        >
          <Activity size={20} />
          <span className="text-[10px] font-semibold">Transactions</span>
        </Link>

        <Link
          to="/admin/users"
          className="flex flex-1 flex-col items-center gap-1 text-[#829087]"
        >
          <Users size={20} />
          <span className="text-[10px] font-semibold">Users</span>
        </Link>

        <Link
          to="/admin/accounts"
          className="flex flex-1 flex-col items-center gap-1 text-[#829087]"
        >
          <Wallet size={20} />
          <span className="text-[10px] font-semibold">Accounts</span>
        </Link>

        <button
          onClick={handleLogout}
          className="flex flex-1 flex-col items-center gap-1 text-[#176B52]"
        >
          <LogOut size={20} />
          <span className="text-[10px] font-semibold">Sign out</span>
        </button>
      </div>
    </div>
  )
}

export default AdminDashboard