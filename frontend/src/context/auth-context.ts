import { createContext } from 'react'
import type {
  User,
  LoginCredentials,
  RegisterCredentials,
} from '../types/auth'

export interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  loading: boolean
  initializing: boolean
  login: (credentials: LoginCredentials) => Promise<User>
  register: (credentials: RegisterCredentials) => Promise<User>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export default AuthContext
