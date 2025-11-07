import axios, { type AxiosError, type AxiosRequestConfig, type AxiosResponse } from "axios"
import type { ApiResponse, ApiResult } from "./types"
import { getAccessToken, getRefreshToken, saveTokens, clearTokens } from "./tokenService"

// Create axios instance with base configuration
export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
 // timeout: 15000, // 15 seconds timeout
})

let isRefreshing = false
let failedQueue: Array<{
  resolve: (value: any) => void
  reject: (reason?: any) => void
}> = []

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token)
    }
  })

  isRefreshing = false
  failedQueue = []
}

apiClient.interceptors.request.use(
  (config) => {
    const timestamp = new Date().toISOString()
    console.log(`[ API Request] ${timestamp}`, {
      method: config.method?.toUpperCase(),
      endpoint: config.url,
      fullURL: `${config.baseURL}${config.url}`,
      params: config.params,
      data: config.data,
    })

    const accessToken = getAccessToken()
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`
    }

    return config
  },
  (error) => {
    console.error("[ API Request Error]", error)
    return Promise.reject(error)
  },
)

apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    const timestamp = new Date().toISOString()
    console.log(`[ API Response] ${timestamp}`, {
      status: response.status,
      statusText: response.statusText,
      endpoint: response.config.url,
      data: response.data,
    })
    return response
  },
  (error: AxiosError<ApiResponse>) => {
    const timestamp = new Date().toISOString()

    // Extract error details
    const errorDetails = {
      timestamp,
      endpoint: error.config?.url,
      method: error.config?.method?.toUpperCase(),
      message: error.message,
    }

    // Handle different error scenarios
    if (error.response) {
      // Server responded with error status (4xx, 5xx)
      const status = error.response.status
      const apiMessage = error.response.data?.message

      const originalRequest = error.config
      const url = originalRequest.url

     if (
        error.response?.status === 401 &&
        !originalRequest._retry &&
        url !== "/v1/AdminAuth/login" &&
        url !== "/v1/Auth/refresh"
      ) {
        originalRequest._retry = true

        if (!isRefreshing) {
          isRefreshing = true
          const refreshToken = getRefreshToken()

          if (refreshToken) {
            // Create a new axios instance without interceptors to avoid infinite loops
            const refreshClient = axios.create({
              baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
              headers: {
                "Content-Type": "application/json",
              },
              timeout: 15000,
            })

            return refreshClient
              .post<{ success: boolean; accessToken: string; refreshToken: string }>("/v1/Auth/refresh", {
                refreshToken,
              })
              .then((response) => {
                console.log("[ Token Refffffffffffffffreshed Successfully]")
                // تم تعديل هذا السطر
                const { accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data

                saveTokens(newAccessToken, newRefreshToken)
                
                // ✅ أرسل event لإعلام SignalR (أضف هذا السطر)
                window.dispatchEvent(new CustomEvent('tokenRefreshed', { 
                  detail: { accessToken: newAccessToken } 
                }));

                if (error.config) {
                  error.config.headers.Authorization = `Bearer ${newAccessToken}`
                }

                processQueue(null, newAccessToken)
                return apiClient(error.config)
              })
              .catch((refreshError) => {
                console.error("[ Token Refresh Error]", refreshError)
                clearTokens()
                processQueue(refreshError, null)
                window.dispatchEvent(new CustomEvent('unauthorized')) //window.location.href = "/login"
                return Promise.reject(refreshError)
              })
          } else {
            clearTokens()
            window.dispatchEvent(new CustomEvent('unauthorized')) //window.location.href = "/login"
            return Promise.reject(error)
          }
        } else {
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject })
          })
            .then((token) => {
              if (error.config) {
                error.config.headers.Authorization = `Bearer ${token}`
              }
              return apiClient(error.config)
            })
            .catch((err) => {
              return Promise.reject(err)
            })
        }
      }

      console.error(`[ API Error ${status}]`, {
        ...errorDetails,
        status,
        statusText: error.response.statusText,
        apiMessage,
        responseData: error.response.data,
      })

      let userMessage = apiMessage || "An error occurred"

      switch (status) {
        case 400:
          userMessage = apiMessage || "Invalid request. Please check your input."
          break
        case 401:
          if (!url?.includes("/v1/AdminAuth/login") && !url?.includes("/v1/Auth/refresh")) {
            // Token is invalid, redirect to login
            clearTokens()
            window.dispatchEvent(new CustomEvent('unauthorized')) //window.location.href = "/login"
          }
          userMessage = apiMessage || "بيانات الدخول غير صحيحة."
          break
        case 403:
          userMessage = "You don't have permission to perform this action."
          break
        case 404:
          userMessage = apiMessage || "The requested resource was not found."
          break
        case 409:
          userMessage = apiMessage || "This item already exists."
          break
        case 422:
          userMessage = apiMessage || "Validation failed. Please check your input."
          break
        case 500:
          userMessage = "Server error. Please try again later."
          break
        case 502:
          userMessage = "Bad gateway. The server is temporarily unavailable."
          break
        case 503:
          userMessage = "Service unavailable. Please try again later."
          break
        default:
          userMessage = apiMessage || `Error ${status}: ${error.response.statusText}`
      }

      // Attach user-friendly message to error
      error.message = userMessage
    } else if (error.request) {
      // Request made but no response received (network error, timeout, etc.)
      console.error("[ API Network Error]", {
        ...errorDetails,
        code: error.code,
        requestDetails: {
          url: error.config?.url,
          method: error.config?.method,
          timeout: error.config?.timeout,
        },
      })

      if (error.code === "ECONNABORTED") {
        error.message = "Request timeout. Please check your internet connection and try again."
      } else if (error.code === "ERR_NETWORK") {
        error.message = "Network error. Please check your internet connection."
      } else {
        error.message = "Unable to reach the server. Please check your connection and try again."
      }
    } else {
      // Something else happened while setting up the request
      console.error("[ API Setup Error]", {
        ...errorDetails,
        errorType: "Request Setup Error",
      })
      error.message = "An unexpected error occurred. Please try again."
    }

    return Promise.reject(error)
  },
)

export async function apiCall<T>(requestFn: () => Promise<AxiosResponse<ApiResponse<T>>>): Promise<ApiResult<T>> {
  try {
    const response = await requestFn()

    // Check if API response indicates success
    if (response.data.success) {
      return {
        success: true,
        data: response.data.data as T,
        message: response.data.message,
      }
    } else {
      // API returned success: false
      return {
        success: false,
        error: response.data.message || "Operation failed",
      }
    }
  } catch (error) {
    // Handle axios errors
    if (axios.isAxiosError(error)) {
      return {
        success: false,
        error: error.message,
        statusCode: error.response?.status,
      }
    }

    // Handle unexpected errors
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred",
    }
  }
}

export const api = {
  get: <T,>(url: string, config?: AxiosRequestConfig) => apiCall<T>(() => apiClient.get(url, config)),

  post: <T,>(url: string, data?: any, config?: AxiosRequestConfig) =>
    apiCall<T>(() => apiClient.post(url, data, config)),

  put: <T,>(url: string, data?: any, config?: AxiosRequestConfig) => apiCall<T>(() => apiClient.put(url, data, config)),

  delete: <T,>(url: string, config?: AxiosRequestConfig) => apiCall<T>(() => apiClient.delete(url, config)),

  patch: <T,>(url: string, data?: any, config?: AxiosRequestConfig) =>
    apiCall<T>(() => apiClient.patch(url, data, config)),
}

export default api
