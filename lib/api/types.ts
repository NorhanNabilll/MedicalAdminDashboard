// API Response types
export interface ApiResponse<T = any> {
  success: boolean
  message: string
  data: T | null
}

export interface PaginatedResponse<T> {
  items: T[]
  totalCount: number
  page: number
  pageSize: number
  totalPages: number
}

export interface ApiError {
  message: string
  statusCode?: number
  details?: any
}
export interface StatisticsData {
  totalUsers: number
  totalProducts: number
  totalOrders: number
  totalAdmins: number
}
// API call result type - either success with data or error with message
export type ApiResult<T> =
  | { success: true; data: T; message?: string }
  | { success: false; error: string; statusCode?: number }
