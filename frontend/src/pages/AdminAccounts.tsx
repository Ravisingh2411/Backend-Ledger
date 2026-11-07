
import { useCallback, useEffect, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import {
  Activity,
  Building2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Eye,
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

type AccountStatus = 'ACTIVE' | 'FROZEN' | 'CLOSED'
type StatusFilter = '' | AccountStatus

interface AccountOwner {
  _id: string
  name: string
  email: string
}

interface AdminAccount {
  _id: string
  name: string
  status: AccountStatus
  currency: string
  balance: number
  owner: AccountOwner
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

const statusStyles: Record<AccountStatus, string> = {
  ACTIVE: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100',
  FROZEN: 'bg-amber-50 text-amber-700 ring-1 ring-amber-100',
  CLOSED: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
}

const getInitials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()

function AdminAccounts() {
  const [accounts, setAccounts] = useState<AdminAccount[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<StatusFilter>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedAccount, setSelectedAccount] = useState<AdminAccount | null>(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [detailsError, setDetailsError] = useState('')
  const [updatingId, setUpdatingId] = useState('')
  const [actionError, setActionError] = useState('')
  const [actionSuccess, setActionSuccess] = useState('')
  const [loggingOut, setLoggingOut] = useState(false)

  const fetchAccounts = useCallback(async () => {
    try {
      setLoading(true)
      setError('')

      const response = await api.get('/admin/accounts', {
        params: {
          page,
          limit: 10,
          ...(search ? { search } : {}),
          ...(status ? { status } : {}),
        },
      })

      setAccounts(response.data.accounts || [])
      setPagination(response.data.pagination || null)
    } catch (err: any) {
      setError(
        err.response?.data?.message || 'Unable to load accounts. Please try again.',
      )
    } finally {
      setLoading(false)
    }
  }, [page, search, status])

  useEffect(() => {
    fetchAccounts()
  }, [fetchAccounts])

  const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    setPage(1)
    setSearch(searchInput.trim())
  }

  const handleSearchInputChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const value = event.target.value

    setSearchInput(value)
    setSearch(value.trim())
    setPage(1)
  }

  const clearFilters = () => {
    setSearchInput('')
    setSearch('')
    setStatus('')
    setPage(1)
  }

  const openAccountDetails = async (accountId: string) => {
    try {
      setSelectedAccount(null)
      setDetailsError('')
      setDetailsLoading(true)

      const response = await api.get(`/admin/accounts/${accountId}`)
      setSelectedAccount(response.data.account)
    } catch (err: any) {
      setDetailsError(
        err.response?.data?.message || 'Unable to load account details.',
      )
    } finally {
      setDetailsLoading(false)
    }
  }

  const updateStatus = async (
    account: AdminAccount,
    targetStatus: AccountStatus,
  ) => {
    const actionText =
      targetStatus === 'CLOSED'
        ? 'close this account'
        : targetStatus === 'FROZEN'
          ? 'freeze this account'
          : 'activate this account'

    if (!window.confirm(`Are you sure you want to ${actionText}?`)) {
      return
    }

    try {
      setUpdatingId(account._id)
      setActionError('')
      setActionSuccess('')

      const response = await api.patch(
        `/admin/accounts/${account._id}/status`,
        { status: targetStatus },
      )

      setActionSuccess(response.data.message || `Account status changed to ${targetStatus}.`)

      await fetchAccounts()

      if (selectedAccount?._id === account._id) {
        const detailsResponse = await api.get(`/admin/accounts/${account._id}`)
        setSelectedAccount(detailsResponse.data.account)
      }
    } catch (err: any) {
      setActionError(
        err.response?.data?.message || 'Unable to update account status.',
      )
    } finally {
      setUpdatingId('')
    }
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

  const navClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition ${
      isActive
        ? 'bg-[#E8F3EC] text-[#176B52]'
        : 'text-[#748078] hover:bg-[#F3F7F3] hover:text-[#176B52]'
    }`

  const availableActions = (account: AdminAccount): AccountStatus[] => {
    if (account.status === 'ACTIVE') return ['FROZEN', 'CLOSED']
    if (account.status === 'FROZEN') return ['ACTIVE', 'CLOSED']
    return []
  }

  const actionLabel: Record<AccountStatus, string> = {
    ACTIVE: 'Activate',
    FROZEN: 'Freeze',
    CLOSED: 'Close',
  }

  const actionClass: Record<AccountStatus, string> = {
    ACTIVE: 'border-emerald-200 text-emerald-700 hover:bg-emerald-50',
    FROZEN: 'border-amber-200 text-amber-700 hover:bg-amber-50',
    CLOSED: 'border-slate-200 text-slate-600 hover:bg-slate-100',
  }

  return (
    <div className="min-h-screen bg-[#F6F9F6] text-[#23352B]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-[#E7EEE8] bg-white px-5 py-6 lg:flex">
        <Link to="/admin/dashboard" className="mb-10 flex items-center gap-3 px-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#176B52] text-white">
            <Wallet size={21} />
          </div>
          <div>
            <p className="text-lg font-extrabold tracking-tight">Backend Ledger</p>
            <p className="text-xs font-medium text-[#8A988F]">Admin Console</p>
          </div>
        </Link>

        <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[#A0AAA3]">
          Workspace
        </p>
        <nav className="space-y-1">
          <NavLink to="/admin/dashboard" className={navClass}>
            <LayoutDashboard size={18} /> Dashboard
          </NavLink>
          <NavLink to="/admin/transactions" className={navClass}>
            <Activity size={18} /> Transactions
          </NavLink>
          <NavLink to="/admin/users" className={navClass}>
            <Users size={18} /> Users
          </NavLink>
          <NavLink to="/admin/accounts" className={navClass}>
            <Building2 size={18} /> Accounts
          </NavLink>
        </nav>

        <div className="mt-auto">
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex w-full items-center gap-3 rounded-xl bg-[#F0F7F1] px-4 py-3 text-left transition hover:bg-[#E5F1E7] disabled:opacity-60"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#DCEFE0] text-[#176B52]">
              {loggingOut ? <Loader2 size={17} className="animate-spin" /> : <LogOut size={17} />}
            </span>
            <span>
              <span className="block text-sm font-bold text-[#176B52]">Sign out</span>
              <span className="block text-xs text-[#829487]">End your session</span>
            </span>
          </button>
        </div>
      </aside>

      <main className="min-h-screen lg:ml-64">
        <header className="sticky top-0 z-20 flex h-[76px] items-center justify-between border-b border-[#E7EEE8] bg-white/95 px-5 backdrop-blur sm:px-8">
          <div>
            <p className="text-xs font-medium text-[#8A988F]">Workspace / Management</p>
            <h1 className="text-lg font-extrabold tracking-tight sm:text-xl">Accounts</h1>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#E8F3EC] text-sm font-bold text-[#176B52]">
            <ShieldCheck size={19} />
          </div>
        </header>

        <div className="mx-auto max-w-[1500px] space-y-6 px-5 py-7 pb-28 sm:px-8 lg:pb-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-2xl font-extrabold tracking-tight">Account management</h2>
              <p className="mt-1 text-sm text-[#829087]">
                Monitor customer accounts, balances and account status.
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-[#E5ECE6] bg-white px-4 py-3">
              <Building2 size={18} className="text-[#176B52]" />
              <span className="text-sm font-semibold text-[#65736A]">
                {pagination?.total ?? 0} accounts
              </span>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {([
              { label: 'Active', value: 'ACTIVE', tone: 'text-emerald-700', bg: 'bg-emerald-50' },
              { label: 'Frozen', value: 'FROZEN', tone: 'text-amber-700', bg: 'bg-amber-50' },
              { label: 'Closed', value: 'CLOSED', tone: 'text-slate-600', bg: 'bg-slate-100' },
            ] as const).map((item) => (
              <button
                key={item.value}
                onClick={() => {
                  setStatus(status === item.value ? '' : item.value)
                  setPage(1)
                }}
                className={`rounded-2xl border bg-white p-4 text-left shadow-sm transition ${
                  status === item.value
                    ? 'border-[#176B52] ring-2 ring-[#176B52]/10'
                    : 'border-[#E7EEE8] hover:border-[#B9D2C0]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-[#829087]">{item.label} accounts</span>
                  <span className={`rounded-lg px-2.5 py-1 text-[10px] font-extrabold ${item.bg} ${item.tone}`}>
                    {status === item.value ? 'FILTERED' : 'FILTER'}
                  </span>
                </div>
                <p className={`mt-3 text-xl font-extrabold ${item.tone}`}>
                  {status === item.value ? 'Selected' : 'View accounts'}
                </p>
              </button>
            ))}
          </div>

          <section className="rounded-2xl border border-[#E7EEE8] bg-white p-4 shadow-sm sm:p-5">
            <form onSubmit={handleSearch} className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9AA69D]" />
                <input
                  value={searchInput}
                  onChange={handleSearchInputChange}
                  placeholder="Search account, account ID, customer name or email..."
                  maxLength={100}
                  className="h-12 w-full rounded-xl border border-[#E5ECE6] bg-[#FBFCFB] pl-11 pr-4 text-sm outline-none transition focus:border-[#75A98D] focus:ring-4 focus:ring-[#176B52]/5"
                />
              </div>
              <button
                type="submit"
                className="h-12 rounded-xl bg-[#176B52] px-6 text-sm font-bold text-white transition hover:bg-[#12563F]"
              >
                Search accounts
              </button>
              {(searchInput || search || status) && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="h-12 rounded-xl border border-[#E5ECE6] px-5 text-sm font-semibold text-[#65736A] hover:bg-[#F7FAF7]"
                >
                  Clear filters
                </button>
              )}
            </form>
          </section>

          {actionError && (
            <div className="flex items-start justify-between gap-3 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              <span>{actionError}</span>
              <button onClick={() => setActionError('')}><X size={16} /></button>
            </div>
          )}
          {actionSuccess && (
            <div className="flex items-start justify-between gap-3 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              <span>{actionSuccess}</span>
              <button onClick={() => setActionSuccess('')}><X size={16} /></button>
            </div>
          )}

          <section className="overflow-hidden rounded-2xl border border-[#E7EEE8] bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-[#EDF1ED] px-5 py-4">
              <div>
                <h3 className="font-bold">Customer accounts</h3>
                <p className="mt-1 text-xs text-[#91A097]">Balances are calculated from ledger entries.</p>
              </div>
              <button
                onClick={fetchAccounts}
                className="rounded-lg border border-[#E5ECE6] px-3 py-2 text-xs font-semibold text-[#176B52] hover:bg-[#F2F8F3]"
              >
                Refresh
              </button>
            </div>

            {error && (
              <div className="m-5 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            )}

            {loading ? (
              <div className="flex min-h-64 items-center justify-center gap-3 text-sm text-[#829087]">
                <Loader2 size={20} className="animate-spin text-[#176B52]" />
                Loading accounts...
              </div>
            ) : accounts.length === 0 ? (
              <div className="flex min-h-64 flex-col items-center justify-center px-5 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F0F6F1] text-[#176B52]">
                  <Building2 size={22} />
                </div>
                <p className="font-bold">No accounts found</p>
                <p className="mt-1 text-sm text-[#91A097]">Try changing the search or status filter.</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1050px] text-left">
                    <thead className="bg-[#F8FAF8] text-[11px] font-bold uppercase tracking-wider text-[#8A988F]">
                      <tr>
                        <th className="whitespace-nowrap px-5 py-4">Account</th>
                        <th className="whitespace-nowrap px-5 py-4">Owner</th>
                        <th className="whitespace-nowrap px-5 py-4">Balance</th>
                        <th className="whitespace-nowrap px-5 py-4">Status</th>
                        <th className="whitespace-nowrap px-5 py-4">Created</th>
                        <th className="whitespace-nowrap px-5 py-4">Actions</th>
                        <th className="whitespace-nowrap px-5 py-4 text-right">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F0F3F0]">
                      {accounts.map((account) => (
                        <tr key={account._id} className="transition hover:bg-[#FBFDFB]">
                          <td className="whitespace-nowrap px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F0F6F1] text-[#176B52]">
                                <Wallet size={18} />
                              </div>
                              <div>
                                <p className="text-sm font-bold">{account.name}</p>
                                <p className="mt-1 text-[10px] text-[#A0AAA3]">ID: {account._id.slice(-8)}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <p className="whitespace-nowrap text-sm font-semibold">{account.owner.name}</p>
                            <p className="mt-1 text-xs text-[#91A097]">{account.owner.email}</p>
                          </td>
                          <td className="whitespace-nowrap px-5 py-4 text-sm font-extrabold">
                            {formatCurrency(account.balance, account.currency)}
                          </td>
                          <td className="whitespace-nowrap px-5 py-4">
                            <span className={`rounded-full px-3 py-1.5 text-[10px] font-extrabold ${statusStyles[account.status]}`}>
                              {account.status}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-5 py-4 text-sm text-[#718077]">
                            {formatDate(account.createdAt)}
                          </td>
                          <td className="whitespace-nowrap px-5 py-4">
                            <div className="flex items-center gap-1.5">
                              {availableActions(account).map((target) => (
                                <button
                                  key={target}
                                  disabled={updatingId === account._id}
                                  onClick={() => updateStatus(account, target)}
                                  className={`rounded-lg border px-2.5 py-1.5 text-[10px] font-bold transition disabled:opacity-40 ${actionClass[target]}`}
                                >
                                  {updatingId === account._id ? '...' : actionLabel[target]}
                                </button>
                              ))}
                              {account.status === 'CLOSED' && (
                                <span className="text-xs text-[#A0AAA3]">No actions</span>
                              )}
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-5 py-4 text-right">
                            <button
                              onClick={() => openAccountDetails(account._id)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-[#DCE9DF] px-3 py-2 text-xs font-bold text-[#176B52] transition hover:bg-[#EDF6EF]"
                            >
                              <Eye size={14} /> View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-col gap-3 border-t border-[#EDF1ED] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-[#829087]">
                    Showing {accounts.length} of {pagination?.total ?? accounts.length} accounts
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      disabled={!pagination?.hasPreviousPage}
                      onClick={() => setPage((current) => Math.max(1, current - 1))}
                      className="flex h-9 items-center gap-1 rounded-lg border border-[#E5ECE6] px-3 text-xs font-semibold text-[#65736A] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ChevronLeft size={15} /> Previous
                    </button>
                    <span className="px-2 text-xs font-bold text-[#65736A]">
                      Page {pagination?.page ?? page} of {pagination?.totalPages || 1}
                    </span>
                    <button
                      disabled={!pagination?.hasNextPage}
                      onClick={() => setPage((current) => current + 1)}
                      className="flex h-9 items-center gap-1 rounded-lg border border-[#E5ECE6] px-3 text-xs font-semibold text-[#65736A] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Next <ChevronRight size={15} />
                    </button>
                  </div>
                </div>
              </>
            )}
          </section>
        </div>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 flex justify-around border-t border-[#E7EEE8] bg-white px-2 py-2 lg:hidden">
        <Link to="/admin/dashboard" className="flex flex-col items-center gap-1 px-3 py-1 text-[10px] font-semibold text-[#829087]">
          <LayoutDashboard size={19} /> Dashboard
        </Link>
        <Link to="/admin/transactions" className="flex flex-col items-center gap-1 px-3 py-1 text-[10px] font-semibold text-[#829087]">
          <Activity size={19} /> Transactions
        </Link>
        <Link to="/admin/users" className="flex flex-col items-center gap-1 px-3 py-1 text-[10px] font-semibold text-[#829087]">
          <Users size={19} /> Users
        </Link>
        <Link to="/admin/accounts" className="flex flex-col items-center gap-1 px-3 py-1 text-[10px] font-bold text-[#176B52]">
          <Building2 size={19} /> Accounts
        </Link>
        <button onClick={handleLogout} className="flex flex-col items-center gap-1 px-3 py-1 text-[10px] font-semibold text-[#176B52]">
          <LogOut size={19} /> Sign out
        </button>
      </nav>

      {(detailsLoading || detailsError || selectedAccount) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#15251D]/40 p-4 backdrop-blur-[2px]">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-[#EDF1ED] bg-white px-6 py-5">
              <div>
                <h3 className="text-lg font-extrabold">Account details</h3>
                <p className="mt-1 text-xs text-[#91A097]">Account information and controls</p>
              </div>
              <button
                onClick={() => {
                  setSelectedAccount(null)
                  setDetailsError('')
                }}
                className="rounded-lg p-2 text-[#829087] hover:bg-[#F2F6F2]"
              >
                <X size={20} />
              </button>
            </div>

            {detailsLoading ? (
              <div className="flex min-h-56 items-center justify-center gap-3 text-sm text-[#829087]">
                <Loader2 size={20} className="animate-spin text-[#176B52]" />
                Loading account details...
              </div>
            ) : detailsError ? (
              <div className="m-6 rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{detailsError}</div>
            ) : selectedAccount ? (
              <div className="space-y-6 p-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E8F3EC] text-[#176B52]">
                    <Wallet size={25} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="truncate text-lg font-extrabold">{selectedAccount.name}</h4>
                    <span className={`mt-1 inline-flex rounded-full px-3 py-1 text-[10px] font-extrabold ${statusStyles[selectedAccount.status]}`}>
                      {selectedAccount.status}
                    </span>
                  </div>
                </div>

                <div className="rounded-2xl bg-[#F1F7F2] p-5">
                  <p className="text-xs font-semibold text-[#829087]">Current ledger balance</p>
                  <p className="mt-2 text-2xl font-extrabold text-[#176B52]">
                    {formatCurrency(selectedAccount.balance, selectedAccount.currency)}
                  </p>
                  <p className="mt-1 text-xs text-[#91A097]">Currency: {selectedAccount.currency}</p>
                </div>

                <div>
                  <h4 className="mb-3 font-bold">Account owner</h4>
                  <div className="rounded-xl border border-[#E8EEE9] p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#E8F3EC] text-sm font-extrabold text-[#176B52]">
                        {getInitials(selectedAccount.owner.name)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold">{selectedAccount.owner.name}</p>
                        <p className="mt-1 flex items-center gap-1.5 text-xs text-[#829087]">
                          <Mail size={13} /> {selectedAccount.owner.email}
                        </p>
                      </div>
                    </div>
                    <p className="mt-3 break-all font-mono text-[10px] text-[#A0AAA3]">
                      User ID: {selectedAccount.owner._id}
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl bg-[#F7FAF7] p-4">
                    <p className="text-xs font-semibold text-[#91A097]">Account ID</p>
                    <p className="mt-2 break-all font-mono text-xs font-semibold">{selectedAccount._id}</p>
                  </div>
                  <div className="rounded-xl bg-[#F7FAF7] p-4">
                    <p className="text-xs font-semibold text-[#91A097]">Created on</p>
                    <p className="mt-2 flex items-center gap-2 text-sm font-bold">
                      <CalendarDays size={15} className="text-[#176B52]" />
                      {formatDate(selectedAccount.createdAt)}
                    </p>
                  </div>
                </div>

                <div>
                  <h4 className="mb-3 font-bold">Account actions</h4>
                  {selectedAccount.status === 'CLOSED' ? (
                    <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                      This account is closed. No further status changes are allowed.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {availableActions(selectedAccount).map((target) => (
                        <button
                          key={target}
                          disabled={updatingId === selectedAccount._id}
                          onClick={() => updateStatus(selectedAccount, target)}
                          className={`rounded-xl border px-4 py-2.5 text-xs font-bold transition disabled:opacity-50 ${actionClass[target]}`}
                        >
                          {updatingId === selectedAccount._id
                            ? 'Updating...'
                            : `${actionLabel[target]} account`}
                        </button>
                      ))}
                    </div>
                  )}
                  {selectedAccount.status !== 'CLOSED' && (
                    <p className="mt-3 text-xs leading-5 text-[#91A097]">
                      Closing an account is permitted only when its ledger balance is exactly zero. Closed accounts cannot be reactivated.
                    </p>
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

export default AdminAccounts
