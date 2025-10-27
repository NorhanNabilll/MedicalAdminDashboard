import { api } from "./axios-config"

// --- Type Definitions ---

export interface AdminUser {
  id: string
  fullName: string
  userName: string
  email: string
  roleId?: string
  roleName?: string
  createdAt: string
  updatedAt?: string
  roles?: string[]
  permissions?: string[]
}

export interface CreateAdminUserRequest {
  fullName: string
  email: string
  password: string
  roleId: string
}

export interface UpdateAdminUserRequest {
  fullName: string
  email: string
  roleId: string
}

export interface PaginationResponse {
  currentPage: number
  pageSize: number
  totalCount: number
  totalPages: number
  hasPrevious: boolean
  hasNext: boolean
}

export interface AdminUsersResponse {
  items: AdminUser[]
  pagination: PaginationResponse
}

// --- API Functions ---

/**
 * Fetches all admin users.
 */
export async function fetchAdminUsers(params?: {
  searchTerm?: string
  roleName?: string
  page?: number
  pageSize?: number
}): Promise<AdminUsersResponse> {
  try {
    const queryParams = new URLSearchParams()
    if (params?.searchTerm) queryParams.append("searchTerm", params.searchTerm)
    if (params?.roleName) queryParams.append("roleName", params.roleName)
    if (params?.page) queryParams.append("page", params.page.toString())
    if (params?.pageSize) queryParams.append("pageSize", params.pageSize.toString())

    const queryString = queryParams.toString()
    const url = `/v1/Admins${queryString ? `?${queryString}` : ""}`

    const response = await api.get<AdminUsersResponse>(url)
    if (response.success && response.data) {
      return response.data
    } else {
      console.log("[] Fetch admin users - no data returned, using default")
      return {
        items: [],
        pagination: {
          currentPage: 1,
          pageSize: 10,
          totalCount: 0,
          totalPages: 0,
          hasPrevious: false,
          hasNext: false,
        },
      }
    }
  } catch (error: any) {
    console.error("[] Fetch admin users error:", error.message)
    throw error
  }
}

/**
 * Creates a new admin user.
 */
export async function createAdminUser(data: CreateAdminUserRequest): Promise<AdminUser> {
  try {
    const response = await api.post<AdminUser>("/v1/Admins", data)
    if (response.success) {
      return response.data!
    } else {
      throw new Error(response.error)
    }
  } catch (error: any) {
    console.error("[] Create admin user error:", error.message)
    throw error
  }
}

/**
 * Updates an existing admin user.
 */
export async function updateAdminUser(id: string, data: UpdateAdminUserRequest): Promise<AdminUser> {
  try {
    const response = await api.put<AdminUser>(`/v1/Admins/${id}`, data)

    if (response.success) {
      return response.data!
    } else {
      throw new Error(response.error)
    }
  } catch (error: any) {
    console.error("[] Update admin user error:", error.message)
    throw error
  }
}

/**
 * Deletes an admin user.
 */
export async function deleteAdminUser(id: string): Promise<void> {
  try {
    const response = await api.delete(`/v1/Admins/${id}`)

    if (!response.success) {
      throw new Error(response.error)
    }
  } catch (error: any) {
    console.error("[] Delete admin user error:", error.message)
    throw error
  }
}

/**
 * Fetches a single admin user by their ID.
 */
export async function getAdminUserById(id: string): Promise<AdminUser> {
  try {
    const response = await api.get<AdminUser>(`/v1/Admins/${id}`)

    if (response.success) {
      return response.data!
    } else {
      throw new Error(response.error)
    }
  } catch (error: any) {
    console.error("[] Get admin user error:", error.message)
    throw error
  }
}
