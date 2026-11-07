import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import ProtectedRoute from './components/common/ProtectedRoute'
import AdminRoute from './components/common/AdminRoute'

const Login = lazy(() => import('./pages/Login'))
const Register = lazy(() => import('./pages/Register'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Transactions = lazy(() => import('./pages/Transactions'))
const Analytics = lazy(() => import('./pages/Analytics'))

const AdminDashboard = lazy(() => import('./pages/AdminDashboard'))
const AdminTransactions = lazy(() => import('./pages/AdminTransactions'))
const AdminUsers = lazy(() => import('./pages/AdminUsers'))
const AdminAccounts = lazy(() => import('./pages/AdminAccounts'))

const PageLoader = () => (
  <div className="flex min-h-screen items-center justify-center bg-[#F6F9F6]">
    <div className="flex flex-col items-center gap-3">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#DCE9E0] border-t-[#176B52]" />
      <p className="text-sm font-medium text-[#829087]">
        Loading Backend Ledger...
      </p>
    </div>
  </div>
)

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Admin Routes */}
          <Route element={<AdminRoute />}>
            <Route
              path="/admin"
              element={<Navigate to="/admin/dashboard" replace />}
            />
            <Route
              path="/admin/dashboard"
              element={<AdminDashboard />}
            />
            <Route
              path="/admin/transactions"
              element={<AdminTransactions />}
            />
            <Route
              path="/admin/users"
              element={<AdminUsers />}
            />
            <Route
              path="/admin/accounts"
              element={<AdminAccounts />}
            />
          </Route>

          {/* User Routes */}
          <Route element={<ProtectedRoute />}>
            <Route
              path="/dashboard"
              element={<Dashboard />}
            />
            <Route
              path="/transactions"
              element={<Transactions />}
            />
            <Route
              path="/analytics"
              element={<Analytics />}
            />
          </Route>

          {/* Default Route */}
          <Route
            path="/"
            element={<Navigate to="/dashboard" replace />}
          />

          {/* Not Found */}
          <Route
            path="*"
            element={<Navigate to="/dashboard" replace />}
          />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

export default App