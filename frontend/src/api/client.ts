const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ?? ""
const ACCESS_TOKEN_KEY = "reown-access-token"
const REQUEST_TIMEOUT_MS = 15_000

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
  ) {
    super(message)
  }
}

export function getApiBaseUrl() {
  return API_BASE_URL
}

export function getToken() {
  return (
    window.localStorage.getItem(ACCESS_TOKEN_KEY) ??
    window.sessionStorage.getItem(ACCESS_TOKEN_KEY) ??
    ""
  )
}

type ApiSuccess<T> = {
  data: T
}

type ApiFailure = {
  error?: {
    message?: string
    code?: string
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null

export async function apiRequest<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const headers = new Headers(init?.headers)
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json")
  }

  const token = getToken()
  if (token) {
    headers.set("Authorization", `Bearer ${token}`)
  }

  const controller = new AbortController()
  const timeoutId = window.setTimeout(
    () => controller.abort(),
    REQUEST_TIMEOUT_MS,
  )
  const abortRequest = () => controller.abort()
  if (init?.signal?.aborted) {
    abortRequest()
  } else {
    init?.signal?.addEventListener("abort", abortRequest, { once: true })
  }

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers,
      signal: controller.signal,
    })

    if (response.status === 204) {
      if (!response.ok) {
        throw new ApiError("요청에 실패했어요.", response.status)
      }
      return undefined as T
    }

    let payload: unknown
    try {
      payload = await response.json()
    } catch (cause) {
      if (controller.signal.aborted) throw cause
      if (response.status === 401) {
        window.localStorage.removeItem(ACCESS_TOKEN_KEY)
        window.sessionStorage.removeItem(ACCESS_TOKEN_KEY)
      }
      throw new ApiError(
        "서버 응답이 올바른 JSON 형식이 아니에요.",
        response.status,
      )
    }

    if (!response.ok) {
      if (response.status === 401) {
        window.localStorage.removeItem(ACCESS_TOKEN_KEY)
        window.sessionStorage.removeItem(ACCESS_TOKEN_KEY)
      }
      const failure =
        isRecord(payload) && isRecord(payload.error)
          ? (payload as ApiFailure)
          : undefined
      throw new ApiError(
        failure?.error?.message ?? "요청에 실패했어요.",
        response.status,
        failure?.error?.code,
      )
    }

    if (!isRecord(payload) || !("data" in payload)) {
      throw new ApiError("서버 응답 형식이 올바르지 않아요.", response.status)
    }

    return (payload as ApiSuccess<T>).data
  } catch (cause) {
    if (controller.signal.aborted && !init?.signal?.aborted) {
      throw new ApiError(
        "서버 응답이 15초 동안 없어 요청을 종료했어요. 백엔드 서버와 API 구현 여부를 확인해 주세요.",
        0,
        "REQUEST_TIMEOUT",
      )
    }
    throw cause
  } finally {
    window.clearTimeout(timeoutId)
    init?.signal?.removeEventListener("abort", abortRequest)
  }
}
