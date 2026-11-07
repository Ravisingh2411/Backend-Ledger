
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  RefreshCw,
  TrendingUp,
  Activity,
  ReceiptText,
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
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [accountIds, setAccountIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

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
    <main className="min-h-screen bg-[#f6f8f5] px-5 py-8 text-[#172b24]">
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
      </div>
    </main>
  )
}
