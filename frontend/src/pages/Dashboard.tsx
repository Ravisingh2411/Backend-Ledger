
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  Activity,
  AlertCircle,
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Plus,
  RefreshCw,
  ReceiptText,
  ShieldCheck,
  Wallet,
  Snowflake,
  Unlock,
  XCircle,
} from 'lucide-react'

import { useAuth } from '../context/AuthContext'
import api from '../services/api'

interface Account {
  _id: string
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
  fromAccount: string | AccountReference
  toAccount: string | AccountReference
  amount: number
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REVERSED'
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

function getAccountId(account: string | AccountReference): string {
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

function shortId(id: string) {
  return `${id.slice(0, 8)}...${id.slice(-4)}`
}

function getErrorMessage(err: unknown, fallback: string) {
  const message = (
    err as { response?: { data?: { message?: string } } }
  )?.response?.data?.message

  return message || fallback
}

function Dashboard() {
  const { user, logout } = useAuth()

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
  const [creatingAccount, setCreatingAccount] = useState(false)
  const [accountActionLoading, setAccountActionLoading] = useState('')

  const loadDashboard = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    setError('')

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
    void loadDashboard()
  }, [loadDashboard])

  const totalBalance = useMemo(
    () =>
      accounts.reduce(
        (total, account) => total + (balances[account._id] ?? 0),
        0
      ),
    [accounts, balances]
  )

  const activeAccounts = accounts.filter(
    (account) => account.status === 'ACTIVE'
  ).length

  const ownedAccountIds = useMemo(
    () => new Set(accounts.map((account) => account._id)),
    [accounts]
  )

