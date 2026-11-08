import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, NavLink, useNavigationType } from 'react-router-dom'
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  LayoutDashboard,
  LogOut,
  RefreshCw,
  ReceiptText,
  Search,
  ShieldCheck,
  Wallet,
  X,
} from 'lucide-react'
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

const PAGE_SIZE = 8
const SCROLL_STORAGE_KEY = 'backend-ledger-transactions-scroll'

const navigationItems = [
  { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
  { label: 'Transactions', to: '/transactions', icon: ReceiptText },
  { label: 'Analytics', to: '/analytics', icon: BarChart3 },
]

function getAccountId(account: AccountReference) {
  return typeof account === 'string' ? account : account?._id ?? ''
}

function shortId(id: string) {
  return id ? `${id.slice(0, 8)}...${id.slice(-4)}` : 'Unknown'
}

function formatAmount(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount)
}

function formatDate(date: string) {
  return new Date(date).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function escapeCsv(value: string | number) {
  const text = String(value)
  return `"${text.replace(/"/g, '""')}"`
}

function statusStyle(status: Transaction['status']) {
  switch (status) {
    case 'COMPLETED':
      return 'bg-emerald-50 text-emerald-700'
    case 'PENDING':
      return 'bg-amber-50 text-amber-700'
    case 'FAILED':
      return 'bg-rose-50 text-rose-700'
    case 'REVERSED':
      return 'bg-slate-100 text-slate-600'
    default:
      return 'bg-slate-100 text-slate-600'
  }
}

function createReceiptPdf(transaction: Transaction, direction: string) {
  const encoder = new TextEncoder()

  const sanitize = (value: string) =>
    value
      .replace(/₹/g, 'INR ')
      .replace(/[^\x20-\x7E]/g, '')
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)')

  const amount = sanitize(formatAmount(transaction.amount))
  const transactionId = sanitize(transaction._id)
  const fromAccount = sanitize(getAccountId(transaction.fromAccount))
  const toAccount = sanitize(getAccountId(transaction.toAccount))
  const status = sanitize(transaction.status)
  const transactionDirection = sanitize(direction)
  const date = sanitize(formatDate(transaction.createdAt))
  const generatedDate = sanitize(formatDate(new Date().toISOString()))

  const statusColor =
    transaction.status === 'COMPLETED'
      ? '0.02 0.47 0.35'
      : transaction.status === 'PENDING'
        ? '0.71 0.33 0.02'
        : transaction.status === 'FAILED'
          ? '0.75 0.07 0.23'
          : '0.28 0.34 0.39'

  const commands: string[] = []

  const addText = (
    text: string,
    x: number,
    y: number,
    size = 11,
    bold = false,
    color = '0.09 0.17 0.14',
  ) => {
    commands.push(
      `BT /${bold ? 'F2' : 'F1'} ${size} Tf ${color} rg 1 0 0 1 ${x} ${y} Tm (${sanitize(text)}) Tj ET`,
    )
  }

  const addLine = (x1: number, y1: number, x2: number, y2: number) => {
    commands.push(
      `0.88 0.91 0.89 RG 0.7 w ${x1} ${y1} m ${x2} ${y2} l S`,
    )
  }

  const addRect = (
    x: number,
    y: number,
    width: number,
    height: number,
    color: string,
  ) => {
    commands.push(`${color} rg ${x} ${y} ${width} ${height} re f`)
  }

  addRect(0, 0, 595, 842, '0.95 0.97 0.95')
  addRect(55, 65, 485, 712, '1 1 1')

  addText('Backend Ledger', 85, 724, 25, true, '0.09 0.42 0.29')
  addText('Secure Personal Finance Management', 85, 704, 10, false, '0.43 0.50 0.46')

  addLine(85, 680, 510, 680)

  addText('Transaction Receipt', 85, 649, 19, true)

  addRect(85, 495, 425, 125, '0.95 0.97 0.95')

  addText('TRANSACTION AMOUNT', 222, 590, 10, true, '0.43 0.50 0.46')
  addText(amount, 205, 550, 27, true, '0.09 0.42 0.29')

  addRect(245, 510, 105, 23, '0.91 0.98 0.94')
  addText(status, 267, 518, 9, true, statusColor)

  addText('Transaction ID', 85, 457, 10, false, '0.43 0.50 0.46')
  addText(transactionId, 85, 437, 11, true)
  addLine(85, 420, 510, 420)

  addText('Direction', 85, 392, 10, false, '0.43 0.50 0.46')
  addText(transactionDirection, 85, 372, 11, true)

  addText('From Account', 85, 337, 10, false, '0.43 0.50 0.46')
  addText(fromAccount, 85, 317, 10, true)

  addText('To Account', 85, 282, 10, false, '0.43 0.50 0.46')
  addText(toAccount, 85, 262, 10, true)

  addText('Transaction Date & Time', 85, 227, 10, false, '0.43 0.50 0.46')
  addText(date, 85, 207, 11, true)

  addLine(85, 185, 510, 185)

  addText(
    'This receipt was generated electronically by Backend Ledger.',
    115,
    145,
    9,
    false,
    '0.43 0.50 0.46',
  )

  addText(
    `Generated on ${generatedDate}`,
    205,
    128,
    9,
    false,
    '0.43 0.50 0.46',
  )

  const stream = commands.join('\n')

  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>',
    `<< /Length ${encoder.encode(stream).length} >>\nstream\n${stream}\nendstream`,
  ]

  let pdf = '%PDF-1.4\n'
  const offsets = [0]

  objects.forEach((object, index) => {
    offsets.push(encoder.encode(pdf).length)
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`
  })

  const xrefOffset = encoder.encode(pdf).length

  pdf += `xref\n0 ${objects.length + 1}\n`
  pdf += '0000000000 65535 f \n'

  offsets.slice(1).forEach(offset => {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`
  })

  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n`
  pdf += `startxref\n${xrefOffset}\n%%EOF`

  return new Blob([encoder.encode(pdf)], {
    type: 'application/pdf',
  })
}

export default function Transactions() {
  const { user, logout } = useAuth()

  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [accountIds, setAccountIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  const navigationType = useNavigationType()
  const hasRestoredScroll = useRef(false)

  const loadTransactions = async (refresh = false) => {
    try {
      if (refresh) setRefreshing(true)
      else setLoading(true)

      setError('')

      const [transactionResponse, accountResponse] = await Promise.all([
        api.get<TransactionsResponse>('/transactions/'),
        api.get<{ accounts: { _id: string }[] }>('/accounts/'),
      ])

      setTransactions(transactionResponse.data.transactions ?? [])
      setAccountIds(
        (accountResponse.data.accounts ?? []).map(account => account._id),
      )
    } catch {
      setError('Unable to load transactions. Please try again.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    void loadTransactions()
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

  useEffect(() => {
    if (!selectedTransaction) return

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedTransaction(null)
      }
    }

    window.addEventListener('keydown', handleEscape)

    return () => {
      window.removeEventListener('keydown', handleEscape)
    }
  }, [selectedTransaction])

  const filteredTransactions = useMemo(() => {
    const query = search.trim().toLowerCase()

    return transactions.filter(transaction => {
      const from = getAccountId(transaction.fromAccount)
      const to = getAccountId(transaction.toAccount)

      const matchesSearch =
        !query ||
        transaction._id.toLowerCase().includes(query) ||
        from.toLowerCase().includes(query) ||
        to.toLowerCase().includes(query)

      const matchesStatus =
        statusFilter === 'ALL' || transaction.status === statusFilter

      const transactionDate = new Date(transaction.createdAt)
      const start = fromDate ? new Date(`${fromDate}T00:00:00`) : null
      const end = toDate ? new Date(`${toDate}T23:59:59.999`) : null

      const matchesFromDate = !start || transactionDate >= start
      const matchesToDate = !end || transactionDate <= end

      return (
        matchesSearch &&
        matchesStatus &&
        matchesFromDate &&
        matchesToDate
      )
    })
  }, [transactions, search, statusFilter, fromDate, toDate])

  const totalPages = Math.max(
    1,
    Math.ceil(filteredTransactions.length / PAGE_SIZE),
  )

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  )

  const completedCount = transactions.filter(
    transaction => transaction.status === 'COMPLETED',
  ).length

  const pendingCount = transactions.filter(
    transaction => transaction.status === 'PENDING',
  ).length

  const failedCount = transactions.filter(
    transaction => transaction.status === 'FAILED',
  ).length

  const getDirection = (transaction: Transaction) => {
    const from = getAccountId(transaction.fromAccount)
    const to = getAccountId(transaction.toAccount)

    if (accountIds.includes(from)) return 'Sent'
    if (accountIds.includes(to)) return 'Received'
    return 'Transfer'
  }

  const exportTransactions = () => {
    if (filteredTransactions.length === 0) return

    const headers = [
      'Transaction ID',
      'Direction',
      'From Account',
      'To Account',
      'Amount (INR)',
      'Status',
      'Date',
    ]

    const rows = filteredTransactions.map(transaction => [
      transaction._id,
      getDirection(transaction),
      getAccountId(transaction.fromAccount),
      getAccountId(transaction.toAccount),
      transaction.amount,
      transaction.status,
      formatDate(transaction.createdAt),
    ])

    const csvContent = [
      headers.map(escapeCsv).join(','),
      ...rows.map(row => row.map(escapeCsv).join(',')),
    ].join('\r\n')

    const blob = new Blob(['\uFEFF' + csvContent], {
      type: 'text/csv;charset=utf-8;',
    })

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    const date = new Date().toISOString().slice(0, 10)

    link.href = url
    link.download = `backend-ledger-transactions-${date}.csv`

    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    URL.revokeObjectURL(url)
  }

  const downloadReceipt = (transaction: Transaction) => {
    try {
      const direction = getDirection(transaction)
      const blob = createReceiptPdf(transaction, direction)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')

      link.href = url
      link.download = `backend-ledger-receipt-${transaction._id}.pdf`

      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      window.setTimeout(() => {
        URL.revokeObjectURL(url)
      }, 1000)
    } catch {
      window.alert('Unable to download the receipt. Please try again.')
    }
  }

  const clearFilters = () => {
    setSearch('')
    setStatusFilter('ALL')
    setFromDate('')
    setToDate('')
    setCurrentPage(1)
  }

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
            <p className="text-xs text-[#849188]">Financial workspace</p>
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
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-[#f2d5d5] px-3 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 lg:justify-start"
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
            <p className="text-xs text-[#829087]">Your financial workspace</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden min-w-0 text-right sm:block">
              <p className="truncate text-sm font-semibold">{user?.name}</p>
              <p className="truncate text-xs text-[#829087]">{user?.email}</p>
            </div>

            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#e4efe8] text-sm font-bold text-[#176b4a]">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
          </div>
        </header>

        <div className="px-5 py-8 sm:px-8 lg:px-10">
          <div className="mx-auto max-w-7xl">
            <header className="mb-8">
              <div className="flex flex-wrap items-center justify-between gap-5">
                <div>
                  <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
                  <p className="mt-2 text-sm text-[#718078]">
                    View and manage your complete transaction history.
                  </p>
                </div>

                <button
                  onClick={() => void loadTransactions(true)}
                  disabled={refreshing}
                  className="inline-flex items-center gap-2 rounded-xl border border-[#dce5de] bg-white px-4 py-2.5 text-sm font-semibold transition hover:bg-[#f0f5f1] disabled:opacity-60"
                >
                  <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                  Refresh
                </button>
              </div>
            </header>

            <section className="mb-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-[#e5ebe6] bg-white p-5">
                <p className="text-sm text-[#718078]">Total transactions</p>
                <p className="mt-3 text-3xl font-bold">{transactions.length}</p>
                <p className="mt-1 text-xs text-[#87948c]">All recorded activity</p>
              </div>

              <div className="rounded-2xl border border-[#e5ebe6] bg-white p-5">
                <p className="text-sm text-[#718078]">Completed</p>
                <p className="mt-3 text-3xl font-bold text-emerald-700">{completedCount}</p>
                <p className="mt-1 text-xs text-[#87948c]">Successful transactions</p>
              </div>

              <div className="rounded-2xl border border-[#e5ebe6] bg-white p-5">
                <p className="text-sm text-[#718078]">Pending</p>
                <p className="mt-3 text-3xl font-bold text-amber-600">{pendingCount}</p>
                <p className="mt-1 text-xs text-[#87948c]">Awaiting completion</p>
              </div>

              <div className="rounded-2xl border border-[#e5ebe6] bg-white p-5">
                <p className="text-sm text-[#718078]">Failed</p>
                <p className="mt-3 text-3xl font-bold text-rose-600">{failedCount}</p>
                <p className="mt-1 text-xs text-[#87948c]">Unsuccessful transactions</p>
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-[#e5ebe6] bg-white">
              <div className="border-b border-[#edf1ed] p-5 sm:p-6">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <ReceiptText size={20} className="text-[#176b4a]" />
                    <h2 className="text-lg font-bold">Transaction history</h2>
                  </div>

                  <button
                    onClick={exportTransactions}
                    disabled={loading || filteredTransactions.length === 0}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#176b4a] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#12583c] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Download size={16} />
                    Export CSV
                  </button>
                </div>

                <div className="grid items-end gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <div className="relative">
                    <Search
                      size={17}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8a9890]"
                    />
                    <input
                      value={search}
                      onChange={event => {
                        setSearch(event.target.value)
                        setCurrentPage(1)
                      }}
                      placeholder="Search transaction or account ID"
                      className="w-full rounded-xl border border-[#dfe7e1] bg-[#fbfcfb] py-3 pl-10 pr-3 text-sm outline-none transition focus:border-[#398664]"
                    />
                  </div>

                  <select
                    value={statusFilter}
                    onChange={event => {
                      setStatusFilter(event.target.value)
                      setCurrentPage(1)
                    }}
                    className="rounded-xl border border-[#dfe7e1] bg-[#fbfcfb] px-3 py-3 text-sm outline-none focus:border-[#398664]"
                  >
                    <option value="ALL">All statuses</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="PENDING">Pending</option>
                    <option value="FAILED">Failed</option>
                    <option value="REVERSED">Reversed</option>
                  </select>

                  <div className="flex flex-col gap-2">
                    <label htmlFor="from-date" className="text-xs font-semibold text-[#64756b]">
                      From Date
                    </label>
                    <div className="relative">
                      <CalendarDays
                        size={16}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8a9890]"
                      />
                      <input
                        id="from-date"
                        type="date"
                        aria-label="From date"
                        value={fromDate}
                        max={toDate || undefined}
                        onChange={event => {
                          setFromDate(event.target.value)
                          setCurrentPage(1)
                        }}
                        className="w-full rounded-xl border border-[#dfe7e1] bg-[#fbfcfb] py-3 pl-10 pr-3 text-sm outline-none focus:border-[#398664]"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label htmlFor="to-date" className="text-xs font-semibold text-[#64756b]">
                      To Date
                    </label>
                    <input
                      id="to-date"
                      type="date"
                      aria-label="To date"
                      value={toDate}
                      min={fromDate || undefined}
                      onChange={event => {
                        setToDate(event.target.value)
                        setCurrentPage(1)
                      }}
                      className="w-full rounded-xl border border-[#dfe7e1] bg-[#fbfcfb] px-3 py-3 text-sm outline-none focus:border-[#398664]"
                    />
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs text-[#849188]">
                    Showing {filteredTransactions.length} matching transactions
                  </p>

                  <button
                    onClick={clearFilters}
                    className="text-sm font-semibold text-[#176b4a] hover:underline"
                  >
                    Clear filters
                  </button>
                </div>
              </div>

              {error && (
                <div className="m-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                  {error}
                  <button
                    onClick={() => void loadTransactions()}
                    className="ml-2 font-bold underline"
                  >
                    Try again
                  </button>
                </div>
              )}

              {loading ? (
                <div className="flex min-h-64 items-center justify-center gap-3 text-sm text-[#718078]">
                  <RefreshCw size={18} className="animate-spin" />
                  Loading transactions...
                </div>
              ) : paginatedTransactions.length === 0 ? (
                <div className="flex min-h-72 flex-col items-center justify-center px-5 text-center">
                  <div className="mb-4 rounded-2xl bg-[#edf5ef] p-4 text-[#398664]">
                    <ReceiptText size={28} />
                  </div>
                  <h3 className="font-bold">No transactions found</h3>
                  <p className="mt-2 max-w-sm text-sm text-[#849188]">
                    No transactions match your current filters. Try changing your
                    search or date range.
                  </p>
                  <button
                    onClick={clearFilters}
                    className="mt-4 text-sm font-semibold text-[#176b4a] hover:underline"
                  >
                    Clear all filters
                  </button>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[950px] text-left">
                      <thead className="bg-[#f8faf8] text-xs uppercase tracking-wider text-[#849188]">
                        <tr>
                          <th className="px-6 py-4 font-semibold">Transaction</th>
                          <th className="px-6 py-4 font-semibold">Direction</th>
                          <th className="px-6 py-4 font-semibold">Accounts</th>
                          <th className="px-6 py-4 font-semibold">Date</th>
                          <th className="px-6 py-4 font-semibold">Amount</th>
                          <th className="px-6 py-4 font-semibold">Status</th>
                          <th className="px-6 py-4 font-semibold">Details</th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-[#edf1ed]">
                        {paginatedTransactions.map(transaction => {
                          const direction = getDirection(transaction)
                          const sent = direction === 'Sent'

                          return (
                            <tr
                              key={transaction._id}
                              className="transition hover:bg-[#fbfdfb]"
                            >
                              <td className="px-6 py-5">
                                <p className="text-sm font-semibold">#{shortId(transaction._id)}</p>
                                <p className="mt-1 text-xs text-[#9aa59e]">
                                  ID: {transaction._id}
                                </p>
                              </td>

                              <td className="px-6 py-5">
                                <div className="flex items-center gap-2">
                                  <span className={`rounded-lg p-2 ${
                                    sent
                                      ? 'bg-amber-50 text-amber-700'
                                      : 'bg-emerald-50 text-emerald-700'
                                  }`}>
                                    {sent ? <ArrowUpRight size={17} /> : <ArrowDownLeft size={17} />}
                                  </span>
                                  <span className="text-sm font-medium">{direction}</span>
                                </div>
                              </td>

                              <td className="px-6 py-5 text-xs text-[#64756b]">
                                <p>From: {shortId(getAccountId(transaction.fromAccount))}</p>
                                <p className="mt-1">To: {shortId(getAccountId(transaction.toAccount))}</p>
                              </td>

                              <td className="px-6 py-5 text-sm text-[#64756b]">
                                {formatDate(transaction.createdAt)}
                              </td>

                              <td className="px-6 py-5">
                                <span className="text-sm font-bold">
                                  {formatAmount(transaction.amount)}
                                </span>
                              </td>

                              <td className="px-6 py-5">
                                <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${statusStyle(transaction.status)}`}>
                                  {transaction.status}
                                </span>
                              </td>

                              <td className="px-6 py-5">
                                <button
                                  onClick={() => setSelectedTransaction(transaction)}
                                  className="inline-flex items-center gap-2 rounded-lg border border-[#dce5de] px-3 py-2 text-xs font-semibold text-[#176b4a] transition hover:bg-[#edf5ef]"
                                >
                                  <Eye size={15} />
                                  View
                                </button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#edf1ed] px-5 py-4 sm:px-6">
                    <p className="text-sm text-[#849188]">
                      Page {currentPage} of {totalPages}
                    </p>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
                        disabled={currentPage === 1}
                        className="rounded-lg border border-[#dfe7e1] p-2 transition hover:bg-[#f0f5f1] disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label="Previous page"
                      >
                        <ChevronLeft size={18} />
                      </button>

                      <span className="px-2 text-sm font-semibold">{currentPage}</span>

                      <button
                        onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
                        disabled={currentPage === totalPages}
                        className="rounded-lg border border-[#dfe7e1] p-2 transition hover:bg-[#f0f5f1] disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label="Next page"
                      >
                        <ChevronRight size={18} />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </section>
          </div>
        </div>

        {selectedTransaction && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6 backdrop-blur-sm"
            onClick={() => setSelectedTransaction(null)}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="transaction-details-title"
              className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl"
              onClick={event => event.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-[#edf1ed] px-6 py-5">
                <div>
                  <div className="flex items-center gap-2">
                    <ReceiptText size={20} className="text-[#176b4a]" />
                    <h2 id="transaction-details-title" className="text-lg font-bold">
                      Transaction Details
                    </h2>
                  </div>
                  <p className="mt-1 text-xs text-[#849188]">
                    Complete information about this transaction
                  </p>
                </div>

                <button
                  onClick={() => setSelectedTransaction(null)}
                  aria-label="Close transaction details"
                  className="rounded-lg p-2 text-[#718078] transition hover:bg-[#f0f5f1] hover:text-[#172b24]"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6">
                <div className="mb-6 rounded-2xl bg-[#f3f8f4] p-5 text-center">
                  <p className="text-xs font-medium uppercase tracking-wider text-[#718078]">
                    Transaction Amount
                  </p>
                  <p className="mt-2 text-3xl font-bold text-[#176b4a]">
                    {formatAmount(selectedTransaction.amount)}
                  </p>
                  <span className={`mt-3 inline-flex rounded-full px-3 py-1.5 text-xs font-semibold ${statusStyle(selectedTransaction.status)}`}>
                    {selectedTransaction.status}
                  </span>
                </div>

                <div className="space-y-4">
                  <div className="flex flex-col gap-1 border-b border-[#edf1ed] pb-4">
                    <span className="text-xs font-medium text-[#849188]">
                      Transaction ID
                    </span>
                    <span className="break-all text-sm font-semibold text-[#172b24]">
                      {selectedTransaction._id}
                    </span>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-xl border border-[#e5ebe6] p-4">
                      <div className="mb-2 flex items-center gap-2 text-amber-700">
                        <ArrowUpRight size={17} />
                        <span className="text-xs font-semibold">From Account</span>
                      </div>
                      <p className="break-all text-sm font-semibold">
                        {getAccountId(selectedTransaction.fromAccount)}
                      </p>
                    </div>

                    <div className="rounded-xl border border-[#e5ebe6] p-4">
                      <div className="mb-2 flex items-center gap-2 text-emerald-700">
                        <ArrowDownLeft size={17} />
                        <span className="text-xs font-semibold">To Account</span>
                      </div>
                      <p className="break-all text-sm font-semibold">
                        {getAccountId(selectedTransaction.toAccount)}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-medium text-[#849188]">
                        Transaction Direction
                      </p>
                      <p className="mt-1 text-sm font-semibold">
                        {getDirection(selectedTransaction)}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-medium text-[#849188]">
                        Transaction Date & Time
                      </p>
                      <p className="mt-1 text-sm font-semibold">
                        {formatDate(selectedTransaction.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap justify-end gap-3 border-t border-[#edf1ed] bg-[#fbfcfb] px-6 py-4">
                <button
                  onClick={() => downloadReceipt(selectedTransaction)}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#176b4a] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#12583c]"
                >
                  <Download size={16} />
                  Download PDF
                </button>

                <button
                  onClick={() => setSelectedTransaction(null)}
                  className="rounded-xl border border-[#dce5de] px-5 py-2.5 text-sm font-semibold text-[#64756b] transition hover:bg-[#f0f5f1]"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
