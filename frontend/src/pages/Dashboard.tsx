import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import {
  Activity,
  AlertCircle,
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  Check,
  CheckCircle2,
  Copy,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Plus,
  ReceiptText,
  RefreshCw,
  Search,
  ShieldCheck,
  Wallet,
  Snowflake,
  Unlock,
  X,
  XCircle,
} from 'lucide-react'

import { useAuth } from '../context/useAuth'
import api from '../services/api'

interface Account {
  _id: string
  name?: string
  accountName?: string
  account_name?: string
  currency: string
  status: 'ACTIVE' | 'FROZEN' | 'CLOSED'
  createdAt?: string
}

interface AccountReference {
  _id: string
  currency?: string
  status?: string
}

interface Transaction {
  _id: string
  fromAccount: string | AccountReference | null
  toAccount: string | AccountReference | null
  amount: number
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REVERSED'
  transactionType?: 'TRANSFER' | 'WELCOME_BONUS'
  createdAt: string
}

interface AccountsResponse {
  accounts: Account[]
}

interface BalanceResponse {
  balance: number
}

interface TransactionsResponse {
  transactions: Transaction[]
}

type AccountAction = 'freeze' | 'unfreeze' | 'close'
type AccountFilter = 'ALL' | 'ACTIVE' | 'FROZEN' | 'CLOSED'

function getAccountId(
  account: string | AccountReference | null | undefined
): string | null {
  if (!account) return null

  return typeof account === 'string' ? account : account._id
}

function formatCurrency(amount: number, currency = 'INR') {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount)
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

function formatAccountDate(date?: string) {
  if (!date) return 'Date unavailable'

  const parsedDate = new Date(date)

  if (Number.isNaN(parsedDate.getTime())) {
    return 'Date unavailable'
  }

  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(parsedDate)
}

function shortId(id: string) {
  return `${id.slice(0, 8)}...${id.slice(-4)}`
}

function getAccountReferenceLabel(id: string | null) {
  return id ? shortId(id) : 'Deleted account'
}

function getErrorMessage(err: unknown, fallback: string) {
  const message = (
    err as { response?: { data?: { message?: string } } }
  )?.response?.data?.message

  return message || fallback
}

function getAccountDisplayName(account: Account, accountNumber: number) {
  return (
    account.name?.trim() ||
    account.accountName?.trim() ||
    account.account_name?.trim() ||
    `Account ${accountNumber}`
  )
}

