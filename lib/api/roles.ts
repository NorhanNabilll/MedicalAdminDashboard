import api from "./axios-config"
import type { ApiResponse } from "./types"

export interface Permission {
  id: number
  name: string
  moduleName: string
}

export interface PermissionGroup {
  moduleName: string
  permissions: Permission[]
}

export interface Role {
  id: string
  name: string
  userCount: number
  createdAt: string
  updatedAt: string
}

export interface RoleWithPermissions {
  id: string
  name: string
  permissions: Array<{
    id: number
    name: string
    displayName: string
    module: string
  }>
}

// Fetch all permissions grouped by module
export async function fetchPermissions(): Promise<PermissionGroup[]> {
  try {
    const response = await api.get<ApiResponse<PermissionGroup[]>>("/v1/Permissions/grouped")
    return response.data.data || []
  } catch (error: any) {
    console.error("[] Fetch permissions error:", error.message)
    // Return empty array instead of throwing to allow UI to render
    return []
  }
}

// Fetch all roles
export async function fetchRoles(): Promise<Role[]> {
  try {
    const response = await api.get<ApiResponse<Role[]>>("/v1/Roles")
    return response.data || []
  } catch (error: any) {
    console.error("[] Fetch roles error:", error.message)
    throw error
  }
}

export async function createRoleWithName(name: string) {
  // تم إزالة Promise<Role> لتجنب خطأ النوع
  try {
    // قم باستدعاء api.post وقم بإرجاع النتيجة الكاملة كما هي
    const response = await api.post<Role>("/v1/Roles", { name })
    return response // <-- التعديل هنا: نرجع الرد الكامل
  } catch (error: any) {
    console.error("[] Create role error:", error.message)
    throw error
  }
}

export async function assignPermissionsToRole(roleId: string, permissionIds: number[]): Promise<void> {
  try {
    await api.post(`/v1/Roles/${roleId}/permissions`, { permissionIds })
  } catch (error: any) {
    console.error("[] Assign permissions error:", error.message)
    throw error
  }
}

// Delete a role
export async function deleteRole(id: string): Promise<void> {
  try {
    await api.delete(`/v1/Roles/${id}`)
  } catch (error: any) {
    console.error("[] Delete role error:", error.message)
    throw error
  }
}

// Get role by ID
export async function getRoleById(id: string): Promise<RoleWithPermissions> {
  try {
    const response = await api.get<ApiResponse<RoleWithPermissions>>(`/v1/Roles/${id}`)
    return response.data!
  } catch (error: any) {
    console.error("[] Get role error:", error.message)
    throw error
  }
}

export async function updateRoleWithPermissions(roleId: string, name: string, permissionIds: number[]): Promise<void> {
  try {
    await api.put(`/v1/Roles/${roleId}/update-with-permissions`, { name, permissionIds })
  } catch (error: any) {
    console.error("[] Update role with permissions error:", error.message)
    throw error
  }
}
