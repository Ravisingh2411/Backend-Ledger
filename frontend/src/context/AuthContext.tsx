
import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from 'react'

import api from '../services/api'
import type {
  User,
  LoginCredentials,
  RegisterCredentials,
  AuthResponse,
} from '../types/auth'

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  loading: boolean
  login: (credentials: LoginCredentials) => Promise<void>
  register: (credentials: RegisterCredentials) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('user')
    return savedUser ? JSON.parse(savedUser) as User : null
  })

  const [loading, setLoading] = useState(false)

  const saveAuthData = (data: AuthResponse) => {
    localStorage.setItem('token', data.token)
    localStorage.setItem('user', JSON.stringify(data.user))
    setUser(data.user)
  }

  const login = async (credentials: LoginCredentials) => {
    setLoading(true)

    try {
      const response = await api.post<AuthResponse>(
        '/auth/login',
        credentials
      )

      saveAuthData(response.data)
    } finally {
      setLoading(false)
    }
  }

  const register = async (credentials: RegisterCredentials) => {
    setLoading(true)

    try {
      const response = await api.post<AuthResponse>(
        '/auth/register',
        credentials
      )

      saveAuthData(response.data)
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    try {
      await api.post('/auth/logout')
    } finally {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
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

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }

  return context
}
