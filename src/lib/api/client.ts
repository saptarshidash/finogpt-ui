import { clearStoredSession, getStoredSession } from "@/features/auth/auth-storage"
import type { ApiResponse } from "@/lib/types/api"

const DEFAULT_API_BASE_URL = "http://localhost:8080"
declare const __APP_ENV_DEFAULTS__: Record<string, string> | undefined

type UnauthorizedHandler = (() => void) | null

let unauthorizedHandler: UnauthorizedHandler = null

export class ApiError extends Error {
  status: number
  payload: unknown

  constructor(message: string, status: number, payload: unknown) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.payload = payload
  }
}

interface RequestConfig extends RequestInit {
  auth?: boolean
}

function isMeaningfulMessage(message: string) {
  const normalizedMessage = message.trim()

  if (!normalizedMessage) {
    return false
  }

  const technicalPatterns = [
    /^[A-Z_]+$/,
    /^\d{3}\s+[A-Z_]+$/,
    /^NOT_FOUND$/i,
    /^BAD_REQUEST$/i,
    /^INTERNAL_SERVER_ERROR$/i,
    /^Request failed$/i,
    /^Failed to fetch$/i,
    /^NetworkError/i,
  ]

  return !technicalPatterns.some((pattern) => pattern.test(normalizedMessage))
}

function getFriendlyStatusMessage(status: number) {
  switch (status) {
    case 400:
      return "We could not process that request. Please check the details and try again."
    case 401:
      return "Please sign in and try again."
    case 403:
      return "You do not have permission to do that."
    case 404:
      return "We could not find what you were looking for."
    case 409:
      return "That request could not be completed because the data is out of date."
    case 422:
      return "Some details need attention before this can continue."
    case 429:
      return "Too many requests right now. Please wait a moment and try again."
    default:
      if (status >= 500) {
        return "Something went wrong on our side. Please try again."
      }

      return "Something went wrong. Please try again."
  }
}

function getErrorMessage(
  payload: ApiResponse<unknown> | { message?: string } | null,
  status: number,
  fallbackMessage?: string,
) {
  const payloadMessage =
    payload && "message" in payload && typeof payload.message === "string"
      ? payload.message
      : null

  if (payloadMessage && isMeaningfulMessage(payloadMessage)) {
    return payloadMessage
  }

  if (fallbackMessage && isMeaningfulMessage(fallbackMessage)) {
    return fallbackMessage
  }

  return getFriendlyStatusMessage(status)
}

function isApiEnvelope<T>(payload: unknown): payload is ApiResponse<T> {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "success" in payload &&
    "data" in payload &&
    typeof payload.success === "boolean"
  )
}

function getApiBaseUrl() {
  const configuredBaseUrl =
    import.meta.env.VITE_API_BASE_URL ??
    __APP_ENV_DEFAULTS__?.VITE_API_BASE_URL ??
    DEFAULT_API_BASE_URL

  return configuredBaseUrl.replace(/\/$/, "")
}

