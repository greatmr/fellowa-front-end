import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios'

import { env } from '@/lib/env'
import { toApiError } from '@/lib/api/errors'

/**
 * The single axios instance for the Fellowa API. Never import `axios` directly
 * in feature code — go through `apiClient` (or the request helpers below) so
 * every call gets the base URL, auth header and error normalization.
 *
 * How the access token reaches this instance is deliberately pluggable: the
 * auth transport (httpOnly cookie vs. bearer token held in memory) is an open
 * decision for this app. Register a provider once, at app start, with
 * `setAccessTokenProvider`, and do not read tokens anywhere else.
 */
export const apiClient: AxiosInstance = axios.create({
  baseURL: env.NEXT_PUBLIC_API_BASE_URL,
  timeout: 20_000,
  headers: { Accept: 'application/json' },
})

type AccessTokenProvider = () =>
  string | null | undefined | Promise<string | null | undefined>

let accessTokenProvider: AccessTokenProvider | undefined

export function setAccessTokenProvider(provider: AccessTokenProvider) {
  accessTokenProvider = provider
}

apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await accessTokenProvider?.()
    if (token) {
      config.headers.set('Authorization', `Bearer ${token}`)
    }
    return config
  }
)

apiClient.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(toApiError(error))
)

/**
 * Request helpers. They return the response body, so a caller types the body
 * and nothing else. Type it from the real backend contract
 * (`back-end/docs/modules/<module>/api.md` and the controller/DTO) — never from
 * a guess.
 */
export async function apiGet<TResponse>(
  url: string,
  config?: AxiosRequestConfig
): Promise<TResponse> {
  const response = await apiClient.get<TResponse>(url, config)
  return response.data
}

export async function apiPost<TResponse, TBody = unknown>(
  url: string,
  body?: TBody,
  config?: AxiosRequestConfig
): Promise<TResponse> {
  const response = await apiClient.post<TResponse>(url, body, config)
  return response.data
}

export async function apiPatch<TResponse, TBody = unknown>(
  url: string,
  body?: TBody,
  config?: AxiosRequestConfig
): Promise<TResponse> {
  const response = await apiClient.patch<TResponse>(url, body, config)
  return response.data
}

export async function apiPut<TResponse, TBody = unknown>(
  url: string,
  body?: TBody,
  config?: AxiosRequestConfig
): Promise<TResponse> {
  const response = await apiClient.put<TResponse>(url, body, config)
  return response.data
}

export async function apiDelete<TResponse>(
  url: string,
  config?: AxiosRequestConfig
): Promise<TResponse> {
  const response = await apiClient.delete<TResponse>(url, config)
  return response.data
}
