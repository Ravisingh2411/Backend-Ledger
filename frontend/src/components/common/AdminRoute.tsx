import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'

function AdminRoute() {
  const { user, isAuthenticated, initializing } = useAuth()

  if (initializing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-300">
        Checking admin access...
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (user?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}

export default AdminRoute
