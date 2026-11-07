export interface User {
  _id: string
  name: string
  email: string
  role: 'user' | 'admin'
}

export interface AuthResponse {
  message?: string
  user: User
  token: string
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterCredentials {
  name: string
  email: string
  password: string
}