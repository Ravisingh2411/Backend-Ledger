import { useCallback, useEffect, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import {
  Activity,
  ArrowDownLeft,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  ReceiptText,
  Search,
  ShieldCheck,
  Users,
  Wallet,
  X,
} from 'lucide-react'
import { useAuth } from '../context/useAuth'
import api from '../services/api'

interface TransactionParty {
  _id?: string
  name?: string
  email?: string
  accountNumber?: string
  accountType?: string
}

interface AdminTransaction {
  _id: string
  amount: number
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REVERSED'
  createdAt: string
  updatedAt?: string
  sender?: TransactionParty | null
  receiver?: TransactionParty | null
  initiatedBy?: {
    _id?: string
    name?: string
    email?: string
  } | null
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

interface TransactionResponse {
  transactions: AdminTransaction[]
  pagination: Pagination
}

const emptyPagination: Pagination = {
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 0,
  hasNextPage: false,
  hasPreviousPage: false,
}

const statusStyles: Record<string, string> = {
  COMPLETED: 'bg-emerald-50 text-emerald-700',
  PENDING: 'bg-amber-50 text-amber-700',
  FAILED: 'bg-red-50 text-red-700',
  REVERSED: 'bg-gray-100 text-gray-600',
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount)
}

function formatDate(date: string) {
  const parsedDate = new Date(date)

  if (Number.isNaN(parsedDate.getTime())) {
    return 'Date unavailable'
  }

  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsedDate)
}

function getPartyName(party?: TransactionParty | null) {
  return party?.name || party?.email || party?._id || 'System'
}

function getPartyAccount(party?: TransactionParty | null) {
  return party?.accountNumber || party?._id || '—'
}

function getErrorMessage(err: unknown, fallback: string) {
  const message = (
    err as { response?: { data?: { message?: string } } }
  )?.response?.data?.message

  return message || fallback
}

