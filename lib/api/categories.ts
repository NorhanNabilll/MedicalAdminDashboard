import { apiClient } from "./axios-config"

export type Category = {
  id: number
  name: string
  productCount: number
}

export type CategoryResponse = {
  success: boolean
  message: string
  data:
    | {
        items: Category[]
        pagination: {
          currentPage: number
          pageSize: number
          totalCount: number
          totalPages: number
          hasPrevious: boolean
          hasNext: boolean
        }
      }
    | Category
    | null
}

export type CreateCategoryRequest = {
  name: string
}

export type UpdateCategoryRequest = {
  id: number
  name: string
}

// Get all categories with optional pagination and search
export async function getCategories(params?: {
  page?: number
  pageSize?: number
  searchTerm?: string
}): Promise<CategoryResponse> {
  console.log("[] Fetching categories with params:", params)
  const response = await apiClient.get<CategoryResponse>("/v1/Category", { params })
  console.log("[] Categories response:", response.data)
  return response.data
}

// Create a new category
export async function createCategory(data: CreateCategoryRequest): Promise<CategoryResponse> {
  console.log("[] Creating category:", data)
  const response = await apiClient.post<CategoryResponse>("/v1/Category", data)
  console.log("[] Create category response:", response.data)
  return response.data
}

// Update an existing category
export async function updateCategory(id: number, data: UpdateCategoryRequest): Promise<CategoryResponse> {
  console.log("[] Updating category:", id, data)
  const response = await apiClient.put<CategoryResponse>(`/v1/Category/${id}`, data)
  console.log("[] Update category response:", response.data)
  return response.data
}

// Delete a category
export async function deleteCategory(id: number): Promise<CategoryResponse> {
  console.log("[] Deleting category:", id)
  const response = await apiClient.delete<CategoryResponse>(`/v1/Category/${id}`)
  console.log("[] Delete category response:", response.data)
  return response.data
}
