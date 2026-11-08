import { useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  ClipboardList,
  LayoutDashboard,
  Loader2,
  LogOut,
  ReceiptText,
  Users,
  Wallet,
} from 'lucide-react'
import { useAuth } from '../../context/useAuth'
import './AdminLayout.css'

const navigation = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/transactions', label: 'Transactions', icon: ReceiptText },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/accounts', label: 'Accounts', icon: Wallet },
  { to: '/admin/audit-logs', label: 'Audit Logs', icon: ClipboardList },
]

const pageTitles: Record<string, string> = {
  '/admin/dashboard': 'Dashboard Overview',
  '/admin/transactions': 'Transactions',
  '/admin/users': 'Users',
  '/admin/accounts': 'Accounts',
  '/admin/audit-logs': 'Audit Logs',
}

const AdminLayout = () => {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [loggingOut, setLoggingOut] = useState(false)

  const handleLogout = async () => {
    if (loggingOut) return
    setLoggingOut(true)
    try {
      await logout()
    } catch (error) {
      console.error('Admin logout failed:', error)
    } finally {
      navigate('/login', { replace: true })
      setLoggingOut(false)
    }
  }

  const displayName = user?.name?.trim() || 'Admin'
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part: string) => part.charAt(0).toUpperCase())
    .join('') || 'A'

  const navClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
      isActive
        ? 'bg-[#EAF3EE] text-[#176B52]'
        : 'text-[#758179] hover:bg-[#F3F7F4] hover:text-[#176B52]'
    }`

  const mobileNavClass = ({ isActive }: { isActive: boolean }) =>
    `flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-lg py-1 text-[10px] font-semibold transition-colors ${
      isActive ? 'text-[#176B52]' : 'text-[#829087]'
    }`

  return (
    <div className="admin-layout min-h-screen bg-[#F6F9F6] text-[#24352C]">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[250px] flex-col border-r border-[#E1EAE3] bg-white lg:flex">
        <div className="flex h-[82px] items-center gap-3 border-b border-[#E8EEE9] px-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#176B52] text-white">
            <Wallet size={22} />
          </div>
          <div>
            <h1 className="text-[19px] font-bold tracking-tight text-[#176B52]">Backend Ledger</h1>
            <p className="text-[10px] font-semibold uppercase tracking-[1.7px] text-[#829087]">Admin Console</p>
          </div>
        </div>

        <div className="px-5 pt-8">
          <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[1.5px] text-[#A0AAA3]">Workspace</p>
          <nav className="space-y-1.5">
            {navigation.map(({ to, label, icon: Icon, end }) => (
              <NavLink key={to} to={to} end={end} className={navClass}>
                <Icon size={19} />
                {label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="mt-auto border-t border-[#E8EEE9] p-5">
          <button
            type="button"
            onClick={() => void handleLogout()}
            disabled={loggingOut}
            className="flex w-full items-center gap-3 rounded-xl border border-[#E2ECE5] bg-[#F5F9F6] px-4 py-3 text-left transition hover:border-[#C8DDD0] hover:bg-[#EAF3EE] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#E4EFE8] text-[#176B52]">
              {loggingOut ? <Loader2 size={17} className="animate-spin" /> : <LogOut size={17} />}
            </span>
            <span>
              <span className="block text-sm font-semibold text-[#176B52]">{loggingOut ? 'Signing out...' : 'Sign out'}</span>
              <span className="block text-[11px] text-[#829087]">End your session</span>
            </span>
          </button>
        </div>
      </aside>

      <main className="min-h-screen lg:ml-[250px]">
        <header className="sticky top-0 z-30 flex h-[82px] items-center justify-between border-b border-[#E1EAE3] bg-white/95 px-5 backdrop-blur-md sm:px-8 lg:px-10">
          <div className="min-w-0">
            <p className="text-xs font-medium text-[#829087]">Backend Ledger / Admin</p>
            <h2 className="mt-1 truncate text-lg font-bold tracking-tight text-[#26382E] sm:text-xl">
              {pageTitles[location.pathname] || 'Admin Console'}
            </h2>
          </div>
        </header>

        <div className="flex justify-end px-5 pt-4 sm:px-8 lg:px-10">
          <div className="flex min-w-0 items-center gap-3 rounded-xl border border-[#E1EAE3] bg-white px-4 py-2.5 shadow-sm">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#E4EFE8] text-sm font-bold text-[#176B52]">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="max-w-[190px] truncate text-sm font-semibold text-[#26382E]">{displayName}</p>
              <p className="max-w-[190px] truncate text-[11px] text-[#829087]">{user?.email || 'Administrator'}</p>
            </div>
          </div>
        </div>

        <div className="admin-layout-content min-w-0">
          <Outlet />
        </div>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-[#DCE9E0] bg-white px-1.5 py-2 shadow-[0_-4px_15px_rgba(25,65,43,0.05)] lg:hidden">
        {navigation.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={mobileNavClass}>
            <Icon size={19} />
            <span className="truncate">{label}</span>
          </NavLink>
        ))}
        <button
          type="button"
          onClick={() => void handleLogout()}
          disabled={loggingOut}
          className="flex min-w-0 flex-1 flex-col items-center justify-center gap-1 py-1 text-[10px] font-semibold text-[#176B52] disabled:opacity-50"
        >
          {loggingOut ? <Loader2 size={19} className="animate-spin" /> : <LogOut size={19} />}
          <span>Sign out</span>
        </button>
      </nav>
    </div>
  )
}

export default AdminLayout
