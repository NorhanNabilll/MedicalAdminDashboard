import { apiClient } from "./axios-config"

// API Status enum (matches backend)
export enum OrderStatusEnum {
  Pending = 0,
  Shipped = 1,
  Delivered = 2,
  Cancelled = 3,
}

// Display status in Arabic
export type OrderStatusDisplay = "تم الطلب" | "تم الشحن" | "تم الاستلام" | "تم الإلغاء"

// Helper function to convert status enum to Arabic display
export function getStatusDisplay(status: OrderStatusEnum): OrderStatusDisplay {
  switch (status) {
    case OrderStatusEnum.Pending:
      return "تم الطلب"
    case OrderStatusEnum.Shipped:
      return "تم الشحن"
    case OrderStatusEnum.Delivered:
      return "تم الاستلام"
    case OrderStatusEnum.Cancelled:
      return "تم الإلغاء"
    default:
      return "تم الطلب"
  }
}

// Order item type
export type OrderItem = {
  id: number
  productId: number
  productName: string
  productImage: string
  quantity: number
  unitPrice: number
  subtotal: number
}

// Order summary type
export type OrderSummary = {
  subtotal: number
  shippingFee: number
  total: number
  totalItems: number
}

// Shipping info type
export type ShippingInfo = {
  fullName: string
  phoneNumber: string
  address: string
}

// Order type (matches API response)
export type Order = {
  id: number
  orderNumber: string
  userId: string
  customerName: string // This will be displayed as patient name
  status: OrderStatusEnum
  statusDisplay: string
  items: OrderItem[]
  summary: OrderSummary
  shippingInfo: ShippingInfo
  orderDate: string
  updatedAt: string | null
  canCancel: boolean
}

// Pagination type
export type Pagination = {
  currentPage: number
  pageSize: number
  totalCount: number
  totalPages: number
  hasPrevious: boolean
  hasNext: boolean
}

// API Response type
export type OrdersApiResponse = {
  success: boolean
  message: string
  data: {
    items: Order[]
    pagination: Pagination
  }
}

// Search orders params
export type SearchOrdersParams = {
  page?: number
  pageSize?: number
  searchTerm?: string
  status?: OrderStatusEnum | "all"
}

export async function getAllOrders(params: SearchOrdersParams = {}) {
  const queryParams = new URLSearchParams()

  if (params.page) queryParams.append("page", params.page.toString())
  if (params.pageSize) queryParams.append("pageSize", params.pageSize.toString())
  if (params.searchTerm) queryParams.append("searchTerm", params.searchTerm)
  if (params.status !== undefined && params.status !== "all") {
    queryParams.append("status", params.status.toString())
  }

  const url = `/v1/Orders/all${queryParams.toString() ? `?${queryParams.toString()}` : ""}`

  const response = await apiClient.get<OrdersApiResponse>(url)
  return response.data
}

// Get order by ID
export async function getOrderById(id: number) {
  const response = await apiClient.get(`/v1/Orders/${id}`)
  return response.data
}

// Export orders to CSV/Excel
export async function exportOrders(params: SearchOrdersParams = {}) {
  const queryParams = new URLSearchParams()

  if (params.searchTerm) queryParams.append("searchTerm", params.searchTerm)
  if (params.status !== undefined && params.status !== "all") {
    queryParams.append("status", params.status.toString())
  }

  const url = `/v1/Orders/export${queryParams.toString() ? `?${queryParams.toString()}` : ""}`

  const response = await apiClient.get(url, {
    responseType: "blob",
  })

  return response.data
}

export async function updateOrderStatus(orderId: number, status: OrderStatusEnum) {
  const response = await apiClient.patch(`/v1/Orders/${orderId}/status?Status=${status}`)
  return response.data
}

export async function updateOrderItemQuantity(orderId: number, itemId: number, quantity: number) {
  const response = await apiClient.patch(`/v1/Orders/${orderId}/items/${itemId}/quantity`, { quantity })
  return response.data
}

export async function deleteOrderItem(orderId: number, itemId: number) {
  const response = await apiClient.delete(`/v1/Orders/${orderId}/items/${itemId}`)
  return response.data
}

export async function updateShippingFee(orderId: number, shippingFee: number) {
  const response = await apiClient.patch(`/v1/Orders/${orderId}/shipping-fee`, { shippingFee })
  return response.data
}
