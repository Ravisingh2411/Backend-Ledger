
import { useEffect, useState, type ReactNode } from 'react'
import AuthContext from './auth-context'
import api from '../services/api'
import type {
  User,
  AuthResponse,
  LoginCredentials,
  RegisterCredentials,
} from '../types/auth'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    localStorage.removeItem('token')
    localStorage.removeItem('user')

    const restoreSession = async () => {
      try {
        const response = await api.get<{ user: User }>('/auth/me')

        if (isMounted) {
          setUser(response.data.user)
        }
      } catch {
        if (isMounted) {
          setUser(null)
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    void restoreSession()

    return () => {
      isMounted = false
    }
  }, [])

  const saveAuthData = (data: AuthResponse): User => {
    setUser(data.user)
    return data.user
  }

  const login = async (
    credentials: LoginCredentials
  ): Promise<User> => {
    setLoading(true)

    try {
      const response = await api.post<AuthResponse>(
        '/auth/login',
        credentials
      )

      return saveAuthData(response.data)
    } finally {
      setLoading(false)
    }
  }

  const register = async (
    credentials: RegisterCredentials
  ): Promise<User> => {
    setLoading(true)

    try {
      const response = await api.post<AuthResponse>(
        '/auth/register',
        credentials
      )

      return saveAuthData(response.data)
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    try {
      await api.post('/auth/logout')
    } finally {
      setUser(null)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user),
        loading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
