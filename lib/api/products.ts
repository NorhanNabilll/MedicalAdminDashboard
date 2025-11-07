import { apiClient } from "./axios-config"

export type Product = {
  id: number
  name: string
  pricePublic: number
  pricePrivate: number
  priceSubscription: number
  imageUrl: string
  barcode: string | null
  isInStock: boolean
  stockQuantity: number
  createdAt: string
   categoryId: number  // ⬅️ أضيفي السطر ده
  updatedAt: string
}

export type ProductsResponse = {
  items: Product[]
  pagination: {
    currentPage: number
    pageSize: number
    totalCount: number
    totalPages: number
    hasPrevious: boolean
    hasNext: boolean
  }
}

export type SearchProductsParams = {
  page?: number
  pageSize?: number
  isInStock?: boolean
  searchTerm?: string
  categoryId?: number
}

export type CreateProductData = {
  name: string
  pricePublic: number
  priceSubscription: number
  pricePrivate: number
  categoryId: number
  imageFile?: File
  barcode?: string
  stockQuantity: number
}

export type UpdateProductData = CreateProductData & {
  id: number
}

// Search products with filters and pagination
export async function searchProducts(params: SearchProductsParams = {}) {
  //console.log("[] Searching products with params:", params)

  const queryParams = new URLSearchParams()

  if (params.page) queryParams.append("page", params.page.toString())
  if (params.pageSize) queryParams.append("pageSize", params.pageSize.toString())
  if (params.isInStock !== undefined) queryParams.append("isInStock", params.isInStock.toString())
  if (params.searchTerm) queryParams.append("searchTerm", params.searchTerm)
  if (params.categoryId) queryParams.append("categoryId", params.categoryId.toString())

  const url = `/v1/Products/search${queryParams.toString() ? `?${queryParams.toString()}` : ""}`

  const response = await apiClient.get(url)
  return response.data
}

// Get product by ID
export async function getProductById(id: number) {
  //console.log("[] Getting product by ID:", id)
  const response = await apiClient.get(`/v1/Products/${id}`)
  return response.data
}

// Get product by barcode
export async function getProductByBarcode(barcode: string) {
  //console.log("[] Getting product by barcode:", barcode)
  const response = await apiClient.get(`/v1/Products/by-barcode/${barcode}`)
  return response.data
}

// Create product with image upload
export async function createProduct(data: CreateProductData) {
  //console.log("[] Creating product:", data.name)

  const formData = new FormData()
  formData.append("Name", data.name)
  formData.append("PricePublic", data.pricePublic.toString())
  formData.append("PriceSubscription", data.priceSubscription.toString())
  formData.append("PricePrivate", data.pricePrivate.toString())
  formData.append("CategoryId", data.categoryId.toString())
  formData.append("StockQuantity", data.stockQuantity.toString())

  if (data.barcode) {
    formData.append("Barcode", data.barcode)
  } else {
    formData.append("Barcode", "")
  }

  if (data.imageFile) {
    formData.append("ImageUrl", data.imageFile)
  }

  const response = await apiClient.post("/v1/Products", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  })

  return response.data
}

// Update product with image upload
export async function updateProduct(data: UpdateProductData) {
  //console.log("[] Updating product:", data.id)

  const formData = new FormData()
  formData.append("Name", data.name)
  formData.append("PricePublic", data.pricePublic.toString())
  formData.append("PriceSubscription", data.priceSubscription.toString())
  formData.append("PricePrivate", data.pricePrivate.toString())
  formData.append("CategoryId", data.categoryId.toString())
  formData.append("StockQuantity", data.stockQuantity.toString())

  if (data.barcode) {
    formData.append("Barcode", data.barcode)
  } else {
    formData.append("Barcode", "")
  }

  if (data.imageFile) {
    formData.append("ImageUrl", data.imageFile)
  }

  const response = await apiClient.put(`/v1/Products/${data.id}`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  })

  return response.data
}

// Delete product
export async function deleteProduct(id: number) {
  //console.log("[] Deleting product:", id)
  const response = await apiClient.delete(`/v1/Products/${id}`)
  return response.data
}
