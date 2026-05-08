export interface User {
  id: number
  name: string
  email: string
  phone: string
}

export interface AuthResponse {
  token: string
  user: User
}

export interface LoginPayload {
  email: string
  password: string
}

export interface SignupPayload {
  name: string
  email: string
  phone: string | null
  password: string
}

export type AuthStatus =
  | "checking"
  | "authenticated"
  | "unauthenticated"
  | "error"