function AdminTransactions() {
  const { user, logout } = useAuth()

  const [transactions, setTransactions] = useState<AdminTransaction[]>([])
  const [pagination, setPagination] = useState<Pagination>(emptyPagination)

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [page, setPage] = useState(1)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [selectedTransaction, setSelectedTransaction] =
    useState<AdminTransaction | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const fetchTransactions = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const params: Record<string, string | number> = {
        page,
        limit: 10,
      }

      if (search.trim()) params.search = search.trim()
      if (status) params.status = status
      if (startDate) params.startDate = startDate
      if (endDate) params.endDate = endDate

      const response = await api.get<TransactionResponse>(
        '/admin/transactions',
        { params }
      )

      setTransactions(response.data.transactions || [])
      setPagination(response.data.pagination || emptyPagination)
    } catch (err: unknown) {
      setError(
        getErrorMessage(err, 'Unable to load transactions. Please try again.')
      )
      setTransactions([])
    } finally {
      setLoading(false)
    }
  }, [page, search, status, startDate, endDate])

  useEffect(() => {
    void fetchTransactions()
  }, [fetchTransactions])

  const openDetails = async (transactionId: string) => {
    setSelectedTransaction(null)
    setDetailLoading(true)
    setError('')

    try {
      const response = await api.get<{ transaction: AdminTransaction }>(
        `/admin/transactions/${transactionId}`
      )

      setSelectedTransaction(response.data.transaction)
    } catch (err: unknown) {
      setError(
        getErrorMessage(err, 'Unable to load transaction details.')
      )
    } finally {
      setDetailLoading(false)
    }
  }

  const clearFilters = () => {
    setSearch('')
    setStatus('')
    setStartDate('')
    setEndDate('')
    setPage(1)
  }

  const navItemClasses = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition ${
      isActive
        ? 'bg-[#EAF3EE] font-semibold text-[#176B52]'
        : 'font-medium text-[#65736B] hover:bg-[#F4F6F3]'
    }`

  const inputClasses =
    'h-11 w-full min-w-0 rounded-xl border border-[#DCE4DD] bg-white px-3 text-sm text-[#405047] outline-none transition focus:border-[#176B52] focus:ring-2 focus:ring-[#176B52]/10'

  return (
    <div className="min-h-screen bg-[#F4F6F3] text-[#17211F]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden h-screen w-[250px] flex-col border-r border-[#E5EAE5] bg-white px-5 py-7 lg:flex">
        <Link to="/admin/dashboard" className="flex items-center gap-3 px-2">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#176B52] text-white">
            <Wallet size={23} />
          </div>

          <div>
            <h1 className="text-[17px] font-bold tracking-tight">
              Backend Ledger
            </h1>
            <p className="text-xs text-[#829087]">
              Financial workspace
            </p>
          </div>
        </Link>

        <div className="mt-12">
          <p className="mb-4 px-3 text-[10px] font-bold tracking-[0.16em] text-[#9AA69E]">
            ADMINISTRATION
          </p>

          <nav className="space-y-1">
            <NavLink to="/admin/dashboard" className={navItemClasses}>
              <LayoutDashboard size={18} />
              Dashboard
            </NavLink>

            <NavLink to="/admin/transactions" className={navItemClasses}>
              <ReceiptText size={18} />
              Transactions
            </NavLink>

            <NavLink to="/admin/users" className={navItemClasses}>
              <Users size={18} />
              Users
            </NavLink>

            <NavLink to="/admin/accounts" className={navItemClasses}>
              <Wallet size={18} />
              Accounts
            </NavLink>
          </nav>
        </div>

        <div className="mt-auto space-y-4">
          <div className="rounded-2xl bg-[#F1F5F1] p-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <ShieldCheck size={17} className="text-[#176B52]" />
              Admin workspace
            </div>

            <p className="mt-2 text-xs leading-5 text-[#738078]">
              Monitor platform accounts and transaction activity.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void logout()}
            className="group flex w-full items-center gap-3 rounded-xl border border-[#DCE9E0] bg-[#F5F9F6] px-3 py-3 text-left transition-all duration-200 hover:border-[#B9D2C1] hover:bg-[#EAF3EE] hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-[#176B52]/20 focus:ring-offset-2"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E4EFE8] text-[#176B52] transition-colors duration-200 group-hover:bg-[#D5E8DA]">
              <LogOut size={18} strokeWidth={2} />
            </span>

            <span className="flex min-w-0 flex-col">
              <span className="text-sm font-semibold text-[#176B52]">
                Sign out
              </span>
              <span className="mt-0.5 text-[11px] text-[#829087]">
                End your session
              </span>
            </span>
          </button>
        </div>
      </aside>

      <main className="min-w-0 lg:ml-[250px]">
        <header className="sticky top-0 z-20 flex h-[73px] items-center justify-between border-b border-[#E5EAE5] bg-white/95 px-5 backdrop-blur sm:px-8 lg:px-10">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#176B52] text-white lg:hidden">
              <Wallet size={21} />
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-[#17211F]">
                Backend Ledger
              </p>
              <p className="truncate text-xs text-[#829087]">
                Administration workspace
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <div className="hidden min-w-0 text-right sm:block">
              <p className="max-w-[180px] truncate text-sm font-semibold text-[#17211F]">
                {user?.name || 'Admin'}
              </p>
              <p className="max-w-[180px] truncate text-xs text-[#829087]">
                {user?.email}
              </p>
            </div>

            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#E4EFE8] text-sm font-bold text-[#176B52]">
              {user?.name?.charAt(0).toUpperCase() || 'A'}
            </div>
          </div>
        </header>

        <nav className="flex items-center gap-2 overflow-x-auto border-b border-[#E5EAE5] bg-white px-5 py-3 lg:hidden">
          <NavLink
            to="/admin/dashboard"
            className={({ isActive }) =>
              `inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                isActive
                  ? 'bg-[#EAF3EE] text-[#176B52]'
                  : 'text-[#65736B] hover:bg-[#F4F6F3]'
              }`
            }
          >
            <LayoutDashboard size={16} />
            Dashboard
          </NavLink>

          <NavLink
            to="/admin/transactions"
            className={({ isActive }) =>
              `inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                isActive
                  ? 'bg-[#EAF3EE] text-[#176B52]'
                  : 'text-[#65736B] hover:bg-[#F4F6F3]'
              }`
            }
          >
            <ReceiptText size={16} />
            Transactions
          </NavLink>

          <NavLink
            to="/admin/users"
            className={({ isActive }) =>
              `inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                isActive
                  ? 'bg-[#EAF3EE] text-[#176B52]'
                  : 'text-[#65736B] hover:bg-[#F4F6F3]'
              }`
            }
          >
            <Users size={16} />
            Users
          </NavLink>

          <NavLink
            to="/admin/accounts"
            className={({ isActive }) =>
              `inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                isActive
                  ? 'bg-[#EAF3EE] text-[#176B52]'
                  : 'text-[#65736B] hover:bg-[#F4F6F3]'
              }`
            }
          >
            <Wallet size={16} />
            Accounts
          </NavLink>
        </nav>

        <div className="mx-auto max-w-[1440px] space-y-7 px-5 py-7 sm:px-8 sm:py-9 lg:px-10">
          <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-semibold text-[#176B52]">
                ADMINISTRATION
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
                Transactions
              </h2>
              <p className="mt-2 text-sm text-[#718078]">
                Monitor and inspect transaction activity across the platform.
              </p>
            </div>

            <div className="flex items-center gap-2 self-start rounded-full border border-[#DCE9E0] bg-white px-3 py-2 sm:self-auto">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-xs font-semibold text-[#537260]">
                All transactions
              </span>
            </div>
          </section>

          {error && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              <Activity size={18} className="mt-0.5 shrink-0" />
              <span>{error}</span>
              <button
                onClick={() => setError('')}
                className="ml-auto rounded-md p-1 hover:bg-red-100"
                aria-label="Dismiss error"
              >
                <X size={16} />
              </button>
            </div>
          )}

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-2xl bg-[#176B52] p-6 text-white shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-white/75">
                  Matching transactions
                </p>
                <ReceiptText size={21} className="text-white/80" />
              </div>
              <p className="mt-5 text-3xl font-bold">
                {loading ? '—' : pagination.total.toLocaleString('en-IN')}
              </p>
              <p className="mt-2 text-xs text-white/75">
                Based on current filters
              </p>
            </div>

            <div className="rounded-2xl border border-[#E4EAE4] bg-white p-6">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-[#718078]">
                  Current page
                </p>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EFF3F0] text-[#176B52]">
                  <LayoutDashboard size={20} />
                </div>
              </div>
              <p className="mt-5 text-3xl font-bold">
                {pagination.page}
                <span className="ml-2 text-lg text-[#9AA69E]">
                  / {pagination.totalPages || 1}
                </span>
              </p>
              <p className="mt-2 text-xs text-[#829087]">
                Transaction pages
              </p>
            </div>

            <div className="rounded-2xl border border-[#E4EAE4] bg-white p-6">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-[#718078]">
                  Records per page
                </p>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EAF3EE] text-[#176B52]">
                  <Wallet size={20} />
                </div>
              </div>
              <p className="mt-5 text-3xl font-bold">10</p>
              <p className="mt-2 text-xs text-[#829087]">
                Records displayed at a time
              </p>
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-[#E4EAE4] bg-white">
            <div className="flex flex-col justify-between gap-3 border-b border-[#EDF0ED] p-5 sm:flex-row sm:items-center">
              <div>
                <h3 className="font-bold">All transactions</h3>
                <p className="mt-1 text-sm text-[#829087]">
                  Search, filter and review platform transactions.
                </p>
              </div>
              <span className="inline-flex w-fit items-center gap-2 rounded-lg bg-[#EAF3EE] px-3 py-2 text-xs font-semibold text-[#176B52]">
                <ShieldCheck size={15} />
                Read-only access
              </span>
            </div>

            <div className="grid grid-cols-1 items-end gap-4 border-b border-[#EDF0ED] p-5 sm:grid-cols-2 xl:grid-cols-[1.5fr_1fr_1fr_1fr_auto]">
              <div className="min-w-0">
                <label className="mb-2 block text-xs font-semibold text-[#65736B]">
                  Search
                </label>
                <div className="relative">
                  <Search
                    size={17}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9AA69E]"
                  />
                  <input
                    type="search"
                    value={search}
                    onChange={(event) => {
                      setSearch(event.target.value)
                      setPage(1)
                    }}
                    placeholder="Search transactions..."
                    className={`${inputClasses} pl-10`}
                  />
                </div>
              </div>

              <div className="min-w-0">
                <label
                  htmlFor="admin-status"
                  className="mb-2 block text-xs font-semibold text-[#65736B]"
                >
                  Status
                </label>
                <select
                  id="admin-status"
                  value={status}
                  onChange={(event) => {
                    setStatus(event.target.value)
                    setPage(1)
                  }}
                  className={inputClasses}
                  aria-label="Filter by transaction status"
                >
                  <option value="">All statuses</option>
                  <option value="PENDING">Pending</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="FAILED">Failed</option>
                  <option value="REVERSED">Reversed</option>
                </select>
              </div>

              <div className="min-w-0">
                <label
                  htmlFor="admin-start-date"
                  className="mb-2 block text-xs font-semibold text-[#65736B]"
                >
                  From date
                </label>
                <input
                  id="admin-start-date"
                  type="date"
                  value={startDate}
                  max={endDate || undefined}
                  onChange={(event) => {
                    setStartDate(event.target.value)
                    setPage(1)
                  }}
                  className={`${inputClasses} cursor-pointer [color-scheme:light]`}
                />
              </div>

              <div className="min-w-0">
                <label
                  htmlFor="admin-end-date"
                  className="mb-2 block text-xs font-semibold text-[#65736B]"
                >
                  To date
                </label>
                <input
                  id="admin-end-date"
                  type="date"
                  value={endDate}
                  min={startDate || undefined}
                  onChange={(event) => {
                    setEndDate(event.target.value)
                    setPage(1)
                  }}
                  className={`${inputClasses} cursor-pointer [color-scheme:light]`}
                />
              </div>

              <div className="min-w-0">
                <label className="mb-2 block text-xs font-semibold text-transparent">
                  Actions
                </label>
                <button
                  onClick={clearFilters}
                  className="h-11 w-full whitespace-nowrap rounded-xl border border-[#DCE4DD] bg-white px-4 text-sm font-semibold text-[#65736B] transition hover:bg-[#F4F6F3] hover:text-[#176B52] xl:w-auto"
                >
                  Clear filters
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between px-5 py-3">
              <p className="text-xs text-[#829087]">
                {loading
                  ? 'Updating transaction records...'
                  : `${transactions.length} records on this page`}
              </p>
              <p className="text-xs text-[#829087]">
                {pagination.total.toLocaleString('en-IN')} total
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[950px] table-auto text-left text-sm">
                <thead className="bg-[#F7F9F7] text-[11px] uppercase tracking-wider text-[#829087]">
                  <tr>
                    <th className="whitespace-nowrap px-5 py-4 font-semibold">
                      Transaction
                    </th>
                    <th className="whitespace-nowrap px-5 py-4 font-semibold">
                      Date
                    </th>
                    <th className="whitespace-nowrap px-5 py-4 font-semibold">
                      Sender
                    </th>
                    <th className="whitespace-nowrap px-5 py-4 font-semibold">
                      Receiver
                    </th>
                    <th className="whitespace-nowrap px-5 py-4 font-semibold">
                      Amount
                    </th>
                    <th className="whitespace-nowrap px-5 py-4 font-semibold">
                      Status
                    </th>
                    <th className="whitespace-nowrap px-5 py-4 text-right font-semibold">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#EDF0ED]">
                  {loading ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-5 py-16 text-center text-sm text-[#829087]"
                      >
                        Loading transactions...
                      </td>
                    </tr>
                  ) : transactions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-16 text-center">
                        <ReceiptText
                          size={30}
                          className="mx-auto text-[#A0AAA3]"
                        />
                        <p className="mt-3 text-sm font-semibold">
                          No transactions found
                        </p>
                        <p className="mt-1 text-xs text-[#829087]">
                          Try changing your search or filters.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    transactions.map((transaction) => (
                      <tr
                        key={transaction._id}
                        className="transition hover:bg-[#FAFCFA]"
                      >
                        <td className="px-5 py-4">
                          <p className="font-mono text-xs font-semibold text-[#405047]">
                            {transaction._id.slice(-10).toUpperCase()}
                          </p>
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-xs text-[#718078]">
                          {formatDate(transaction.createdAt)}
                        </td>

                        <td className="px-5 py-4">
                          <p className="font-semibold text-[#17211F]">
                            {getPartyName(transaction.sender)}
                          </p>
                          <p className="mt-1 text-xs text-[#829087]">
                            {getPartyAccount(transaction.sender)}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <p className="font-semibold text-[#17211F]">
                            {getPartyName(transaction.receiver)}
                          </p>
                          <p className="mt-1 text-xs text-[#829087]">
                            {getPartyAccount(transaction.receiver)}
                          </p>
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-right font-bold tabular-nums text-[#17211F]">
                          {formatCurrency(transaction.amount)}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`whitespace-nowrap rounded-full px-3 py-1 text-[10px] font-bold ${statusStyles[transaction.status] || statusStyles.PENDING}`}
                          >
                            {transaction.status}
                          </span>
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-right">
                          <button
                            onClick={() => void openDetails(transaction._id)}
                            className="rounded-lg border border-[#DCE4DD] px-3 py-2 text-xs font-semibold text-[#176B52] transition hover:border-[#B9D2C1] hover:bg-[#EAF3EE]"
                          >
                            View details
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col items-center justify-between gap-3 border-t border-[#EDF0ED] px-5 py-4 sm:flex-row">
              <p className="text-xs text-[#829087]">
                Showing {transactions.length ? (page - 1) * 10 + 1 : 0}–
                {(page - 1) * 10 + transactions.length} of {pagination.total}
              </p>

              <div className="flex items-center gap-2">
                <button
                  disabled={!pagination.hasPreviousPage || loading}
                  onClick={() =>
                    setPage((current) => Math.max(1, current - 1))
                  }
                  className="inline-flex h-9 items-center gap-1 rounded-lg border border-[#DCE4DD] px-3 text-xs font-semibold text-[#65736B] transition hover:bg-[#F4F6F3] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft size={15} />
                  Previous
                </button>

                <span className="px-2 text-xs text-[#718078]">
                  Page {pagination.page} of {pagination.totalPages || 1}
                </span>

                <button
                  disabled={!pagination.hasNextPage || loading}
                  onClick={() => setPage((current) => current + 1)}
                  className="inline-flex h-9 items-center gap-1 rounded-lg border border-[#DCE4DD] px-3 text-xs font-semibold text-[#65736B] transition hover:bg-[#F4F6F3] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          </section>

          <footer className="flex flex-col justify-between gap-2 border-t border-[#E4EAE4] py-5 text-xs text-[#829087] sm:flex-row">
            <p>© 2026 Backend Ledger</p>
            <p className="flex items-center gap-2">
              <ShieldCheck size={14} />
              Secure administrative workspace
            </p>
          </footer>
        </div>
      </main>

      {(detailLoading || selectedTransaction) && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !detailLoading
            ) {
              setSelectedTransaction(null)
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="transaction-detail-title"
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[#E4EAE4] bg-white p-6 shadow-xl"
          >
            {detailLoading ? (
              <div className="py-16 text-center text-sm text-[#829087]">
                Loading transaction details...
              </div>
            ) : selectedTransaction ? (
              <>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold tracking-wider text-[#176B52]">
                      TRANSACTION DETAILS
                    </p>
                    <h2
                      id="transaction-detail-title"
                      className="mt-2 text-xl font-bold"
                    >
                      Transaction overview
                    </h2>
                    <p className="mt-1 break-all font-mono text-xs text-[#829087]">
                      {selectedTransaction._id}
                    </p>
                  </div>

                  <button
                    onClick={() => setSelectedTransaction(null)}
                    className="rounded-lg p-2 text-[#829087] transition hover:bg-[#F1F5F1] hover:text-[#17211F]"
                    aria-label="Close transaction details"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="mt-6 rounded-2xl bg-[#176B52] p-5 text-white">
                  <p className="text-sm text-white/75">
                    Transaction amount
                  </p>
                  <p className="mt-2 text-3xl font-bold">
                    {formatCurrency(selectedTransaction.amount)}
                  </p>
                  <span
                    className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-bold ${statusStyles[selectedTransaction.status] || statusStyles.PENDING}`}
                  >
                    {selectedTransaction.status}
                  </span>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-[#E4EAE4] p-4">
                    <div className="flex items-center gap-2 text-xs font-semibold text-[#829087]">
                      <ArrowUpRight size={15} />
                      SENDER
                    </div>
                    <p className="mt-3 font-semibold">
                      {getPartyName(selectedTransaction.sender)}
                    </p>
                    <p className="mt-1 break-all text-xs text-[#829087]">
                      {getPartyAccount(selectedTransaction.sender)}
                    </p>
                  </div>

                  <div className="rounded-xl border border-[#E4EAE4] p-4">
                    <div className="flex items-center gap-2 text-xs font-semibold text-[#829087]">
                      <ArrowDownLeft size={15} />
                      RECEIVER
                    </div>
                    <p className="mt-3 font-semibold">
                      {getPartyName(selectedTransaction.receiver)}
                    </p>
                    <p className="mt-1 break-all text-xs text-[#829087]">
                      {getPartyAccount(selectedTransaction.receiver)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 space-y-4 rounded-xl border border-[#E4EAE4] p-4 text-sm">
                  <div className="flex justify-between gap-4">
                    <span className="text-[#829087]">Initiated by</span>
                    <span className="text-right font-medium">
                      {selectedTransaction.initiatedBy?.name ||
                        selectedTransaction.initiatedBy?.email ||
                        'System'}
                    </span>
                  </div>

                  <div className="flex justify-between gap-4">
                    <span className="text-[#829087]">Created at</span>
                    <span className="text-right font-medium">
                      {formatDate(selectedTransaction.createdAt)}
                    </span>
                  </div>

                  {selectedTransaction.updatedAt && (
                    <div className="flex justify-between gap-4">
                      <span className="text-[#829087]">Last updated</span>
                      <span className="text-right font-medium">
                        {formatDate(selectedTransaction.updatedAt)}
                      </span>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setSelectedTransaction(null)}
                  className="mt-5 h-11 w-full rounded-xl bg-[#176B52] text-sm font-semibold text-white transition hover:bg-[#12543F]"
                >
                  Close details
                </button>
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminTransactions