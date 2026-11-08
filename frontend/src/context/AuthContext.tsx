import { useEffect, useRef, useState, type ReactNode } from 'react'
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
  const [loading, setLoading] = useState(false)
  const [initializing, setInitializing] = useState(true)
  const authRequestStarted = useRef(false)

  useEffect(() => {
    let isMounted = true

    localStorage.removeItem('token')
    localStorage.removeItem('user')

    const restoreSession = async () => {
      try {
        const response = await api.get<{ user: User }>('/auth/me')

        if (isMounted && !authRequestStarted.current) {
          setUser(response.data.user)
        }
      } catch {
        if (isMounted && !authRequestStarted.current) {
          setUser(null)
        }
      } finally {
        if (isMounted) {
          setInitializing(false)
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
    authRequestStarted.current = true
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
    authRequestStarted.current = true
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
        initializing,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
