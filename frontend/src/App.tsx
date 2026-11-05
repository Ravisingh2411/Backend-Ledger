
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './components/common/ProtectedRoute'
import Login from './pages/Login'
import Register from './pages/Register'
import { useAuth } from './context/AuthContext'

function DashboardPlaceholder() {
  const { user, logout } = useAuth()

  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas p-6">
      <div className="w-full max-w-lg rounded-2xl border border-line bg-white p-8">
        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-brand text-xl font-bold text-white">
          B
        </div>

        <h1 className="text-2xl font-semibold">Welcome, {user?.name}</h1>

        <p className="mt-3 text-sm text-muted">
          Your account is authenticated. The full dashboard will be built next.
        </p>

        <button
          onClick={logout}
          className="mt-7 rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white hover:bg-brand-dark"
        >
          Sign out
        </button>
      </div>
    </main>
  )
}

function App() {
  const { isAuthenticated } = useAuth()

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <Navigate
              to={isAuthenticated ? '/dashboard' : '/login'}
              replace
            />
          }
        />

        <Route
          path="/login"
          element={
            isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />
          }
        />

        <Route
          path="/register"
          element={
            isAuthenticated ? <Navigate to="/dashboard" replace /> : <Register />
          }
        />

        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardPlaceholder />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