function Dashboard() {
  const { user, logout } = useAuth()
  const location = useLocation()

  const [accounts, setAccounts] = useState<Account[]>([])
  const [balances, setBalances] = useState<Record<string, number>>({})
  const [transactions, setTransactions] = useState<Transaction[]>([])

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [selectedAccount, setSelectedAccount] = useState('')
  const [receiverAccount, setReceiverAccount] = useState('')
  const [amount, setAmount] = useState('')
  const [transferring, setTransferring] = useState(false)
  const [transferError, setTransferError] = useState('')
  const [transferSuccess, setTransferSuccess] = useState('')

  const [creatingAccount, setCreatingAccount] = useState(false)
  const [showCreateAccount, setShowCreateAccount] = useState(false)
  const [newAccountName, setNewAccountName] = useState('')
  const [accountActionLoading, setAccountActionLoading] = useState('')

  const [accountFilter, setAccountFilter] = useState<AccountFilter>('ALL')
  const [accountSearch, setAccountSearch] = useState('')
  const [copiedAccountId, setCopiedAccountId] = useState('')

  const isDashboardActive = location.pathname === '/dashboard'
  const activeSection = location.hash

  const navItemClasses = (active: boolean) =>
    `flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition ${
      active
        ? 'bg-[#EAF3EE] font-semibold text-[#176B52]'
        : 'font-medium text-[#65736B] hover:bg-[#F4F6F3]'
    }`

  const loadDashboard = useCallback(async (isRefresh = false) => {
    await Promise.resolve()

    if (isRefresh) {
      setRefreshing(true)
      setError('')
    }

    try {
      const [accountsResponse, transactionsResponse] = await Promise.all([
        api.get<AccountsResponse>('/accounts/'),
        api.get<TransactionsResponse>('/transactions/'),
      ])

      const fetchedAccounts = accountsResponse.data.accounts
      const fetchedTransactions = transactionsResponse.data.transactions

      const balanceResults = await Promise.all(
        fetchedAccounts.map(async (account) => {
          const response = await api.get<BalanceResponse>(
            `/accounts/balance/${account._id}`
          )

          return [account._id, response.data.balance] as const
        })
      )

      setAccounts(fetchedAccounts)
      setBalances(Object.fromEntries(balanceResults))
      setTransactions(fetchedTransactions)

      setSelectedAccount((current) => {
        const currentAccount = fetchedAccounts.find(
          (account) => account._id === current
        )

        if (currentAccount?.status === 'ACTIVE') {
          return current
        }

        return fetchedAccounts.find(
          (account) => account.status === 'ACTIVE'
        )?._id || ''
      })

      setReceiverAccount((current) => {
        const receiver = fetchedAccounts.find(
          (account) => account._id === current
        )

        if (receiver && receiver.status !== 'ACTIVE') {
          return ''
        }

        return current
      })
    } catch (err: unknown) {
      setError(
        getErrorMessage(
          err,
          'Unable to load dashboard data. Please try again.'
        )
      )
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    void Promise.resolve().then(() => {
      if (!cancelled) {
        void loadDashboard()
      }
    })

    return () => {
      cancelled = true
    }
  }, [loadDashboard])

  useEffect(() => {
    if (!activeSection) return

    const sectionId = activeSection.slice(1)
    let frame = 0
    let secondFrame = 0

    frame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => {
        document.getElementById(sectionId)?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        })
      })
    })

    return () => {
      cancelAnimationFrame(frame)
      cancelAnimationFrame(secondFrame)
    }
  }, [activeSection, loading])

  const totalBalance = useMemo(
    () =>
      accounts.reduce(
        (total, account) => total + (balances[account._id] ?? 0),
        0
      ),
    [accounts, balances]
  )

  const orderedAccounts = useMemo(() => {
    return [...accounts].sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : Infinity
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : Infinity

      if (dateA !== dateB) {
        return dateA - dateB
      }

      return a._id.localeCompare(b._id)
    })
  }, [accounts])

  const activeAccounts = accounts.filter(
    (account) => account.status === 'ACTIVE'
  ).length

  const accountCounts = useMemo(
    () => ({
      ALL: accounts.length,
      ACTIVE: accounts.filter((account) => account.status === 'ACTIVE').length,
      FROZEN: accounts.filter((account) => account.status === 'FROZEN').length,
      CLOSED: accounts.filter((account) => account.status === 'CLOSED').length,
    }),
    [accounts]
  )

  const filteredAccounts = useMemo(() => {
    const searchTerm = accountSearch.trim().toLowerCase()

    return orderedAccounts.filter((account) => {
      const matchesStatus =
        accountFilter === 'ALL' || account.status === accountFilter

      const accountNumber =
        orderedAccounts.findIndex((item) => item._id === account._id) + 1

      const accountName = getAccountDisplayName(
        account,
        accountNumber
      ).toLowerCase()

      const accountId = account._id.toLowerCase()

      const matchesSearch =
        !searchTerm ||
        accountName.includes(searchTerm) ||
        accountId.includes(searchTerm)

      return matchesStatus && matchesSearch
    })
  }, [orderedAccounts, accountFilter, accountSearch])

  const ownedAccountIds = useMemo(
    () => new Set(accounts.map((account) => account._id)),
    [accounts]
  )

  const openCreateAccount = () => {
    setNewAccountName('')
    setError('')
    setSuccess('')
    setShowCreateAccount(true)
  }

  const handleCreateAccount = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault()

    const accountName = newAccountName.trim()

    if (accountName.length < 2) {
      setError('Account name must contain at least 2 characters.')
      return
    }

    if (accountName.length > 30) {
      setError('Account name cannot exceed 30 characters.')
      return
    }

    setCreatingAccount(true)
    setError('')
    setSuccess('')

    try {
      await api.post('/accounts/', {
        name: accountName,
        currency: 'INR',
      })

      setShowCreateAccount(false)
      setNewAccountName('')
      setSuccess(`${accountName} created successfully.`)
      setAccountFilter('ALL')
      setAccountSearch('')
      await loadDashboard(true)
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Unable to create account.'))
    } finally {
      setCreatingAccount(false)
    }
  }

  const handleAccountAction = async (
    account: Account,
    action: AccountAction
  ) => {
    const actionLabels: Record<AccountAction, string> = {
      freeze: 'freeze',
      unfreeze: 'unfreeze',
      close: 'close',
    }

    const accountNumber =
      orderedAccounts.findIndex((item) => item._id === account._id) + 1

    const displayName = getAccountDisplayName(account, accountNumber)

    if (
      action === 'close' &&
      !window.confirm(
        `Are you sure you want to close ${displayName}? This action cannot be undone.`
      )
    ) {
      return
    }

    setAccountActionLoading(`${account._id}-${action}`)
    setError('')
    setSuccess('')

    try {
      await api.patch(`/accounts/${account._id}/${action}`)

      const successMessages: Record<AccountAction, string> = {
        freeze: 'Account frozen successfully.',
        unfreeze: 'Account unfrozen successfully.',
        close: 'Account closed successfully.',
      }

      setSuccess(successMessages[action])
      await loadDashboard(true)
    } catch (err: unknown) {
      setError(
        getErrorMessage(
          err,
          `Unable to ${actionLabels[action]} this account.`
        )
      )
    } finally {
      setAccountActionLoading('')
    }
  }

  const handleCopyAccountId = async (accountId: string) => {
    try {
      await navigator.clipboard.writeText(accountId)
      setCopiedAccountId(accountId)
      setSuccess('Account ID copied to clipboard.')
      setError('')

      window.setTimeout(() => {
        setCopiedAccountId((current) =>
          current === accountId ? '' : current
        )
      }, 2000)
    } catch {
      setError('Unable to copy account ID. Please copy it manually.')
      setSuccess('')
    }
  }

  const handleTransfer = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setTransferError('')
    setTransferSuccess('')

    const parsedAmount = Number(amount)
    const receiverId = receiverAccount.trim()

    if (!selectedAccount) {
      setTransferError('Please select an active sender account.')
      return
    }

    if (!receiverId) {
      setTransferError('Receiver account ID is required.')
      return
    }

    if (!/^[a-f\d]{24}$/i.test(receiverId)) {
      setTransferError(
        'Invalid account ID format. Enter the complete 24-character account ID.'
      )
      return
    }

    if (selectedAccount === receiverId) {
      setTransferError(
        'You cannot transfer money to your own account. Choose a different receiver.'
      )
      return
    }

    const sender = accounts.find(
      (account) => account._id === selectedAccount
    )

    if (!sender || sender.status !== 'ACTIVE') {
      setTransferError('Your sender account is not active.')
      return
    }

    const ownReceiver = accounts.find(
      (account) => account._id === receiverId
    )

    if (ownReceiver && ownReceiver.status !== 'ACTIVE') {
      setTransferError('The receiver account must also be ACTIVE.')
      return
    }

    if (
      !amount.trim() ||
      !Number.isFinite(parsedAmount) ||
      parsedAmount <= 0 ||
      !Number.isSafeInteger(parsedAmount * 100)
    ) {
      setTransferError(
        'Enter a valid transfer amount greater than ₹0 with at most two decimal places.'
      )
      return
    }

    const senderBalance = balances[selectedAccount] ?? 0

    if (parsedAmount > senderBalance) {
      setTransferError(
        `Insufficient balance. Your available balance is ${formatCurrency(senderBalance, sender.currency)}.`
      )
      return
    }

    if (!crypto.randomUUID) {
      setTransferError(
        'Your browser does not support secure transaction request IDs.'
      )
      return
    }

    setTransferring(true)

    try {
      await api.post('/transactions/', {
        fromAccount: selectedAccount,
        toAccount: receiverId,
        amount: parsedAmount,
        idempotencyKey: crypto.randomUUID(),
      })

      setAmount('')
      setReceiverAccount('')
      setTransferSuccess('Transfer completed successfully.')

      // Do not keep the transfer button loading while dashboard data refreshes.
      // The committed transfer is successful; refresh balances and history in background.
      void loadDashboard(true)
    } catch (err: unknown) {
      setTransferError(
        getErrorMessage(
          err,
          'Transfer failed. Please check the receiver details and try again.'
        )
      )
    } finally {
      setTransferring(false)
    }
  }

  const getTransactionDirection = (transaction: Transaction) => {
    if (transaction.transactionType === 'WELCOME_BONUS') return 'OPENING_BALANCE'

    const fromAccountId = getAccountId(transaction.fromAccount)
    const toAccountId = getAccountId(transaction.toAccount)
    const fromIsOwned = fromAccountId !== null && ownedAccountIds.has(fromAccountId)
    const toIsOwned = toAccountId !== null && ownedAccountIds.has(toAccountId)

    if (fromIsOwned && toIsOwned) return 'INTERNAL_TRANSFER'
    return fromIsOwned ? 'OUTGOING' : 'INCOMING'
  }

  const getStatusClasses = (status: Account['status']) => {
    if (status === 'ACTIVE') {
      return 'bg-emerald-50 text-emerald-700'
    }

    if (status === 'FROZEN') {
      return 'bg-amber-50 text-amber-700'
    }

    return 'bg-gray-100 text-gray-600'
  }

  const accountFilters: {
    label: string
    value: AccountFilter
  }[] = [
    { label: 'All accounts', value: 'ALL' },
    { label: 'Active', value: 'ACTIVE' },
    { label: 'Frozen', value: 'FROZEN' },
    { label: 'Closed', value: 'CLOSED' },
  ]

  return (
    <div className="min-h-screen bg-[#F4F6F3] text-[#17211F]">
      <div className="flex min-h-screen">
        <aside className="sticky top-0 z-30 flex h-screen w-20 shrink-0 flex-col overflow-y-auto border-r border-[#E5EAE5] bg-white px-3 py-6 lg:w-64 lg:px-5">
          <Link to="/dashboard" className="flex items-center justify-center gap-3 px-1 lg:justify-start">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#176B52] text-white">
              <Wallet size={23} />
            </div>
            <div className="hidden min-w-0 lg:block">
              <h1 className="truncate text-[17px] font-bold tracking-tight">
                Backend Ledger
              </h1>
              <p className="text-xs text-[#829087]">Financial workspace</p>
            </div>
          </Link>

          <div className="mt-10">
            <p className="mb-4 hidden px-3 text-[10px] font-bold tracking-[0.16em] text-[#9AA69E] lg:block">
              WORKSPACE
            </p>

            <nav className="space-y-1">
              <NavLink
                to="/dashboard#overview"
                end
                title="Overview"
                className={({ isActive }) =>
                  navItemClasses(isActive && (!activeSection || activeSection === "#overview"))
                }
              >
                <LayoutDashboard size={19} className="shrink-0" />
                <span className="hidden lg:inline">Overview</span>
              </NavLink>

              <NavLink
                to="/dashboard#accounts"
                title="Accounts"
                className={navItemClasses(
                  isDashboardActive && activeSection === '#accounts'
                )}
              >
                <Wallet size={19} className="shrink-0" />
                <span className="hidden lg:inline">Accounts</span>
              </NavLink>

              <NavLink
                to="/dashboard#transfer"
                title="Transfers"
                className={navItemClasses(
                  isDashboardActive && activeSection === '#transfer'
                )}
              >
                <ArrowLeftRight size={19} className="shrink-0" />
                <span className="hidden lg:inline">Transfers</span>
              </NavLink>

              <NavLink
                to="/transactions"
                title="Transactions"
                className={({ isActive }) => navItemClasses(isActive)}
              >
                <ReceiptText size={19} className="shrink-0" />
                <span className="hidden lg:inline">Transactions</span>
              </NavLink>

              <NavLink
                to="/analytics"
                title="Analytics"
                className={({ isActive }) => navItemClasses(isActive)}
              >
                <BarChart3 size={19} className="shrink-0" />
                <span className="hidden lg:inline">Analytics</span>
              </NavLink>
            </nav>
          </div>

          <div className="mt-auto pt-6">
            <div className="mb-5 hidden rounded-2xl bg-[#F1F5F1] p-4 lg:block">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <ShieldCheck size={17} className="text-[#176B52]" />
                Ledger security
              </div>
              <p className="mt-2 text-xs leading-5 text-[#738078]">
                Account balances are calculated from transaction ledger records.
              </p>
            </div>

            <div className="border-t border-[#E5EAE5] pt-5">
              <button
                onClick={() => void logout()}
                title="Sign out"
                aria-label="Sign out"
                className="flex w-full items-center justify-center gap-3 rounded-xl border border-[#CFE4D5] bg-[#F5FAF6] px-3 py-3 text-sm font-semibold text-[#176B52] transition hover:border-[#A9D0B5] hover:bg-[#EAF3EE] hover:text-[#12543F] lg:justify-start"
              >
                <LogOut size={19} className="shrink-0" />
                <span className="hidden lg:inline">Sign out</span>
              </button>
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 flex items-center justify-between border-b border-[#E5EAE5] bg-white/95 px-5 py-4 backdrop-blur sm:px-8 lg:px-10">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#176B52] text-white">
                <Wallet size={21} />
              </div>
              <div>
                <p className="text-sm font-bold text-[#26382E]">Backend Ledger</p>
                <p className="text-xs text-[#829087]">Financial workspace</p>
              </div>
            </div>

            <div className="flex min-w-0 items-center gap-3 rounded-xl border border-[#E1EAE3] bg-white px-4 py-2.5 shadow-sm">
              <div className="hidden min-w-0 text-right sm:block">
                <p className="truncate text-sm font-semibold">{user?.name}</p>
                <p className="truncate text-xs text-[#829087]">{user?.email}</p>
              </div>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#E4EFE8] text-sm font-bold text-[#176B52]">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
            </div>
          </header>

          <div className="mx-auto max-w-[1440px] space-y-7 px-5 py-7 sm:px-8 sm:py-9 lg:px-10">
            <section
              id="overview"
              className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"
            >
              <div>
                <p className="text-sm font-semibold text-[#176B52]">
                  YOUR WORKSPACE
                </p>
                <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
                  Good to see you, {user?.name?.split(' ')[0] || 'there'}.
                </h2>
                <p className="mt-2 text-sm text-[#718078]">
                  Here's what's happening with your accounts.
                </p>
              </div>

              <button
                onClick={() => void loadDashboard(true)}
                disabled={loading || refreshing}
                className="inline-flex h-10 items-center justify-center gap-2 self-start rounded-xl border border-[#DCE4DD] bg-white px-4 text-sm font-semibold text-[#405047] transition hover:bg-[#F4F6F3] disabled:opacity-50 sm:self-auto"
              >
                <RefreshCw
                  size={16}
                  className={refreshing ? 'animate-spin' : ''}
                />
                Refresh
              </button>
            </section>

            {error && (
              <div
                role="alert"
                className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                <AlertCircle size={18} className="mt-0.5 shrink-0" />
                <span>{error}</span>
                <button
                  onClick={() => setError('')}
                  className="ml-auto shrink-0 rounded-md p-1 hover:bg-red-100"
                  aria-label="Dismiss error"
                >
                  <X size={16} />
                </button>
              </div>
            )}

            {success && (
              <div
                role="status"
                className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
              >
                <CheckCircle2 size={18} />
                <span>{success}</span>
                <button
                  onClick={() => setSuccess('')}
                  className="ml-auto shrink-0 rounded-md p-1 hover:bg-emerald-100"
                  aria-label="Dismiss success message"
                >
                  <X size={16} />
                </button>
              </div>
            )}

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <div className="relative overflow-hidden rounded-2xl bg-[#176B52] p-6 text-white shadow-sm sm:col-span-2 xl:col-span-1">
                <div className="absolute -right-12 -top-12 h-44 w-44 rounded-full border-[28px] border-white/5" />
                <div className="relative">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-white/75">
                      Total account balance
                    </p>
                    <Wallet size={20} className="text-white/80" />
                  </div>

                  <p className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl">
                    {loading ? 'Loading...' : formatCurrency(totalBalance)}
                  </p>

                  <div className="mt-5 flex items-center gap-2 text-xs text-white/75">
                    <ShieldCheck size={14} />
                    Calculated from ledger entries
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-[#E4EAE4] bg-white p-6">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-[#718078]">
                    Total accounts
                  </p>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EFF3F0] text-[#176B52]">
                    <CreditCard size={20} />
                  </div>
                </div>
                <p className="mt-5 text-3xl font-bold">
                  {loading ? '—' : accounts.length}
                </p>
                <p className="mt-2 text-xs text-[#829087]">
                  Accounts linked to your profile
                </p>
              </div>

              <div className="rounded-2xl border border-[#E4EAE4] bg-white p-6">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-[#718078]">
                    Active accounts
                  </p>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EAF5ED] text-[#21834F]">
                    <Activity size={20} />
                  </div>
                </div>
                <p className="mt-5 text-3xl font-bold">
                  {loading ? '—' : activeAccounts}
                </p>
                <p className="mt-2 text-xs text-[#829087]">
                  Available for transactions
                </p>
              </div>
            </section>

            <section id="accounts" className="scroll-mt-24 space-y-5">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <h3 className="text-lg font-bold">Your accounts</h3>
                  <p className="mt-1 text-sm text-[#829087]">
                    Manage your INR accounts and balances.
                  </p>
                </div>

                <button
                  onClick={openCreateAccount}
                  disabled={creatingAccount}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#176B52] px-4 text-sm font-semibold text-white transition hover:bg-[#12543F] disabled:opacity-50"
                >
                  <Plus size={17} />
                  Create account
                </button>
              </div>

              {showCreateAccount && (
                <div
                  className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm"
                  onMouseDown={(event) => {
                    if (event.target === event.currentTarget && !creatingAccount) {
                      setShowCreateAccount(false)
                    }
                  }}
                >
                  <div
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="create-account-title"
                    className="w-full max-w-md rounded-2xl border border-[#E4EAE4] bg-white p-6 shadow-xl"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#EAF3EE] text-[#176B52]">
                          <Wallet size={21} />
                        </div>
                        <h3
                          id="create-account-title"
                          className="mt-4 text-lg font-bold"
                        >
                          Create a new account
                        </h3>
                        <p className="mt-1 text-sm text-[#829087]">
                          Give your account a name you'll recognize.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowCreateAccount(false)}
                        disabled={creatingAccount}
                        className="rounded-lg p-2 text-[#829087] transition hover:bg-[#F1F5F1] hover:text-[#17211F] disabled:opacity-50"
                        aria-label="Close create account form"
                      >
                        <X size={19} />
                      </button>
                    </div>

                    <form onSubmit={handleCreateAccount} className="mt-6 space-y-4">
                      <div>
                        <label
                          htmlFor="new-account-name"
                          className="mb-2 block text-sm font-semibold"
                        >
                          Account name
                        </label>
                        <input
                          id="new-account-name"
                          type="text"
                          autoFocus
                          required
                          minLength={2}
                          maxLength={30}
                          value={newAccountName}
                          onChange={(event) =>
                            setNewAccountName(event.target.value)
                          }
                          placeholder="e.g. Savings Account"
                          className="h-12 w-full rounded-xl border border-[#DCE4DD] bg-white px-3 text-sm outline-none transition placeholder:text-[#A0AAA3] focus:border-[#176B52] focus:ring-2 focus:ring-[#176B52]/10"
                        />
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <p className="text-xs text-[#829087]">
                            Choose a name between 2 and 30 characters.
                          </p>
                          <p className="shrink-0 text-xs text-[#9AA69E]">
                            {newAccountName.length}/30
                          </p>
                        </div>
                      </div>

                      <div className="rounded-xl bg-[#F4F6F3] px-4 py-3">
                        <p className="text-xs font-semibold text-[#405047]">
                          Account currency
                        </p>
                        <p className="mt-1 text-sm text-[#718078]">
                          Indian Rupee (INR ₹)
                        </p>
                      </div>

                      <div className="flex gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => setShowCreateAccount(false)}
                          disabled={creatingAccount}
                          className="h-11 flex-1 rounded-xl border border-[#DCE4DD] bg-white text-sm font-semibold text-[#405047] transition hover:bg-[#F4F6F3] disabled:opacity-50"
                        >
                          Cancel
                        </button>

                        <button
                          type="submit"
                          disabled={
                            creatingAccount ||
                            newAccountName.trim().length < 2
                          }
                          className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#176B52] text-sm font-semibold text-white transition hover:bg-[#12543F] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {creatingAccount ? (
                            <>
                              <RefreshCw size={16} className="animate-spin" />
                              Creating...
                            </>
                          ) : (
                            <>
                              <Plus size={17} />
                              Create account
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {!loading && accounts.length > 0 && (
                <div className="rounded-2xl border border-[#E4EAE4] bg-white p-4 sm:p-5">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div className="flex flex-wrap gap-2">
                      {accountFilters.map((filter) => {
                        const active = accountFilter === filter.value

                        return (
                          <button
                            key={filter.value}
                            onClick={() => setAccountFilter(filter.value)}
                            className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                              active
                                ? 'bg-[#176B52] text-white'
                                : 'bg-[#F3F6F3] text-[#65736B] hover:bg-[#E8EEE9]'
                            }`}
                          >
                            {filter.label}
                            <span
                              className={`rounded-md px-1.5 py-0.5 text-[10px] ${
                                active
                                  ? 'bg-white/15 text-white'
                                  : 'bg-white text-[#718078]'
                              }`}
                            >
                              {accountCounts[filter.value]}
                            </span>
                          </button>
                        )
                      })}
                    </div>

                    <div className="relative w-full xl:max-w-[300px]">
                      <Search
                        size={17}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9AA69E]"
                      />
                      <input
                        type="text"
                        value={accountSearch}
                        onChange={(event) =>
                          setAccountSearch(event.target.value)
                        }
                        placeholder="Search by account name or ID..."
                        aria-label="Search accounts by name or account ID"
                        className="h-10 w-full rounded-xl border border-[#DCE4DD] bg-white pl-10 pr-10 text-sm outline-none transition placeholder:text-[#A0AAA3] focus:border-[#176B52] focus:ring-2 focus:ring-[#176B52]/10"
                      />
                      {accountSearch && (
                        <button
                          onClick={() => setAccountSearch('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#829087] hover:text-[#17211F]"
                          aria-label="Clear account search"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-[#EDF0ED] pt-3">
                    <p className="text-xs text-[#829087]">
                      Showing{' '}
                      <span className="font-semibold text-[#405047]">
                        {filteredAccounts.length}
                      </span>{' '}
                      of {accounts.length} accounts
                    </p>
                    {(accountFilter !== 'ALL' || accountSearch) && (
                      <button
                        onClick={() => {
                          setAccountFilter('ALL')
                          setAccountSearch('')
                        }}
                        className="text-xs font-semibold text-[#176B52] hover:underline"
                      >
                        Clear filters
                      </button>
                    )}
                  </div>
                </div>
              )}

              {loading ? (
                <div className="rounded-2xl border border-[#E4EAE4] bg-white p-8 text-center text-sm text-[#829087]">
                  Loading your accounts...
                </div>
              ) : accounts.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#CCD8CE] bg-white p-10 text-center">
                  <Wallet size={30} className="mx-auto text-[#829087]" />
                  <p className="mt-3 font-semibold">No accounts yet</p>
                  <p className="mt-1 text-sm text-[#829087]">
                    Create your first account to get started.
                  </p>
                  <button
                    onClick={openCreateAccount}
                    disabled={creatingAccount}
                    className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#176B52] px-4 text-sm font-semibold text-white transition hover:bg-[#12543F] disabled:opacity-50"
                  >
                    <Plus size={17} />
                    Create your first account
                  </button>
                </div>
              ) : filteredAccounts.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#CCD8CE] bg-white p-10 text-center">
                  <Search size={28} className="mx-auto text-[#829087]" />
                  <p className="mt-3 font-semibold">No matching accounts</p>
                  <p className="mt-1 text-sm text-[#829087]">
                    Try changing your search or selected status filter.
                  </p>
                  <button
                    onClick={() => {
                      setAccountFilter('ALL')
                      setAccountSearch('')
                    }}
                    className="mt-4 text-sm font-semibold text-[#176B52] hover:underline"
                  >
                    Clear filters
                  </button>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {filteredAccounts.map((account) => {
                    const accountNumber =
                      orderedAccounts.findIndex(
                        (item) => item._id === account._id
                      ) + 1

                    const accountName = getAccountDisplayName(
                      account,
                      accountNumber
                    )

                    return (
                      <article
                        key={account._id}
                        className="rounded-2xl border border-[#E4EAE4] bg-white p-5 transition hover:border-[#B9D2C1] hover:shadow-sm"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#EAF3EE] text-[#176B52]">
                            <CreditCard size={21} />
                          </div>

                          <span
                            className={`rounded-full px-3 py-1 text-[11px] font-semibold ${getStatusClasses(account.status)}`}
                          >
                            {account.status}
                          </span>
                        </div>

                        <div className="mt-5 flex items-center justify-between gap-2">
                          <p className="min-w-0 truncate text-sm font-semibold">
                            {accountName}
                          </p>
                          <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-[#9AA69E]">
                            {account.currency}
                          </span>
                        </div>

                        <div className="mt-2 flex min-w-0 items-center gap-2">
                          <p
                            title={account._id}
                            className="min-w-0 flex-1 truncate font-mono text-xs text-[#829087]"
                          >
                            {shortId(account._id)}
                          </p>
                          <button
                            onClick={() => void handleCopyAccountId(account._id)}
                            title="Copy full account ID"
                            aria-label={`Copy ${accountName} ID`}
                            className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-[#E4EAE4] px-2 text-[11px] font-semibold text-[#65736B] transition hover:border-[#B9D2C1] hover:bg-[#F1F5F1] hover:text-[#176B52]"
                          >
                            {copiedAccountId === account._id ? (
                              <>
                                <Check size={13} />
                                Copied
                              </>
                            ) : (
                              <>
                                <Copy size={13} />
                                Copy ID
                              </>
                            )}
                          </button>
                        </div>

                        <div className="mt-5">
                          <p className="text-xs text-[#829087]">
                            Ledger balance
                          </p>
                          <p className="mt-1 text-2xl font-bold tracking-tight">
                            {formatCurrency(
                              balances[account._id] ?? 0,
                              account.currency
                            )}
                          </p>
                        </div>

                        <div className="mt-4 flex items-center gap-2 text-xs text-[#829087]">
                          <CalendarDays size={14} />
                          Created {formatAccountDate(account.createdAt)}
                        </div>

                        <div className="mt-5 border-t border-[#EDF0ED] pt-4">
                          {account.status === 'ACTIVE' && (
                            <div className="flex flex-wrap gap-2">
                              <button
                                onClick={() =>
                                  void handleAccountAction(account, 'freeze')
                                }
                                disabled={Boolean(accountActionLoading)}
                                className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 text-xs font-semibold text-amber-800 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <Snowflake size={15} />
                                {accountActionLoading ===
                                `${account._id}-freeze`
                                  ? 'Freezing...'
                                  : 'Freeze'}
                              </button>

                              <button
                                onClick={() =>
                                  void handleAccountAction(account, 'close')
                                }
                                disabled={Boolean(accountActionLoading)}
                                className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <XCircle size={15} />
                                {accountActionLoading ===
                                `${account._id}-close`
                                  ? 'Closing...'
                                  : 'Close'}
                              </button>
                            </div>
                          )}

                          {account.status === 'FROZEN' && (
                            <div className="flex flex-wrap gap-2">
                              <button
                                onClick={() =>
                                  void handleAccountAction(account, 'unfreeze')
                                }
                                disabled={Boolean(accountActionLoading)}
                                className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <Unlock size={15} />
                                {accountActionLoading ===
                                `${account._id}-unfreeze`
                                  ? 'Unfreezing...'
                                  : 'Unfreeze'}
                              </button>

                              <button
                                onClick={() =>
                                  void handleAccountAction(account, 'close')
                                }
                                disabled={Boolean(accountActionLoading)}
                                className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <XCircle size={15} />
                                {accountActionLoading ===
                                `${account._id}-close`
                                  ? 'Closing...'
                                  : 'Close'}
                              </button>
                            </div>
                          )}

                          {account.status === 'CLOSED' && (
                            <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 text-xs font-medium text-gray-500">
                              <XCircle size={15} />
                              This account is permanently closed.
                            </div>
                          )}
                        </div>
                      </article>
                    )
                  })}
                </div>
              )}
            </section>

            <section className="grid items-start gap-6 xl:grid-cols-[0.9fr_1.1fr]">
              <div
                id="transfer"
                className="scroll-mt-24 rounded-2xl border border-[#E4EAE4] bg-white p-5 sm:p-6"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EAF3EE] text-[#176B52]">
                    <ArrowLeftRight size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold">Transfer money</h3>
                    <p className="text-xs text-[#829087]">
                      Move funds between accounts.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleTransfer} className="mt-6 space-y-4">
                  <div>
                    <label
                      htmlFor="sender"
                      className="mb-2 block text-sm font-semibold"
                    >
                      From account
                    </label>

                    <select
                      id="sender"
                      value={selectedAccount}
                      onChange={(event) => {
                        setSelectedAccount(event.target.value)
                        setTransferError('')
                        setTransferSuccess('')
                      }}
                      className="h-12 w-full rounded-xl border border-[#DCE4DD] bg-white px-3 text-sm outline-none transition focus:border-[#176B52] focus:ring-2 focus:ring-[#176B52]/10"
                    >
                      <option value="">Select sender account</option>
                      {orderedAccounts
                        .filter((account) => account.status === 'ACTIVE')
                        .map((account) => {
                          const accountNumber =
                            orderedAccounts.findIndex(
                              (item) => item._id === account._id
                            ) + 1

                          return (
                            <option key={account._id} value={account._id}>
                              {getAccountDisplayName(account, accountNumber)} —{' '}
                              {formatCurrency(
                                balances[account._id] ?? 0,
                                account.currency
                              )}
                            </option>
                          )
                        })}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="receiver"
                      className="mb-2 block text-sm font-semibold"
                    >
                      Receiver account ID
                    </label>

                    <input
                      id="receiver"
                      type="text"
                      value={receiverAccount}
                      onChange={(event) => {
                        setReceiverAccount(event.target.value)
                        setTransferError('')
                        setTransferSuccess('')
                      }}
                      placeholder="Paste receiver's account ID"
                      autoComplete="off"
                      className="h-12 w-full rounded-xl border border-[#DCE4DD] bg-white px-3 font-mono text-sm outline-none transition placeholder:font-sans placeholder:text-[#A0AAA3] focus:border-[#176B52] focus:ring-2 focus:ring-[#176B52]/10"
                    />

                    <p className="mt-2 text-xs text-[#829087]">
                      Enter the complete 24-character receiver account ID.
                    </p>
                  </div>

                  <div>
                    <label
                      htmlFor="amount"
                      className="mb-2 block text-sm font-semibold"
                    >
                      Amount (INR)
                    </label>

                    <div className="flex h-12 items-center rounded-xl border border-[#DCE4DD] bg-white px-3 focus-within:border-[#176B52] focus-within:ring-2 focus-within:ring-[#176B52]/10">
                      <span className="mr-2 font-semibold text-[#829087]">₹</span>
                      <input
                        id="amount"
                        type="number"
                        step="any"
                        value={amount}
                        onChange={(event) => {
                          setAmount(event.target.value)
                          setTransferError('')
                          setTransferSuccess('')
                        }}
                        placeholder="0.00"
                        className="h-full w-full bg-transparent text-sm outline-none"
                      />
                    </div>
                  </div>

                  {transferError && (
                    <div
                      role="alert"
                      className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm leading-5 text-red-700"
                    >
                      <AlertCircle size={18} className="mt-0.5 shrink-0" />
                      <span>{transferError}</span>
                      <button
                        type="button"
                        onClick={() => setTransferError('')}
                        className="ml-auto shrink-0 rounded-md p-1 hover:bg-red-100"
                        aria-label="Dismiss transfer error"
                      >
                        <X size={15} />
                      </button>
                    </div>
                  )}

                  {transferSuccess && (
                    <div
                      role="status"
                      className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-sm leading-5 text-emerald-800"
                    >
                      <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
                      <span>{transferSuccess}</span>
                      <button
                        type="button"
                        onClick={() => setTransferSuccess('')}
                        className="ml-auto shrink-0 rounded-md p-1 hover:bg-emerald-100"
                        aria-label="Dismiss transfer success message"
                      >
                        <X size={15} />
                      </button>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={
                      transferring ||
                      loading ||
                      !accounts.some(
                        (account) =>
                          account._id === selectedAccount &&
                          account.status === 'ACTIVE'
                      )
                    }
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#176B52] text-sm font-semibold text-white transition hover:bg-[#12543F] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {transferring ? 'Processing transfer...' : 'Transfer money'}
                    {!transferring && <ArrowRight size={17} />}
                  </button>

                  <p className="text-center text-xs leading-5 text-[#829087]">
                    Transfers are processed atomically through the backend ledger.
                  </p>
                </form>
              </div>

              <div
                id="activity"
                className="scroll-mt-24 rounded-2xl border border-[#E4EAE4] bg-white p-5 sm:p-6"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-bold">Recent transactions</h3>
                    <p className="mt-1 text-xs text-[#829087]">
                      Latest activity across your accounts.
                    </p>
                  </div>

                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EFF3F0] text-[#176B52]">
                    <ReceiptText size={20} />
                  </div>
                </div>

                {loading ? (
                  <div className="py-12 text-center text-sm text-[#829087]">
                    Loading transactions...
                  </div>
                ) : transactions.length === 0 ? (
                  <div className="py-12 text-center">
                    <ReceiptText
                      size={30}
                      className="mx-auto text-[#A0AAA3]"
                    />
                    <p className="mt-3 text-sm font-semibold">
                      No transactions yet
                    </p>
                    <p className="mt-1 text-xs text-[#829087]">
                      Your transaction history will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="mt-5 divide-y divide-[#EDF0ED]">
                    {transactions.map((transaction) => {
                      const direction = getTransactionDirection(transaction)
                      const outgoing = direction === 'OUTGOING'
                      const internalTransfer = direction === 'INTERNAL_TRANSFER'
                      const openingBalance = direction === 'OPENING_BALANCE'
                      const fromAccountId = getAccountId(transaction.fromAccount)
                      const toAccountId = getAccountId(transaction.toAccount)
                      const ownAccountId = outgoing ? fromAccountId : toAccountId

                      return (
                        <div
                          key={transaction._id}
                          className="flex items-center gap-3 py-4 first:pt-0 last:pb-0"
                        >
                          <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                              outgoing
                                ? 'bg-red-50 text-red-600'
                                : internalTransfer
                                  ? 'bg-sky-50 text-sky-700'
                                  : 'bg-emerald-50 text-emerald-700'
                            }`}
                          >
                            {outgoing ? (
                              <ArrowUpRight size={19} />
                            ) : internalTransfer ? (
                              <ArrowLeftRight size={19} />
                            ) : (
                              <ArrowDownLeft size={19} />
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold">
                              {openingBalance
                                ? 'Opening balance · Welcome credit'
                                : internalTransfer
                                  ? 'Transfer between your accounts'
                                  : outgoing
                                    ? 'Money sent'
                                    : 'Money received'}
                            </p>
                            <p className="mt-1 truncate text-xs text-[#829087]">
                              {openingBalance
                                ? 'Initial account credit'
                                : internalTransfer
                                  ? `From ${getAccountReferenceLabel(fromAccountId)} to ${getAccountReferenceLabel(toAccountId)}`
                                  : outgoing
                                    ? `To: ${getAccountReferenceLabel(toAccountId)}`
                                    : `From: ${getAccountReferenceLabel(fromAccountId)}`}
                            </p>
                            <p className="mt-1 text-[11px] text-[#9AA69E]">
                              {formatDate(transaction.createdAt)}
                            </p>
                          </div>

                          <div className="shrink-0 text-right">
                            <p
                              className={`text-sm font-bold ${
                                outgoing
                                  ? 'text-red-600'
                                  : 'text-emerald-700'
                              }`}
                            >
                              {outgoing ? '-' : '+'}
                              {formatCurrency(transaction.amount)}
                            </p>
                            <p
                              className={`mt-1 text-[10px] font-semibold ${
                                transaction.status === 'COMPLETED'
                                  ? 'text-emerald-700'
                                  : transaction.status === 'PENDING'
                                    ? 'text-amber-700'
                                    : 'text-red-600'
                              }`}
                            >
                              {transaction.status}
                            </p>
                            <p className="mt-1 text-[10px] text-[#A0AAA3]">
                              {getAccountReferenceLabel(ownAccountId)}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </section>

            <footer className="flex flex-col justify-between gap-2 border-t border-[#E4EAE4] py-5 text-xs text-[#829087] sm:flex-row">
              <p>© 2026 Backend Ledger</p>
              <p className="flex items-center gap-2">
                <ShieldCheck size={14} />
                Balances sourced from immutable ledger entries
              </p>
            </footer>
          </div>
        </main>
      </div>
    </div>
  )
}

export default Dashboard