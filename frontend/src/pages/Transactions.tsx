
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Printer,
  Search,
  RefreshCw,
  ReceiptText,
  X,
} from 'lucide-react'
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

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, character => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }

    return entities[character]
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

export default function Transactions() {
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
      setAccountIds(accountResponse.data.accounts.map(account => account._id))
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
    const receiptWindow = window.open('', '_blank', 'width=800,height=900')

    if (!receiptWindow) {
      window.alert('Please allow pop-ups to print or save the receipt.')
      return
    }

    const transactionId = escapeHtml(transaction._id)
    const fromAccount = escapeHtml(getAccountId(transaction.fromAccount))
    const toAccount = escapeHtml(getAccountId(transaction.toAccount))
    const amount = escapeHtml(formatAmount(transaction.amount))
    const status = escapeHtml(transaction.status)
    const direction = escapeHtml(getDirection(transaction))
    const date = escapeHtml(formatDate(transaction.createdAt))
    const generatedDate = escapeHtml(formatDate(new Date().toISOString()))

    const statusColor =
      transaction.status === 'COMPLETED'
        ? '#047857'
        : transaction.status === 'PENDING'
          ? '#b45309'
          : transaction.status === 'FAILED'
            ? '#be123c'
            : '#475569'

    const receiptHtml = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Transaction Receipt - ${transactionId}</title>
          <style>
            * {
              box-sizing: border-box;
            }

            body {
              margin: 0;
              padding: 40px 20px;
              background: #f1f5f2;
              color: #172b24;
              font-family: Arial, Helvetica, sans-serif;
            }

            .receipt {
              max-width: 650px;
              margin: 0 auto;
              padding: 42px;
              background: #ffffff;
              border: 1px solid #e2e8e3;
              border-radius: 18px;
            }

            .brand {
              color: #176b4a;
              font-size: 25px;
              font-weight: 800;
              letter-spacing: -0.7px;
            }

            .subtitle {
              margin-top: 7px;
              color: #718078;
              font-size: 13px;
            }

            .divider {
              height: 1px;
              margin: 28px 0;
              background: #e5ebe6;
            }

            .heading {
              margin: 0;
              font-size: 21px;
            }

            .amount-box {
              margin-top: 22px;
              padding: 25px;
              border-radius: 13px;
              background: #f1f7f2;
              text-align: center;
            }

            .amount-label {
              color: #718078;
              font-size: 12px;
              text-transform: uppercase;
              letter-spacing: 1px;
            }

            .amount {
              margin-top: 10px;
              color: #176b4a;
              font-size: 32px;
              font-weight: 800;
            }

            .status {
              display: inline-block;
              margin-top: 14px;
              padding: 7px 13px;
              border-radius: 30px;
              background: #f0fdf4;
              color: ${statusColor};
              font-size: 12px;
              font-weight: 700;
            }

            .details {
              margin-top: 25px;
            }

            .detail-row {
              display: flex;
              justify-content: space-between;
              gap: 20px;
              padding: 15px 0;
              border-bottom: 1px solid #edf1ed;
            }

            .label {
              color: #718078;
              font-size: 13px;
            }

            .value {
              max-width: 65%;
              overflow-wrap: anywhere;
              color: #172b24;
              font-size: 13px;
              font-weight: 600;
              text-align: right;
            }

            .footer {
              margin-top: 30px;
              color: #849188;
              font-size: 11px;
              line-height: 1.7;
              text-align: center;
            }

            @media print {
              body {
                padding: 0;
                background: #ffffff;
              }

              .receipt {
                max-width: none;
                border: none;
                border-radius: 0;
              }

              @page {
                size: A4;
                margin: 18mm;
              }
            }

            @media (max-width: 480px) {
              .receipt {
                padding: 25px 18px;
              }

              .detail-row {
                flex-direction: column;
                gap: 7px;
              }

              .value {
                max-width: 100%;
                text-align: left;
              }
            }
          </style>
        </head>
        <body>
          <main class="receipt">
            <div class="brand">Backend Ledger</div>
            <div class="subtitle">Secure Personal Finance Management</div>

            <div class="divider"></div>

            <h1 class="heading">Transaction Receipt</h1>

            <section class="amount-box">
              <div class="amount-label">Transaction Amount</div>
              <div class="amount">${amount}</div>
              <div class="status">${status}</div>
            </section>

            <section class="details">
              <div class="detail-row">
                <span class="label">Transaction ID</span>
                <span class="value">${transactionId}</span>
              </div>

              <div class="detail-row">
                <span class="label">Direction</span>
                <span class="value">${direction}</span>
              </div>

              <div class="detail-row">
                <span class="label">From Account</span>
                <span class="value">${fromAccount}</span>
              </div>

              <div class="detail-row">
                <span class="label">To Account</span>
                <span class="value">${toAccount}</span>
              </div>

              <div class="detail-row">
                <span class="label">Transaction Date</span>
                <span class="value">${date}</span>
              </div>
            </section>

            <div class="divider"></div>

            <footer class="footer">
              This receipt was generated electronically by Backend Ledger.<br />
              Generated on ${generatedDate}.<br />
              Please retain this receipt for your personal records.
            </footer>
          </main>
        </body>
      </html>
    `

    receiptWindow.onload = () => {
      receiptWindow.focus()
      receiptWindow.print()
    }

    receiptWindow.document.open()
    receiptWindow.document.write(receiptHtml)
    receiptWindow.document.close()
  }

  const clearFilters = () => {
    setSearch('')
    setStatusFilter('ALL')
    setFromDate('')
    setToDate('')
    setCurrentPage(1)
  }

  return (
    <main className="min-h-screen bg-[#f6f8f5] px-5 py-8 text-[#172b24] sm:px-8 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link
              to="/dashboard"
              className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-[#64756b] transition hover:text-[#176b4a]"
            >
              <ArrowLeft size={16} />
              Back to dashboard
            </Link>

            <h1 className="text-3xl font-bold tracking-tight">
              Transactions
            </h1>
            <p className="mt-2 text-sm text-[#718078]">
              View and manage your complete transaction history.
            </p>
          </div>

          <button
            onClick={() => void loadTransactions(true)}
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

        <section className="mb-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-[#e5ebe6] bg-white p-5">
            <p className="text-sm text-[#718078]">Total transactions</p>
            <p className="mt-3 text-3xl font-bold">{transactions.length}</p>
            <p className="mt-1 text-xs text-[#87948c]">All recorded activity</p>
          </div>

          <div className="rounded-2xl border border-[#e5ebe6] bg-white p-5">
            <p className="text-sm text-[#718078]">Completed</p>
            <p className="mt-3 text-3xl font-bold text-emerald-700">
              {completedCount}
            </p>
            <p className="mt-1 text-xs text-[#87948c]">Successful transactions</p>
          </div>

          <div className="rounded-2xl border border-[#e5ebe6] bg-white p-5">
            <p className="text-sm text-[#718078]">Pending</p>
            <p className="mt-3 text-3xl font-bold text-amber-600">
              {pendingCount}
            </p>
            <p className="mt-1 text-xs text-[#87948c]">Awaiting completion</p>
          </div>

          <div className="rounded-2xl border border-[#e5ebe6] bg-white p-5">
            <p className="text-sm text-[#718078]">Failed</p>
            <p className="mt-3 text-3xl font-bold text-rose-600">
              {failedCount}
            </p>
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
                <label
                  htmlFor="from-date"
                  className="text-xs font-semibold text-[#64756b]"
                >
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
                <label
                  htmlFor="to-date"
                  className="text-xs font-semibold text-[#64756b]"
                >
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
                            <p className="text-sm font-semibold">
                              #{shortId(transaction._id)}
                            </p>
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
                                {sent ? (
                                  <ArrowUpRight size={17} />
                                ) : (
                                  <ArrowDownLeft size={17} />
                                )}
                              </span>
                              <span className="text-sm font-medium">
                                {direction}
                              </span>
                            </div>
                          </td>

                          <td className="px-6 py-5 text-xs text-[#64756b]">
                            <p>From: {shortId(getAccountId(transaction.fromAccount))}</p>
                            <p className="mt-1">
                              To: {shortId(getAccountId(transaction.toAccount))}
                            </p>
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

                  <span className="px-2 text-sm font-semibold">
                    {currentPage}
                  </span>

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
                  <h2
                    id="transaction-details-title"
                    className="text-lg font-bold"
                  >
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
                <Printer size={16} />
                Print / Save PDF
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
  )
}
