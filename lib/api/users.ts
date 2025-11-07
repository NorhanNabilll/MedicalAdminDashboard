import { apiClient } from "./axios-config"

export interface User {
  id: string
  customerId: string
  fullName: string
  phoneNumber: string
  address: string
  customerType: number // 0 = General, 1 = Special, 2 = Subscribed
  profileImagePath: string | null
}

export interface Pagination {
  currentPage: number
  pageSize: number
  totalCount: number
  totalPages: number
  hasPrevious: boolean
  hasNext: boolean
}

export interface PaginatedResponse<T> {
  success: boolean
  message: string
  data: {
    items: T[]
    pagination: Pagination
  }
}

export interface ApiResponse<T> {
  success: boolean
  message: string
  data: T
}

export enum CustomerType {
  General = 0,
  Special = 1,
  Subscribed = 2,
}

export function mapCustomerTypeToArabic(type: number): string {
  switch (type) {
    case CustomerType.General:
      return "عام"
    case CustomerType.Special:
      return "خاص"
    case CustomerType.Subscribed:
      return "مشترك"
    default:
      return "غير معروف"
  }
}

export function mapArabicToCustomerType(label: string): number {
  switch (label) {
    case "عام":
      return CustomerType.General
    case "خاص":
      return CustomerType.Special
    case "مشترك":
      return CustomerType.Subscribed
    default:
      return CustomerType.General
  }
}

export async function fetchUsers(
  key?: string,
  options?: {
    searchByCode?: string
    pageNumber?: number
    pageSize?: number
  },
): Promise<{ items: User[]; pagination: Pagination }> {
  try {
    const params = new URLSearchParams()

    if (options?.searchByCode) {
      params.append("searchByCode", options.searchByCode)
    }
    if (options?.pageNumber) {
      params.append("pageNumber", options.pageNumber.toString())
    }
    if (options?.pageSize) {
      params.append("pageSize", options.pageSize.toString())
    }

    const queryString = params.toString()
    const url = queryString ? `/v1/User?${queryString}` : "/v1/User"

    const response = await apiClient.get<PaginatedResponse<User>>(url)

    if (!response.data.success) {
      throw new Error(response.data.message || "فشل في جلب بيانات المستخدمين")
    }

    return response.data.data
  } catch (error) {
    //console.error("[] Fetch users error:", error)
    throw new Error("فشل في جلب بيانات المستخدمين")
  }
}

// Create a new user
export async function createUser(userData: {
  customerId: string
  fullName: string
  phoneNumber: string
  address: string
  customerType: string
}): Promise<User> {
  try {
    //console.log("[] Creating user with data:", userData)
    const response = await apiClient.post<ApiResponse<User>>("/v1/User", userData)

    if (!response.data.success) {
      throw new Error(response.data.message || "فشل في إضافة المستخدم")
    }

    return response.data.data
  } catch (error) {
    //console.error("[] Create user error:", error)
    throw new Error("فشل في إضافة المستخدم")
  }
}

// Update a user by sending data as FormData
export async function updateUser(
  userId: string,
  userData: {
    customerId: string;
    fullName: string;
    phoneNumber: string;
    address: string;
    customerType: string; // The type is a string here
  },
): Promise<User> {
  try {
    //console.log("[] Updating user:", userId, "with data:", userData);

    // 1. Create a new FormData object
    const formData = new FormData();

    // 2. Append each piece of data as a separate field
    formData.append('FullName', userData.fullName);
    formData.append('Address', userData.address);
    formData.append('PhoneNumber', userData.phoneNumber);
    // The API expects a number for customerType, so we convert it
    formData.append('CustomerType', userData.customerType ); 
    formData.append('CustomerId', userData.customerId);

    // 3. Send the request with the correct Content-Type header
    // We use the base apiClient to override the header for this specific call
    const response = await apiClient.put<ApiResponse<User>>(`/v1/User/${userId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    if (!response.data.success) {
      throw new Error(response.data.message || "فشل في تعديل بيانات المستخدم");
    }

    return response.data.data;
  } catch (error) {
    //console.error("[] Update user error:", error);
    // Re-throw the original error to be handled by the component
    throw error;
  }
}

export async function deleteUser(userId: string): Promise<void> {
  try {
    const response = await apiClient.delete<ApiResponse<null>>(`/v1/User/${userId}`)

    if (!response.data.success) {
      throw new Error(response.data.message || "فشل في حذف المستخدم")
    }
  } catch (error) {
    //console.error("[] Delete user error:", error)
    throw new Error("فشل في حذف المستخدم")
  }
}
