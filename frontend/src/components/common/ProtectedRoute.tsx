import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'

function ProtectedRoute() {
  const { isAuthenticated, initializing } = useAuth()

  if (initializing) {
    return (
      <div className="min-h-screen grid place-items-center text-sm text-slate-500">
        Restoring your session...
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}

export default ProtectedRoute
