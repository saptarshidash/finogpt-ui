import type { User } from "@/features/auth/auth-types"

interface StoredSession {
  token: string | null
  user: User | null
}

const STORAGE_KEY = "finogpt.session"

const emptySession: StoredSession = {
  token: null,
  user: null,
}

export function getStoredSession(): StoredSession {
  const rawValue = window.localStorage.getItem(STORAGE_KEY)

  if (!rawValue) {
    return emptySession
  }

  try {
    return JSON.parse(rawValue) as StoredSession
  } catch {
    window.localStorage.removeItem(STORAGE_KEY)
    return emptySession
  }
}

export function persistSession(token: string, user: User | null) {
  const nextSession: StoredSession = {
    token,
    user,
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSession))
}

export function clearStoredSession() {
  window.localStorage.removeItem(STORAGE_KEY)
}
