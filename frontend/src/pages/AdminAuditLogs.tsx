import { useCallback, useEffect, useRef, useState } from 'react'
import { NavLink, Link, useLocation } from 'react-router-dom'
import {
  Activity,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  LayoutDashboard,
  Loader2,
  LogOut,
  RefreshCw,
  Search,
  ShieldCheck,
  UserRound,
  Wallet,
  X,
} from 'lucide-react'
import api from '../services/api'

interface AuditLog {
  _id: string
  adminName: string
  adminEmail: string
  action: string
  accountName: string
  targetAccount?: string | { _id: string; name?: string }
  targetUserName: string
  targetUserEmail: string
  previousStatus: string
  newStatus: string
  outcome: 'SUCCESS' | 'FAILED'
  statusCode: number
  description: string
  failureReason: string
  createdAt: string
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

const actionLabels: Record<string, string> = {
  ACCOUNT_FROZEN: 'Account Frozen',
  ACCOUNT_UNFROZEN: 'Account Unfrozen',
  ACCOUNT_CLOSED: 'Account Closed',
  ACCOUNT_STATUS_CHANGE: 'Account Status Change',
}

const formatDate = (date: string) =>
  new Date(date).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

const getAccountId = (account?: string | { _id: string; name?: string }) =>
  typeof account === 'string' ? account : account?._id || ''

const AdminAuditLogs = () => {
  const location = useLocation()
  const restoredPathRef = useRef<string | null>(null)

  const [logs, setLogs] = useState<AuditLog[]>([])
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  })

  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [actionInput, setActionInput] = useState('')
  const [action, setAction] = useState('')
  const [outcomeInput, setOutcomeInput] = useState('')
  const [outcome, setOutcome] = useState('')

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [loggingOut, setLoggingOut] = useState(false)

  const scrollStorageKey = `admin-scroll:${location.pathname}`

  useEffect(() => {
    const saveScrollPosition = () => {
      sessionStorage.setItem(scrollStorageKey, String(window.scrollY))
    }

    window.addEventListener('scroll', saveScrollPosition, { passive: true })

    return () => {
      saveScrollPosition()
      window.removeEventListener('scroll', saveScrollPosition)
    }
  }, [scrollStorageKey])

  useEffect(() => {
    if (loading || restoredPathRef.current === location.pathname) return

    restoredPathRef.current = location.pathname

    const savedPosition = sessionStorage.getItem(scrollStorageKey)
    const scrollY = savedPosition ? Number(savedPosition) : 0

    window.requestAnimationFrame(() => {
      window.scrollTo(0, Number.isFinite(scrollY) ? scrollY : 0)
    })
  }, [loading, location.pathname, scrollStorageKey])

  const fetchLogs = useCallback(
    async (page = 1, isRefresh = false) => {
      if (isRefresh) setRefreshing(true)
      else setLoading(true)

      setError('')

      try {
        const response = await api.get('/admin/audit-logs', {
          params: {
            page,
            limit: 10,
            search,
            action,
            outcome,
          },
        })

        setLogs(response.data.logs || [])
        setPagination(
          response.data.pagination || {
            page: 1,
            limit: 10,
            total: 0,
            totalPages: 0,
            hasNextPage: false,
            hasPreviousPage: false,
          },
        )
      } catch (err) {
        console.error('Audit logs fetch error:', err)
        setError('Unable to load audit logs. Please try again.')
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [search, action, outcome],
  )

  useEffect(() => {
    fetchLogs(1)
  }, [fetchLogs])

  const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSearch(searchInput.trim())
    setAction(actionInput)
    setOutcome(outcomeInput)
  }

  const handleSearchInputChange = (value: string) => {
    setSearchInput(value)

    if (!value.trim()) {
      setSearch('')
    }
  }

  const handleClearFilters = () => {
    setSearchInput('')
    setSearch('')
    setActionInput('')
    setAction('')
    setOutcomeInput('')
    setOutcome('')
  }

  const handleLogout = async () => {
    try {
      setLoggingOut(true)
      await api.post('/auth/logout')
      window.location.href = '/login'
    } catch {
      setLoggingOut(false)
      setError('Unable to sign out. Please try again.')
    }
  }

  const hasActiveFilters = Boolean(search || action || outcome)

  const getActionStyle = (value: string) => {
    if (value === 'ACCOUNT_FROZEN') {
      return 'bg-amber-50 text-amber-700 border-amber-200'
    }

    if (value === 'ACCOUNT_CLOSED') {
      return 'bg-red-50 text-red-700 border-red-200'
    }

    return 'bg-green-50 text-green-700 border-green-200'
  }

  const navClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition ${
      isActive
        ? 'bg-[#EAF3EE] font-semibold text-[#176B52]'
        : 'font-medium text-[#758179] hover:bg-[#F3F7F4] hover:text-[#176B52]'
    }`

  const mobileNavClass = ({ isActive }: { isActive: boolean }) =>
    `flex flex-1 flex-col items-center gap-1 ${
      isActive ? 'text-[#176B52]' : 'text-[#829087]'
    }`

  return (
    <div className="min-h-screen bg-[#F6F9F6] text-[#24352C]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[250px] flex-col border-r border-[#E1EAE3] bg-white lg:flex">
        <Link
          to="/admin/dashboard"
          className="flex h-[82px] items-center gap-3 border-b border-[#E8EEE9] px-7"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#176B52] text-white">
            <ShieldCheck size={22} />
          </div>
          <div>
            <h1 className="text-[19px] font-bold text-[#176B52]">
              Backend Ledger
            </h1>
            <p className="text-[10px] font-semibold uppercase tracking-[1.7px] text-[#829087]">
              Admin Console
            </p>
          </div>
        </Link>

        <nav className="space-y-1.5 px-5 pt-8">
          <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[1.5px] text-[#A0AAA3]">
            Workspace
          </p>

          <NavLink to="/admin/dashboard" end className={navClass}>
            <LayoutDashboard size={19} />
            Dashboard
          </NavLink>

          <NavLink to="/admin/transactions" className={navClass}>
            <Activity size={19} />
            Transactions
          </NavLink>

          <NavLink to="/admin/users" className={navClass}>
            <UserRound size={19} />
            Users
          </NavLink>

          <NavLink to="/admin/accounts" className={navClass}>
            <Wallet size={19} />
            Accounts
          </NavLink>

          <NavLink to="/admin/audit-logs" className={navClass}>
            <ClipboardList size={19} />
            Audit Logs
          </NavLink>
        </nav>

        <div className="mt-auto p-5">
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex w-full items-center gap-3 rounded-xl bg-[#F0F7F1] px-4 py-3 text-left transition hover:bg-[#E5F1E7] disabled:opacity-60"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#DCEFE0] text-[#176B52]">
              {loggingOut ? (
                <Loader2 size={17} className="animate-spin" />
              ) : (
                <LogOut size={17} />
              )}
            </span>
            <span>
              <span className="block text-sm font-bold text-[#176B52]">
                Sign out
              </span>
              <span className="block text-xs text-[#829487]">
                End your session
              </span>
            </span>
          </button>
        </div>
      </aside>

      <main className="min-h-screen pb-24 lg:ml-[250px] lg:pb-0">
        <header className="sticky top-0 z-20 flex h-[82px] items-center justify-between border-b border-[#E1EAE3] bg-white/95 px-5 backdrop-blur-md sm:px-8 lg:px-10">
          <div>
            <p className="text-xs font-medium text-[#829087]">
              Backend Ledger / Admin
            </p>
            <h2 className="mt-1 text-xl font-bold text-[#26382E]">
              Audit Logs
            </h2>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#E4EFE8] text-sm font-bold text-[#176B52] ring-2 ring-[#F2F7F3]">
            A
          </div>
        </header>

        <div className="mx-auto max-w-[1500px] space-y-6 px-5 py-8 sm:px-8 lg:px-10">
          <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <div className="flex items-center gap-2 text-[#176B52]">
                <ClipboardList size={20} />
                <span className="text-sm font-semibold">
                  Administrative activity history
                </span>
              </div>
              <h1 className="mt-2 text-2xl font-bold text-[#26382E]">
                Account Activity Trail
              </h1>
              <p className="mt-1 text-sm text-[#829087]">
                Track account status changes and their outcomes.
              </p>
            </div>

            <button
              onClick={() => fetchLogs(pagination.page, true)}
              disabled={refreshing || loading}
              className="inline-flex h-10 items-center justify-center gap-2 self-start rounded-xl border border-[#DCE9E0] bg-white px-4 text-sm font-semibold text-[#176B52] shadow-sm transition hover:bg-[#F0F6F2] disabled:opacity-60"
            >
              <RefreshCw
                size={16}
                className={refreshing ? 'animate-spin' : ''}
              />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </section>

          <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-[#E2EBE4] bg-white p-5">
              <p className="text-sm text-[#829087]">Total recorded events</p>
              <p className="mt-2 text-3xl font-bold text-[#26382E]">
                {pagination.total.toLocaleString('en-IN')}
              </p>
            </div>

            <div className="rounded-2xl border border-[#E2EBE4] bg-white p-5">
              <p className="text-sm text-[#829087]">Events on this page</p>
              <p className="mt-2 text-3xl font-bold text-[#176B52]">
                {logs.length}
              </p>
            </div>

            <div className="rounded-2xl border border-[#E2EBE4] bg-white p-5">
              <p className="text-sm text-[#829087]">Current page</p>
              <p className="mt-2 text-3xl font-bold text-[#26382E]">
                {pagination.page} / {Math.max(1, pagination.totalPages)}
              </p>
            </div>
          </section>

          <section className="rounded-2xl border border-[#E2EBE4] bg-white p-5 sm:p-6">
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(260px,1fr)_220px_190px]">
                <div className="relative">
                  <Search
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-[#929D95]"
                  />
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(event) =>
                      handleSearchInputChange(event.target.value)
                    }
                    placeholder="Search admin, account, user or account ID..."
                    className="h-12 w-full rounded-xl border border-[#DCE6DE] bg-[#FAFCFA] pl-11 pr-4 text-sm text-[#34473A] outline-none transition placeholder:text-[#A0AAA3] hover:border-[#B8D0C0] focus:border-[#176B52] focus:bg-white focus:ring-2 focus:ring-[#176B52]/10"
                  />
                </div>

                <select
                  value={actionInput}
                  onChange={(event) => setActionInput(event.target.value)}
                  className="h-12 rounded-xl border border-[#DCE6DE] bg-white px-4 text-sm text-[#526257] outline-none transition hover:border-[#B8D0C0] focus:border-[#176B52] focus:ring-2 focus:ring-[#176B52]/10"
                >
                  <option value="">All actions</option>
                  <option value="ACCOUNT_FROZEN">Account Frozen</option>
                  <option value="ACCOUNT_UNFROZEN">Account Unfrozen</option>
                  <option value="ACCOUNT_CLOSED">Account Closed</option>
                  <option value="ACCOUNT_STATUS_CHANGE">Status Change</option>
                </select>

                <select
                  value={outcomeInput}
                  onChange={(event) => setOutcomeInput(event.target.value)}
                  className="h-12 rounded-xl border border-[#DCE6DE] bg-white px-4 text-sm text-[#526257] outline-none transition hover:border-[#B8D0C0] focus:border-[#176B52] focus:ring-2 focus:ring-[#176B52]/10"
                >
                  <option value="">All outcomes</option>
                  <option value="SUCCESS">Successful</option>
                  <option value="FAILED">Failed</option>
                </select>
              </div>

              <div className="flex flex-col gap-3 border-t border-[#EEF2EE] pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-[#929D95]">
                  Search by administrator, account name, user email or account ID.
                </p>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={handleClearFilters}
                    disabled={
                      !searchInput &&
                      !search &&
                      !actionInput &&
                      !action &&
                      !outcomeInput &&
                      !outcome
                    }
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#DCE6DE] bg-white px-5 text-sm font-semibold text-[#66746A] transition hover:border-[#B8D0C0] hover:bg-[#F5F8F5] hover:text-[#176B52] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <X size={16} />
                    Clear filters
                  </button>

                  <button
                    type="submit"
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#176B52] px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-[#125840] focus:outline-none focus:ring-2 focus:ring-[#176B52]/20 focus:ring-offset-2"
                  >
                    <Search size={16} />
                    Search
                  </button>
                </div>
              </div>

              {hasActiveFilters && (
                <div className="flex flex-wrap items-center gap-2 border-t border-[#EEF2EE] pt-3">
                  <span className="text-xs font-semibold text-[#829087]">
                    Active filters:
                  </span>

                  {search && (
                    <span className="rounded-full bg-[#EAF3EE] px-3 py-1 text-xs font-medium text-[#176B52]">
                      Search: {search}
                    </span>
                  )}

                  {action && (
                    <span className="rounded-full bg-[#EAF3EE] px-3 py-1 text-xs font-medium text-[#176B52]">
                      {actionLabels[action] || action}
                    </span>
                  )}

                  {outcome && (
                    <span className="rounded-full bg-[#EAF3EE] px-3 py-1 text-xs font-medium text-[#176B52]">
                      {outcome}
                    </span>
                  )}
                </div>
              )}
            </form>
          </section>

          {error && (
            <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <AlertCircle size={18} />
              {error}
              <button
                onClick={() => fetchLogs(pagination.page)}
                className="ml-auto font-semibold underline"
              >
                Retry
              </button>
            </div>
          )}

          <section className="overflow-hidden rounded-2xl border border-[#E2EBE4] bg-white">
            <div className="border-b border-[#E9EFEA] px-6 py-5">
              <h3 className="font-bold text-[#26382E]">Activity records</h3>
              <p className="mt-1 text-xs text-[#929D95]">
                Newest administrative actions appear first.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] text-left">
                <thead>
                  <tr className="bg-[#F8FAF8] text-[10px] font-bold uppercase tracking-wider text-[#929D95]">
                    <th className="px-5 py-4">Date &amp; time</th>
                    <th className="px-5 py-4">Administrator</th>
                    <th className="px-5 py-4">Action</th>
                    <th className="px-5 py-4">Target account</th>
                    <th className="px-5 py-4">Previous → New</th>
                    <th className="px-5 py-4">Outcome</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#EEF2EE]">
                  {loading ? (
                    Array.from({ length: 5 }).map((_, index) => (
                      <tr key={index}>
                        {Array.from({ length: 6 }).map((__, cell) => (
                          <td key={cell} className="px-5 py-6">
                            <div className="h-4 w-24 animate-pulse rounded bg-[#EDF2EE]" />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : logs.length ? (
                    logs.map((log) => (
                      <tr key={log._id} className="transition hover:bg-[#FAFCFA]">
                        <td className="px-5 py-5 text-xs text-[#66746A]">
                          {formatDate(log.createdAt)}
                        </td>

                        <td className="px-5 py-5">
                          <p className="text-sm font-semibold text-[#34473A]">
                            {log.adminName}
                          </p>
                          <p className="mt-1 text-xs text-[#929D95]">
                            {log.adminEmail}
                          </p>
                        </td>

                        <td className="px-5 py-5">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-bold ${getActionStyle(log.action)}`}
                          >
                            {actionLabels[log.action] || log.action}
                          </span>

                          {log.failureReason && (
                            <p className="mt-2 max-w-[220px] text-xs text-red-600">
                              {log.failureReason}
                            </p>
                          )}
                        </td>

                        <td className="px-5 py-5">
                          <p className="text-sm font-semibold text-[#34473A]">
                            {log.accountName || 'Unknown account'}
                          </p>
                          <p className="mt-1 text-xs text-[#929D95]">
                            {getAccountId(log.targetAccount) || 'Unavailable'}
                          </p>
                          <p className="mt-1 text-xs text-[#66746A]">
                            {log.targetUserName || log.targetUserEmail || ''}
                          </p>
                        </td>

                        <td className="px-5 py-5 text-xs text-[#66746A]">
                          <span>{log.previousStatus || '—'}</span>
                          <span className="mx-2 text-[#A0AAA3]">→</span>
                          <span className="font-semibold text-[#176B52]">
                            {log.newStatus || '—'}
                          </span>
                        </td>

                        <td className="px-5 py-5">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-bold ${
                              log.outcome === 'SUCCESS'
                                ? 'border-green-200 bg-green-50 text-green-700'
                                : 'border-red-200 bg-red-50 text-red-700'
                            }`}
                          >
                            {log.outcome}
                          </span>
                          <p className="mt-1 text-[10px] text-[#929D95]">
                            HTTP {log.statusCode}
                          </p>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-16 text-center">
                        <ClipboardList
                          size={30}
                          className="mx-auto text-[#B5C4B9]"
                        />
                        <p className="mt-3 text-sm font-semibold text-[#526257]">
                          No audit records found
                        </p>
                        <p className="mt-1 text-xs text-[#929D95]">
                          {hasActiveFilters
                            ? 'Try changing or clearing your filters.'
                            : 'Account status changes will appear here.'}
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-3 border-t border-[#E9EFEA] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-[#929D95]">
                Showing{' '}
                {logs.length
                  ? (pagination.page - 1) * pagination.limit + 1
                  : 0}
                {' – '}
                {(pagination.page - 1) * pagination.limit + logs.length}
                {' of '}
                {pagination.total} records
              </p>

              <div className="flex items-center gap-2">
                <button
                  disabled={!pagination.hasPreviousPage || loading}
                  onClick={() => fetchLogs(pagination.page - 1)}
                  className="inline-flex h-9 items-center gap-1 rounded-lg border border-[#DCE6DE] px-3 text-xs font-semibold text-[#526257] transition hover:bg-[#F3F7F4] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft size={15} />
                  Previous
                </button>

                <button
                  disabled={!pagination.hasNextPage || loading}
                  onClick={() => fetchLogs(pagination.page + 1)}
                  className="inline-flex h-9 items-center gap-1 rounded-lg border border-[#DCE6DE] px-3 text-xs font-semibold text-[#526257] transition hover:bg-[#F3F7F4] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          </section>
        </div>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-[#DCE9E0] bg-white px-2 py-3 shadow-[0_-4px_15px_rgba(25,65,43,0.05)] lg:hidden">
        <NavLink to="/admin/dashboard" end className={mobileNavClass}>
          <LayoutDashboard size={19} />
          <span className="text-[9px] font-semibold">Dashboard</span>
        </NavLink>

        <NavLink to="/admin/transactions" className={mobileNavClass}>
          <Activity size={19} />
          <span className="text-[9px] font-semibold">Transactions</span>
        </NavLink>

        <NavLink to="/admin/users" className={mobileNavClass}>
          <UserRound size={19} />
          <span className="text-[9px] font-semibold">Users</span>
        </NavLink>

        <NavLink to="/admin/accounts" className={mobileNavClass}>
          <Wallet size={19} />
          <span className="text-[9px] font-semibold">Accounts</span>
        </NavLink>

        <NavLink to="/admin/audit-logs" className={mobileNavClass}>
          <ClipboardList size={19} />
          <span className="text-[9px] font-semibold">Audit Logs</span>
        </NavLink>

        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="flex flex-1 flex-col items-center gap-1 text-[#176B52] disabled:opacity-50"
        >
          {loggingOut ? (
            <Loader2 size={19} className="animate-spin" />
          ) : (
            <LogOut size={19} />
          )}
          <span className="text-[9px] font-semibold">Sign out</span>
        </button>
      </nav>
    </div>
  )
}

export default AdminAuditLogs