function buildUrl(path: string) {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`
  return `${getApiBaseUrl()}${normalizedPath}`
}

async function parsePayload<T>(response: Response) {
  const responseText = await response.text()

  if (!responseText) {
    return null
  }

  try {
    return JSON.parse(responseText) as T
  } catch {
    return { message: responseText } as T
  }
}

async function request<T>(path: string, config: RequestConfig = {}) {
  const { auth = true, body, headers, ...init } = config
  const session = getStoredSession()
  const nextHeaders = new Headers(headers)

  if (auth && session.token) {
    nextHeaders.set("Authorization", `Bearer ${session.token}`)
  }

  if (body && !(body instanceof FormData) && !nextHeaders.has("Content-Type")) {
    nextHeaders.set("Content-Type", "application/json")
  }

  if (!nextHeaders.has("Accept")) {
    nextHeaders.set("Accept", "application/json")
  }

  let response: Response

  try {
    response = await fetch(buildUrl(path), {
      ...init,
      body,
      headers: nextHeaders,
    })
  } catch {
    throw new ApiError(
      "Unable to reach the service right now. Please check your connection and try again.",
      0,
      null,
    )
  }

  const payload = await parsePayload<ApiResponse<T> | { message?: string }>(response)

  if (!response.ok) {
    if (response.status === 401 && auth) {
      clearStoredSession()
      unauthorizedHandler?.()
    }

    const message = getErrorMessage(payload, response.status, response.statusText)

    throw new ApiError(message, response.status, payload)
  }

  if (!payload || !("success" in payload)) {
    throw new ApiError(
      "We received an unexpected response. Please try again.",
      response.status,
      payload,
    )
  }

  if (!payload.success) {
    throw new ApiError(
      getErrorMessage(payload, response.status),
      response.status,
      payload,
    )
  }

  return payload
}

async function requestRaw<T>(path: string, config: RequestConfig = {}) {
  const { auth = true, body, headers, ...init } = config
  const session = getStoredSession()
  const nextHeaders = new Headers(headers)

  if (auth && session.token) {
    nextHeaders.set("Authorization", `Bearer ${session.token}`)
  }

  if (body && !(body instanceof FormData) && !nextHeaders.has("Content-Type")) {
    nextHeaders.set("Content-Type", "application/json")
  }

  if (!nextHeaders.has("Accept")) {
    nextHeaders.set("Accept", "application/json")
  }

  let response: Response

  try {
    response = await fetch(buildUrl(path), {
      ...init,
      body,
      headers: nextHeaders,
    })
  } catch {
    throw new ApiError(
      "Unable to reach the service right now. Please check your connection and try again.",
      0,
      null,
    )
  }

  const payload = await parsePayload<T | ApiResponse<T> | { message?: string }>(response)

  if (!response.ok) {
    const message = getErrorMessage(
      isApiEnvelope(payload) ? payload : (payload as { message?: string } | null),
      response.status,
      response.statusText,
    )

    throw new ApiError(message, response.status, payload)
  }

  if (isApiEnvelope<T>(payload)) {
    if (!payload.success) {
      throw new ApiError(
        getErrorMessage(payload, response.status),
        response.status,
        payload,
      )
    }

    return payload.data
  }

  if (payload === null) {
    throw new ApiError(
      "We received an unexpected response. Please try again.",
      response.status,
      payload,
    )
  }

  return payload as T
}

export const apiClient = {
  delete<T>(path: string, config?: Omit<RequestConfig, "method">) {
    return request<T>(path, { ...config, method: "DELETE" })
  },
  get<T>(path: string, config?: Omit<RequestConfig, "method">) {
    return request<T>(path, { ...config, method: "GET" })
  },
  post<T>(
    path: string,
    payload?: BodyInit | object,
    config?: Omit<RequestConfig, "body" | "method">,
  ) {
    const body =
      payload && !(payload instanceof FormData) && typeof payload !== "string"
        ? JSON.stringify(payload)
        : payload

    return request<T>(path, { ...config, body, method: "POST" })
  },
  put<T>(
    path: string,
    payload?: BodyInit | object,
    config?: Omit<RequestConfig, "body" | "method">,
  ) {
    const body =
      payload && !(payload instanceof FormData) && typeof payload !== "string"
        ? JSON.stringify(payload)
        : payload

    return request<T>(path, { ...config, body, method: "PUT" })
  },
  postRaw<T>(
    path: string,
    payload?: BodyInit | object,
    config?: Omit<RequestConfig, "body" | "method">,
  ) {
    const body =
      payload && !(payload instanceof FormData) && typeof payload !== "string"
        ? JSON.stringify(payload)
        : payload

    return requestRaw<T>(path, { ...config, body, method: "POST" })
  },
}

export function registerUnauthorizedHandler(handler: () => void) {
  unauthorizedHandler = handler

  return () => {
    if (unauthorizedHandler === handler) {
      unauthorizedHandler = null
    }
  }
}

export { getApiBaseUrl }
