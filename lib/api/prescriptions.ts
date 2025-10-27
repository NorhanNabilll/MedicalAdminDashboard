import { apiClient } from "./axios-config"

// API Response structure
export interface ApiResponse<T> {
  success: boolean
  message: string
  data: T
}

export interface PaginationInfo {
  currentPage: number
  pageSize: number
  totalCount: number
  totalPages: number
  hasPrevious: boolean
  hasNext: boolean
}

export interface PrescriptionsData {
  items: Prescription[]
  pagination: PaginationInfo
}

// Prescription interface matching API response
export interface Prescription {
  id: number
  prescriptionNumber: string
  userId: string
  customerName: string
  customerPhone: string
  customerAddress: string
  customerCode: string
  customerType: string
  imageUrl: string
  additionalNotes: string | null
  status: number // 0: Pending, 1: Accepted, 2: Rejected, 3: Cancelled
  statusDisplay: string
  createdAt: string
  updatedAt: string
  canCancel: boolean
}

// Status mapping: API number to Arabic string
export function mapStatusToArabic(status: number): string {
  const statusMap: Record<number, string> = {
    0: "تم الطلب",
    1: "تم الموافقه",
    2: "تم الرفض",
    3: "تم الالغاء",
  }
  return statusMap[status] || "غير معروف"
}

// Status mapping: Arabic string to API number
export function mapArabicToStatus(arabicStatus: string): number {
  const statusMap: Record<string, number> = {
    "تم الطلب": 0,
    "تم الموافقه": 1,
    "تم الرفض": 2,
    "تم الالغاء": 3,
  }
  return statusMap[arabicStatus] ?? 0
}

// Get full image URL
export function getImageUrl(imageUrl: string): string {
  if (!imageUrl) return "/placeholder.svg"
  if (imageUrl.startsWith("http")) return imageUrl
  return `https://medicalapi.runasp.net/${imageUrl}`
}

// Fetch prescriptions with optional filters
export async function fetchPrescriptions(params?: {
  page?: number
  pageSize?: number
  status?: number
  searchTerm?: string
}): Promise<PrescriptionsData> {
  try {
    const queryParams = new URLSearchParams()

    if (params?.page) queryParams.append("page", params.page.toString())
    if (params?.pageSize) queryParams.append("pageSize", params.pageSize.toString())
    if (params?.status !== undefined && params.status !== -1) {
      queryParams.append("status", params.status.toString())
    }
    if (params?.searchTerm) queryParams.append("searchTerm", params.searchTerm)

    const url = `/v1/Prescriptions/all${queryParams.toString() ? `?${queryParams.toString()}` : ""}`

    console.log("[] Fetching prescriptions with URL:", url)

    const response = await apiClient.get<ApiResponse<PrescriptionsData>>(url)

    if (!response.data.success) {
      throw new Error(response.data.message || "فشل في جلب بيانات الوصفات")
    }

    return response.data.data
  } catch (error) {
    console.error("[] Fetch prescriptions error:", error)
    throw new Error("فشل في جلب بيانات الوصفات")
  }
}

export async function updatePrescriptionStatus(prescriptionId: number, newStatus: number): Promise<Prescription> {
  try {
    console.log("[] Updating prescription status:", prescriptionId, "to", newStatus)

    const response = await apiClient.put<ApiResponse<Prescription>>(
      `/v1/Prescriptions/${prescriptionId}/status?Status=${newStatus}`,
    )

    if (!response.data.success) {
      throw new Error(response.data.message || "فشل في تحديث حالة الوصفة")
    }

    return response.data.data
  } catch (error) {
    console.error("[] Update prescription status error:", error)
    throw new Error("فشل في تحديث حالة الوصفة")
  }
}