  const handleCreateAccount = async () => {
    setCreatingAccount(true)
    setError('')
    setSuccess('')

    try {
      await api.post('/accounts/', {
        currency: 'INR',
      })

      setSuccess('New INR account created successfully.')
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

    if (
      action === 'close' &&
      !window.confirm(
        `Are you sure you want to close Account ${accounts.indexOf(account) + 1}? This action cannot be undone.`
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

  const handleTransfer = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setSuccess('')

    const parsedAmount = Number(amount)
    const receiverId = receiverAccount.trim()

    if (!selectedAccount || !receiverId) {
      setError('Please select a sender and enter a receiver account ID.')
      return
    }

    if (selectedAccount === receiverId) {
      setError('Sender and receiver accounts must be different.')
      return
    }

    const ownReceiver = accounts.find(
      (account) => account._id === receiverId
    )

    if (ownReceiver && ownReceiver.status !== 'ACTIVE') {
      setError('The receiver account must also be ACTIVE.')
      return
    }

    if (
      !Number.isFinite(parsedAmount) ||
      parsedAmount <= 0 ||
      !Number.isSafeInteger(parsedAmount * 100)
    ) {
      setError('Enter a valid amount with at most two decimal places.')
      return
    }

    if (!crypto.randomUUID) {
      setError('Your browser does not support secure transaction request IDs.')
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
      setSuccess('Transfer completed successfully.')
      await loadDashboard(true)
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Transfer failed. Please try again.'))
    } finally {
      setTransferring(false)
    }
  }

  const getTransactionDirection = (transaction: Transaction) => {
    return ownedAccountIds.has(getAccountId(transaction.fromAccount))
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

  return (
    <div className="min-h-screen bg-[#F4F6F3] text-[#17211F]">
      <div className="flex min-h-screen">
        <aside className="hidden w-[250px] shrink-0 flex-col border-r border-[#E5EAE5] bg-white px-5 py-7 lg:flex">
          <div className="flex items-center gap-3 px-2">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#176B52] text-white">
              <Wallet size={23} />
            </div>
            <div>
              <h1 className="text-[17px] font-bold tracking-tight">
                Backend Ledger
              </h1>
              <p className="text-xs text-[#829087]">Financial workspace</p>
            </div>
          </div>

          <div className="mt-12">
            <p className="mb-4 px-3 text-[10px] font-bold tracking-[0.16em] text-[#9AA69E]">
              WORKSPACE
            </p>

            <nav className="space-y-1">
              <a
                href="#overview"
                className="flex items-center gap-3 rounded-xl bg-[#EAF3EE] px-3 py-3 text-sm font-semibold text-[#176B52]"
              >
                <LayoutDashboard size={18} />
                Overview
              </a>

              <a
                href="#accounts"
                className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-[#65736B] transition hover:bg-[#F4F6F3]"
              >
                <Wallet size={18} />
                Accounts
              </a>

              <a
                href="#transfer"
                className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-[#65736B] transition hover:bg-[#F4F6F3]"
              >
                <ArrowLeftRight size={18} />
                Transfers
              </a>

              <a
                href="#activity"
                className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-[#65736B] transition hover:bg-[#F4F6F3]"
              >
                <ReceiptText size={18} />
                Transactions
              </a>
            </nav>
          </div>

          <div className="mt-auto rounded-2xl bg-[#F1F5F1] p-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <ShieldCheck size={17} className="text-[#176B52]" />
              Ledger security
            </div>
            <p className="mt-2 text-xs leading-5 text-[#738078]">
              Account balances are calculated from transaction ledger records.
            </p>
          </div>

          <button
            onClick={() => void logout()}
            className="mt-5 flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-[#65736B] transition hover:bg-red-50 hover:text-red-600"
          >
            <LogOut size={18} />
            Sign out
          </button>
        </aside>

        <main className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 flex items-center justify-between border-b border-[#E5EAE5] bg-white/95 px-5 py-4 backdrop-blur sm:px-8 lg:px-10">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#176B52] text-white lg:hidden">
                <Wallet size={21} />
              </div>

              <div>
                <p className="text-sm font-bold">Backend Ledger</p>
                <p className="text-xs text-[#829087]">Your financial overview</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-semibold">{user?.name}</p>
                <p className="text-xs text-[#829087]">{user?.email}</p>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#E4EFE8] text-sm font-bold text-[#176B52]">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </div>

              <button
                onClick={() => void logout()}
                className="rounded-lg p-2 text-[#718078] hover:bg-red-50 hover:text-red-600 lg:hidden"
                aria-label="Sign out"
              >
                <LogOut size={19} />
              </button>
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
              </div>
            )}

            {success && (
              <div
                role="status"
                className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
              >
                <CheckCircle2 size={18} />
                {success}
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

            <section id="accounts" className="scroll-mt-24 space-y-4">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <h3 className="text-lg font-bold">Your accounts</h3>
                  <p className="mt-1 text-sm text-[#829087]">
                    Manage your INR accounts and balances.
                  </p>
                </div>

                <button
                  onClick={() => void handleCreateAccount()}
                  disabled={creatingAccount}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#176B52] px-4 text-sm font-semibold text-white transition hover:bg-[#12543F] disabled:opacity-50"
                >
                  <Plus size={17} />
                  {creatingAccount ? 'Creating...' : 'Create account'}
                </button>
              </div>

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
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {accounts.map((account, index) => (
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

                      <p className="mt-5 text-sm font-semibold">
                        Account {index + 1}
                      </p>
                      <p className="mt-1 font-mono text-xs text-[#829087]">
                        {shortId(account._id)}
                      </p>

                      <p className="mt-5 text-xs text-[#829087]">
                        Ledger balance
                      </p>
                      <p className="mt-1 text-2xl font-bold tracking-tight">
                        {formatCurrency(
                          balances[account._id] ?? 0,
                          account.currency
                        )}
                      </p>

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
                  ))}
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
                      required
                      value={selectedAccount}
                      onChange={(event) => setSelectedAccount(event.target.value)}
                      className="h-12 w-full rounded-xl border border-[#DCE4DD] bg-white px-3 text-sm outline-none transition focus:border-[#176B52] focus:ring-2 focus:ring-[#176B52]/10"
                    >
                      <option value="">Select sender account</option>
                      {accounts
                        .filter((account) => account.status === 'ACTIVE')
                        .map((account) => (
                          <option key={account._id} value={account._id}>
                            Account {accounts.indexOf(account) + 1} —{' '}
                            {formatCurrency(
                              balances[account._id] ?? 0,
                              account.currency
                            )}
                          </option>
                        ))}
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
                      required
                      value={receiverAccount}
                      onChange={(event) => setReceiverAccount(event.target.value)}
                      placeholder="Paste receiver's account ID"
                      className="h-12 w-full rounded-xl border border-[#DCE4DD] bg-white px-3 font-mono text-sm outline-none transition placeholder:font-sans placeholder:text-[#A0AAA3] focus:border-[#176B52] focus:ring-2 focus:ring-[#176B52]/10"
                    />

                    <p className="mt-2 text-xs text-[#829087]">
                      The receiver account must be active.
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
                        required
                        min="0.01"
                        step="0.01"
                        value={amount}
                        onChange={(event) => setAmount(event.target.value)}
                        placeholder="0.00"
                        className="h-full w-full bg-transparent text-sm outline-none"
                      />
                    </div>
                  </div>

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
                      const outgoing = getTransactionDirection(transaction)
                      const ownAccountId = outgoing
                        ? getAccountId(transaction.fromAccount)
                        : getAccountId(transaction.toAccount)

                      const otherAccountId = outgoing
                        ? getAccountId(transaction.toAccount)
                        : getAccountId(transaction.fromAccount)

                      return (
                        <div
                          key={transaction._id}
                          className="flex items-center gap-3 py-4 first:pt-0 last:pb-0"
                        >
                          <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                              outgoing
                                ? 'bg-red-50 text-red-600'
                                : 'bg-emerald-50 text-emerald-700'
                            }`}
                          >
                            {outgoing ? (
                              <ArrowUpRight size={19} />
                            ) : (
                              <ArrowDownLeft size={19} />
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold">
                              {outgoing ? 'Money sent' : 'Money received'}
                            </p>
                            <p className="mt-1 truncate text-xs text-[#829087]">
                              {outgoing ? 'To: ' : 'From: '}
                              {shortId(otherAccountId)}
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
                              {shortId(ownAccountId)}
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
