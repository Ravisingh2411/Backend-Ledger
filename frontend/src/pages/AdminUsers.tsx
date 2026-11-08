import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  Activity,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  LayoutDashboard,
  Loader2,
  LogOut,
  Mail,
  Search,
  ShieldCheck,
  Users,
  Wallet,
  X,
} from 'lucide-react'
import api from '../services/api'

interface AdminUser {
  _id: string
  name: string
  email: string
  role: string
  createdAt: string
  updatedAt: string
  accountCount: number
}

interface UserAccount {
  _id: string
  name: string
  status: 'ACTIVE' | 'FROZEN' | 'CLOSED'
  currency: string
  balance: number
  createdAt: string
  updatedAt: string
}

interface UserDetails {
  _id: string
  name: string
  email: string
  role: string
  createdAt: string
  updatedAt: string
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

interface UserDetailsResponse {
  user: UserDetails
  accounts: UserAccount[]
}

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

const formatCurrency = (amount: number, currency = 'INR') =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount)

const getInitials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()

const accountStatusStyles: Record<UserAccount['status'], string> = {
  ACTIVE: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100',
  FROZEN: 'bg-amber-50 text-amber-700 ring-1 ring-amber-100',
  CLOSED: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
}

function AdminUsers() {
  const navigate = useNavigate()
  const location = useLocation()
  const scrollRestoredRef = useRef(false)

  const [users, setUsers] = useState<AdminUser[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [selectedUser, setSelectedUser] = useState<UserDetailsResponse | null>(
    null,
  )
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [detailsError, setDetailsError] = useState('')

  const [loggingOut, setLoggingOut] = useState(false)

  const requestIdRef = useRef(0)

  useEffect(() => {
    const storageKey = `admin-scroll:${location.pathname}`
    scrollRestoredRef.current = false

    const saveScrollPosition = () => {
      sessionStorage.setItem(storageKey, String(window.scrollY))
    }

    window.addEventListener('scroll', saveScrollPosition, { passive: true })
    window.addEventListener('beforeunload', saveScrollPosition)

    return () => {
      saveScrollPosition()
      window.removeEventListener('scroll', saveScrollPosition)
      window.removeEventListener('beforeunload', saveScrollPosition)
    }
  }, [location.pathname])

  useEffect(() => {
    if (loading || scrollRestoredRef.current) return

    const storageKey = `admin-scroll:${location.pathname}`
    const savedPosition = Number(sessionStorage.getItem(storageKey) || 0)

    requestAnimationFrame(() => {
      window.scrollTo(0, savedPosition)
      scrollRestoredRef.current = true
    })
  }, [loading, location.pathname])

  const fetchUsers = useCallback(async () => {
    const requestId = ++requestIdRef.current

    try {
      setLoading(true)
      setError('')

      const response = await api.get('/admin/users', {
        params: {
          page,
          limit: 10,
          ...(search ? { search } : {}),
        },
      })

      if (requestId !== requestIdRef.current) return

      setUsers(response.data.users || [])
      setPagination(response.data.pagination || null)
    } catch (err: any) {
      if (requestId !== requestIdRef.current) return

      setError(
        err.response?.data?.message ||
          'Unable to load customers. Please try again.',
      )
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false)
      }
    }
  }, [page, search])

  useEffect(() => {
    void fetchUsers()

    return () => {
      requestIdRef.current += 1
    }
  }, [fetchUsers])

  const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const trimmedSearch = searchInput.trim()
    setPage(1)
    setSearch(trimmedSearch)
  }

  const handleSearchInputChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const value = event.target.value

    setSearchInput(value)
    setSearch(value.trim())
    setPage(1)
  }

  const clearSearch = () => {
    setSearchInput('')
    setSearch('')
    setPage(1)
  }

  const openUserDetails = async (userId: string) => {
    try {
      setSelectedUser(null)
      setDetailsError('')
      setDetailsLoading(true)

      const response = await api.get(`/admin/users/${userId}`)

      setSelectedUser({
        user: response.data.user,
        accounts: response.data.accounts || [],
      })
    } catch (err: any) {
      setDetailsError(
        err.response?.data?.message || 'Unable to load customer details.',
      )
    } finally {
      setDetailsLoading(false)
    }
  }

  const closeDetails = () => {
    setSelectedUser(null)
    setDetailsError('')
  }

  const handleLogout = async () => {
    try {
      setLoggingOut(true)
      await api.post('/auth/logout')
      navigate('/login', { replace: true })
    } catch {
      setLoggingOut(false)
      setError('Unable to sign out. Please try again.')
    }
  }

  const navClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition ${
      isActive
        ? 'bg-[#E8F3EC] text-[#176B52]'
        : 'text-[#748078] hover:bg-[#F3F7F3] hover:text-[#176B52]'
    }`

  const mobileNavClass = ({ isActive }: { isActive: boolean }) =>
    `flex shrink-0 flex-col items-center gap-1 px-2 py-1 text-[10px] font-semibold transition ${
      isActive ? 'text-[#176B52]' : 'text-[#829087]'
    }`

  return (
    <div className="min-h-screen bg-[#F6F9F6] text-[#23352B]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-[#E7EEE8] bg-white px-5 py-6 lg:flex">
        <Link
          to="/admin/dashboard"
          className="mb-10 flex items-center gap-3 px-2"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#176B52] text-white">
            <Wallet size={21} />
          </div>
          <div>
            <p className="text-lg font-extrabold tracking-tight">
              Backend Ledger
            </p>
            <p className="text-xs font-medium text-[#8A988F]">
              Admin Console
            </p>
          </div>
        </Link>

        <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[#A0AAA3]">
          Workspace
        </p>

        <nav className="space-y-1">
          <NavLink to="/admin/dashboard" end className={navClass}>
            <LayoutDashboard size={18} />
            Dashboard
          </NavLink>

          <NavLink to="/admin/transactions" className={navClass}>
            <Activity size={18} />
            Transactions
          </NavLink>

          <NavLink to="/admin/users" className={navClass}>
            <Users size={18} />
            Users
          </NavLink>

          <NavLink to="/admin/accounts" className={navClass}>
            <Wallet size={18} />
            Accounts
          </NavLink>

          <NavLink to="/admin/audit-logs" className={navClass}>
            <FileText size={18} />
            Audit Logs
          </NavLink>
        </nav>

        <div className="mt-auto">
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

      <main className="min-h-screen lg:ml-64">
        <header className="sticky top-0 z-20 flex h-[76px] items-center justify-between border-b border-[#E7EEE8] bg-white/95 px-5 backdrop-blur sm:px-8">
          <div>
            <p className="text-xs font-medium text-[#8A988F]">
              Workspace / Management
            </p>
            <h1 className="text-lg font-extrabold tracking-tight sm:text-xl">
              Users
            </h1>
          </div>

          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#E8F3EC] text-sm font-bold text-[#176B52]">
            <ShieldCheck size={19} />
          </div>
        </header>

        <div className="mx-auto max-w-[1500px] space-y-6 px-5 py-7 pb-28 sm:px-8 lg:pb-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-2xl font-extrabold tracking-tight">
                Customer management
              </h2>
              <p className="mt-1 text-sm text-[#829087]">
                View registered customers and inspect their accounts.
              </p>
            </div>

            <div className="flex items-center gap-2 rounded-xl border border-[#E5ECE6] bg-white px-4 py-3">
              <Users size={18} className="text-[#176B52]" />
              <span className="text-sm font-semibold text-[#65736A]">
                {pagination?.total ?? 0} customers
              </span>
            </div>
          </div>

          <section className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-[#E7EEE8] bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-[#829087]">
                    Registered customers
                  </p>
                  <p className="mt-2 text-2xl font-extrabold text-[#23352B]">
                    {pagination?.total ?? (loading ? '—' : users.length)}
                  </p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#E8F3EC] text-[#176B52]">
                  <Users size={21} />
                </div>
              </div>
              <p className="mt-3 text-xs text-[#91A097]">
                Normal customer accounts, excluding internal system users.
              </p>
            </div>

            <div className="rounded-2xl border border-[#E7EEE8] bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-[#829087]">
                    Current page
                  </p>
                  <p className="mt-2 text-2xl font-extrabold text-[#23352B]">
                    {pagination?.page ?? page}
                    <span className="ml-1 text-base font-semibold text-[#A0AAA3]">
                      / {pagination?.totalPages || 1}
                    </span>
                  </p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F0F4FA] text-[#58769A]">
                  <Activity size={21} />
                </div>
              </div>
              <p className="mt-3 text-xs text-[#91A097]">
                Browse customers using the pagination controls.
              </p>
            </div>
          </section>

          <section className="rounded-2xl border border-[#E7EEE8] bg-white p-4 shadow-sm sm:p-5">
            <form
              onSubmit={handleSearch}
              className="flex flex-col gap-3 sm:flex-row"
            >
              <div className="relative flex-1">
                <Search
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9AA69D]"
                />
                <input
                  value={searchInput}
                  onChange={handleSearchInputChange}
                  placeholder="Search customer name or email..."
                  maxLength={100}
                  className="h-12 w-full rounded-xl border border-[#E5ECE6] bg-[#FBFCFB] pl-11 pr-4 text-sm outline-none transition focus:border-[#75A98D] focus:ring-4 focus:ring-[#176B52]/5"
                />
              </div>

              <button
                type="submit"
                className="h-12 rounded-xl bg-[#176B52] px-6 text-sm font-bold text-white transition hover:bg-[#12563F]"
              >
                Search customers
              </button>

              {(searchInput || search) && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="h-12 rounded-xl border border-[#E5ECE6] px-5 text-sm font-semibold text-[#65736A] hover:bg-[#F7FAF7]"
                >
                  Clear
                </button>
              )}
            </form>
          </section>

          <section className="overflow-hidden rounded-2xl border border-[#E7EEE8] bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-[#EDF1ED] px-5 py-4">
              <div>
                <h3 className="font-bold">Registered customers</h3>
                <p className="mt-1 text-xs text-[#91A097]">
                  Customer profiles and linked account counts.
                </p>
              </div>

              <button
                onClick={() => void fetchUsers()}
                className="rounded-lg border border-[#E5ECE6] px-3 py-2 text-xs font-semibold text-[#176B52] hover:bg-[#F2F8F3]"
              >
                Refresh
              </button>
            </div>

            {error && (
              <div className="m-5 flex items-start justify-between gap-3 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                <span>{error}</span>
                <button onClick={() => setError('')} aria-label="Dismiss error">
                  <X size={16} />
                </button>
              </div>
            )}

            {loading ? (
              <div className="flex min-h-64 items-center justify-center gap-3 text-sm text-[#829087]">
                <Loader2
                  size={20}
                  className="animate-spin text-[#176B52]"
                />
                Loading customers...
              </div>
            ) : users.length === 0 ? (
              <div className="flex min-h-64 flex-col items-center justify-center px-5 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F0F6F1] text-[#176B52]">
                  <Users size={22} />
                </div>
                <p className="font-bold">No customers found</p>
                <p className="mt-1 text-sm text-[#91A097]">
                  Try searching with a different name or email.
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[850px] text-left">
                    <thead className="bg-[#F8FAF8] text-[11px] font-bold uppercase tracking-wider text-[#8A988F]">
                      <tr>
                        <th className="whitespace-nowrap px-5 py-4">
                          Customer
                        </th>
                        <th className="whitespace-nowrap px-5 py-4">
                          Email address
                        </th>
                        <th className="whitespace-nowrap px-5 py-4">
                          Accounts
                        </th>
                        <th className="whitespace-nowrap px-5 py-4">
                          Joined
                        </th>
                        <th className="whitespace-nowrap px-5 py-4">Role</th>
                        <th className="whitespace-nowrap px-5 py-4 text-right">
                          Details
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-[#F0F3F0]">
                      {users.map((user) => (
                        <tr
                          key={user._id}
                          className="transition hover:bg-[#FBFDFB]"
                        >
                          <td className="whitespace-nowrap px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#E8F3EC] text-xs font-extrabold text-[#176B52]">
                                {getInitials(user.name)}
                              </div>
                              <div>
                                <p className="text-sm font-bold">
                                  {user.name}
                                </p>
                                <p className="mt-1 text-[10px] text-[#A0AAA3]">
                                  ID: {user._id.slice(-8)}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="whitespace-nowrap px-5 py-4 text-sm text-[#718077]">
                            {user.email}
                          </td>

                          <td className="whitespace-nowrap px-5 py-4">
                            <span className="inline-flex items-center gap-2 rounded-lg bg-[#F0F6F1] px-3 py-2 text-xs font-bold text-[#176B52]">
                              <Wallet size={14} />
                              {user.accountCount}
                            </span>
                          </td>

                          <td className="whitespace-nowrap px-5 py-4 text-sm text-[#718077]">
                            {formatDate(user.createdAt)}
                          </td>

                          <td className="whitespace-nowrap px-5 py-4">
                            <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-[10px] font-extrabold text-emerald-700 ring-1 ring-emerald-100">
                              CUSTOMER
                            </span>
                          </td>

                          <td className="whitespace-nowrap px-5 py-4 text-right">
                            <button
                              onClick={() => void openUserDetails(user._id)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-[#DCE9DF] px-3 py-2 text-xs font-bold text-[#176B52] transition hover:bg-[#EDF6EF]"
                            >
                              <Eye size={14} />
                              View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-col gap-3 border-t border-[#EDF1ED] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-[#829087]">
                    Showing {users.length} of {pagination?.total ?? users.length}{' '}
                    customers
                  </p>

                  <div className="flex items-center gap-2">
                    <button
                      disabled={!pagination?.hasPreviousPage}
                      onClick={() =>
                        setPage((current) => Math.max(1, current - 1))
                      }
                      className="flex h-9 items-center gap-1 rounded-lg border border-[#E5ECE6] px-3 text-xs font-semibold text-[#65736A] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ChevronLeft size={15} />
                      Previous
                    </button>

                    <span className="px-2 text-xs font-bold text-[#65736A]">
                      Page {pagination?.page ?? page} of{' '}
                      {pagination?.totalPages || 1}
                    </span>

                    <button
                      disabled={!pagination?.hasNextPage}
                      onClick={() => setPage((current) => current + 1)}
                      className="flex h-9 items-center gap-1 rounded-lg border border-[#E5ECE6] px-3 text-xs font-semibold text-[#65736A] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Next
                      <ChevronRight size={15} />
                    </button>
                  </div>
                </div>
              </>
            )}
          </section>
        </div>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 flex justify-around overflow-x-auto border-t border-[#E7EEE8] bg-white px-2 py-2 lg:hidden">
        <NavLink to="/admin/dashboard" end className={mobileNavClass}>
          <LayoutDashboard size={19} />
          Dashboard
        </NavLink>

        <NavLink to="/admin/transactions" className={mobileNavClass}>
          <Activity size={19} />
          Transactions
        </NavLink>

        <NavLink to="/admin/users" className={mobileNavClass}>
          <Users size={19} />
          Users
        </NavLink>

        <NavLink to="/admin/accounts" className={mobileNavClass}>
          <Wallet size={19} />
          Accounts
        </NavLink>

        <NavLink to="/admin/audit-logs" className={mobileNavClass}>
          <FileText size={19} />
          Audit Logs
        </NavLink>

        <button
          onClick={() => void handleLogout()}
          disabled={loggingOut}
          className="flex shrink-0 flex-col items-center gap-1 px-2 py-1 text-[10px] font-semibold text-[#176B52] disabled:opacity-50"
        >
          {loggingOut ? (
            <Loader2 size={19} className="animate-spin" />
          ) : (
            <LogOut size={19} />
          )}
          Sign out
        </button>
      </nav>

      {(detailsLoading || detailsError || selectedUser) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#15251D]/40 p-4 backdrop-blur-[2px]">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-[#EDF1ED] bg-white px-6 py-5">
              <div>
                <h3 className="text-lg font-extrabold">Customer details</h3>
                <p className="mt-1 text-xs text-[#91A097]">
                  Profile and linked bank accounts
                </p>
              </div>

              <button
                onClick={closeDetails}
                className="rounded-lg p-2 text-[#829087] hover:bg-[#F2F6F2]"
                aria-label="Close customer details"
              >
                <X size={20} />
              </button>
            </div>

            {detailsLoading ? (
              <div className="flex min-h-56 items-center justify-center gap-3 text-sm text-[#829087]">
                <Loader2
                  size={20}
                  className="animate-spin text-[#176B52]"
                />
                Loading customer details...
              </div>
            ) : detailsError ? (
              <div className="m-6 rounded-xl bg-rose-50 p-4 text-sm text-rose-700">
                {detailsError}
              </div>
            ) : selectedUser ? (
              <div className="space-y-6 p-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E8F3EC] text-lg font-extrabold text-[#176B52]">
                    {getInitials(selectedUser.user.name)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h4 className="truncate text-lg font-extrabold">
                      {selectedUser.user.name}
                    </h4>
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-[#829087]">
                      <Mail size={14} />
                      {selectedUser.user.email}
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl bg-[#F7FAF7] p-4">
                    <p className="text-xs font-semibold text-[#91A097]">
                      Customer ID
                    </p>
                    <p className="mt-2 break-all font-mono text-xs font-semibold">
                      {selectedUser.user._id}
                    </p>
                  </div>

                  <div className="rounded-xl bg-[#F7FAF7] p-4">
                    <p className="text-xs font-semibold text-[#91A097]">
                      Joined on
                    </p>
                    <p className="mt-2 flex items-center gap-2 text-sm font-bold">
                      <CalendarDays size={15} className="text-[#176B52]" />
                      {formatDate(selectedUser.user.createdAt)}
                    </p>
                  </div>
                </div>

                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <h4 className="font-bold">Linked accounts</h4>
                    <span className="rounded-lg bg-[#F0F6F1] px-3 py-1.5 text-xs font-bold text-[#176B52]">
                      {selectedUser.accounts.length} accounts
                    </span>
                  </div>

                  {selectedUser.accounts.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-[#DCE7DE] p-6 text-center">
                      <Wallet
                        size={23}
                        className="mx-auto mb-2 text-[#A0AAA3]"
                      />
                      <p className="text-sm font-semibold text-[#65736A]">
                        No accounts linked
                      </p>
                      <p className="mt-1 text-xs text-[#91A097]">
                        This customer has not created an account yet.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {selectedUser.accounts.map((account) => (
                        <div
                          key={account._id}
                          className="rounded-xl border border-[#E8EEE9] p-4"
                        >
                          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F0F6F1] text-[#176B52]">
                                <Wallet size={18} />
                              </div>

                              <div>
                                <p className="text-sm font-bold">
                                  {account.name}
                                </p>
                                <p className="mt-1 text-[10px] text-[#A0AAA3]">
                                  ID: {account._id.slice(-8)}
                                </p>
                              </div>
                            </div>

                            <div className="sm:text-right">
                              <p className="text-sm font-extrabold">
                                {formatCurrency(
                                  account.balance,
                                  account.currency,
                                )}
                              </p>
                              <span
                                className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-[10px] font-extrabold ${accountStatusStyles[account.status]}`}
                              >
                                {account.status}
                              </span>
                            </div>
                          </div>

                          <div className="mt-3 flex items-center justify-between border-t border-[#F0F3F0] pt-3">
                            <p className="text-xs text-[#91A097]">
                              Created {formatDate(account.createdAt)}
                            </p>
                            <button
                              onClick={() => {
                                closeDetails()
                                navigate('/admin/accounts')
                              }}
                              className="text-xs font-bold text-[#176B52] hover:underline"
                            >
                              Manage accounts
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminUsers