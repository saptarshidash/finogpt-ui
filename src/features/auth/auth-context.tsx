/* eslint-disable react-refresh/only-export-components */

import type { ReactNode } from "react"
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  ApiError,
  apiClient,
  registerUnauthorizedHandler,
} from "@/lib/api/client"
import {
  clearStoredSession,
  getStoredSession,
  persistSession,
} from "@/features/auth/auth-storage"
import type {
  AuthResponse,
  AuthStatus,
  LoginPayload,
  SignupPayload,
  User,
} from "@/features/auth/auth-types"

const currentUserQueryKey = ["auth", "me"] as const

interface AuthContextValue {
  bootstrapError: string | null
  login: (payload: LoginPayload) => Promise<void>
  logout: () => void
  retryBootstrap: () => void
  status: AuthStatus
  signup: (payload: SignupPayload) => Promise<void>
  token: string | null
  user: User | null
}

const AuthContext = createContext<AuthContextValue | null>(null)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const queryClient = useQueryClient()
  const [session, setSession] = useState(() => getStoredSession())

  const applyAuthSession = useCallback(
    (response: AuthResponse) => {
      persistSession(response.token, response.user)
      setSession({
        token: response.token,
        user: response.user,
      })
      queryClient.setQueryData(currentUserQueryKey, response.user)
    },
    [queryClient],
  )

  const logout = useCallback(() => {
    clearStoredSession()
    setSession({
      token: null,
      user: null,
    })
    queryClient.clear()
  }, [queryClient])

  const currentUserQuery = useQuery({
    queryKey: currentUserQueryKey,
    queryFn: async () => {
      const user = (await apiClient.get<User>("/api/me")).data

      if (session.token) {
        persistSession(session.token, user)
      }

      return user
    },
    enabled: Boolean(session.token),
    retry: false,
    staleTime: 5 * 60_000,
  })

  useEffect(() => registerUnauthorizedHandler(logout), [logout])

  const login = useCallback(
    async (payload: LoginPayload) => {
      const response = await apiClient.post<AuthResponse>("/auth/login", payload, {
        auth: false,
      })

      applyAuthSession(response.data)
    },
    [applyAuthSession],
  )

  const signup = useCallback(
    async (payload: SignupPayload) => {
      const response = await apiClient.postRaw<AuthResponse>("/auth/signup", payload, {
        auth: false,
      })

      applyAuthSession(response)
    },
    [applyAuthSession],
  )

  const retryBootstrap = useCallback(() => {
    void currentUserQuery.refetch()
  }, [currentUserQuery])

  const bootstrapError = useMemo(() => {
    if (!(currentUserQuery.error instanceof ApiError)) {
      return null
    }

    if (currentUserQuery.error.status === 401) {
      return null
    }

    return currentUserQuery.error.message
  }, [currentUserQuery.error])

  const status: AuthStatus = useMemo(() => {
    if (!session.token) {
      return "unauthenticated"
    }

    if (currentUserQuery.isPending) {
      return "checking"
    }

    if (currentUserQuery.isError) {
      if (
        currentUserQuery.error instanceof ApiError &&
        currentUserQuery.error.status === 401
      ) {
        return "unauthenticated"
      }

      return "error"
    }

    return "authenticated"
  }, [
    currentUserQuery.error,
    currentUserQuery.isError,
    currentUserQuery.isPending,
    session.token,
  ])

  const value = useMemo<AuthContextValue>(
    () => ({
      bootstrapError,
      login,
      logout,
      retryBootstrap,
      status,
      signup,
      token: session.token,
      user: currentUserQuery.data ?? session.user,
    }),
    [
      bootstrapError,
      currentUserQuery.data,
      login,
      logout,
      retryBootstrap,
      session.token,
      session.user,
      status,
      signup,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }

  return context
}
