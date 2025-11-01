"use client"

import type React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Pencil, Trash2, Search, Upload, X, ChevronLeft, ChevronRight } from "lucide-react"
import { useState, useEffect, useRef, useMemo } from "react"
import { useAuth } from "@/context/AuthContext"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Image from "next/image"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import useSWR from "swr"
import { getCategories } from "@/lib/api/categories"
import { searchProducts, createProduct, updateProduct, deleteProduct, type Product } from "@/lib/api/products"
import { useToast } from "@/hooks/use-toast"
import {  formatDateArabic } from "@/lib/utils"

export default function ProductsTable() {
  const { toast } = useToast()
  const { hasPermission } = useAuth()
  
  const canCreate = useMemo(() => hasPermission("Products.Create"), [hasPermission])
  const canUpdate = useMemo(() => hasPermission("Products.Update"), [hasPermission])
  const canDelete = useMemo(() => hasPermission("Products.Delete"), [hasPermission])
  
  const showActionsColumn = canUpdate || canDelete

  const [selectedImage, setSelectedImage] = useState<string | null>(null)

  const { data: categoriesData } = useSWR("categories-for-products", () => getCategories({ pageSize: 100 }))
  const categories = categoriesData?.data && "items" in categoriesData.data ? categoriesData.data.items : []

  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("")
  const searchInputRef = useRef<HTMLInputElement>(null)

  const [stockFilter, setStockFilter] = useState<"all" | "inStock" | "outOfStock">("all")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
      setCurrentPage(1)
    }, 600)

    return () => clearTimeout(timer)
  }, [searchQuery])

  const {
    data: productsData,
    error,
    isLoading,
    mutate,
  } = useSWR(
    ["products", currentPage, pageSize, debouncedSearchQuery, categoryFilter, stockFilter],
    () =>
      searchProducts({
        page: currentPage,
        pageSize: pageSize,
        searchTerm: debouncedSearchQuery || undefined,
        categoryId: categoryFilter === "all" ? undefined : Number(categoryFilter),
        isInStock: stockFilter === "all" ? undefined : stockFilter === "inStock",
      }),
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000,
      onSuccess: () => {
        setTimeout(() => {
          if (searchInputRef.current && document.activeElement !== searchInputRef.current) {
            searchInputRef.current.focus()
          }
        }, 0)
      },
    },
  )

  const products = productsData?.data?.items || []
  const pagination = productsData?.data?.pagination

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)

  const [newProduct, setNewProduct] = useState({
    name: "",
    barcode: "",
    stockQuantity: "",
    pricePublic: "",
    pricePrivate: "",
    priceSubscription: "",
    categoryId: "",
  })

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
      if (validationErrors.image) {
        setValidationErrors({ ...validationErrors, image: "" })
      }
    }
  }

  const handleRemoveImage = () => {
    setImagePreview(null)
    setImageFile(null)
  }

  const validateProduct = (): boolean => {
    const errors: Record<string, string> = {}

    if (!imageFile && !imagePreview) {
      errors.image = "صورة المنتج مطلوبة"
    }

    if (!newProduct.name || newProduct.name.trim().length <= 1) {
      errors.name = "اسم المنتج يجب أن يكون أكثر من حرف واحد"
    }

    if (!newProduct.categoryId) {
      errors.categoryId = "يجب اختيار قسم"
    }

    const stockQty = Number(newProduct.stockQuantity)
    if (newProduct.stockQuantity === "" || isNaN(stockQty) || stockQty < 0) {
      errors.stockQuantity = " المخزون يجب أن يكون رقم موجب او صفر"
    }

    const pricePublic = Number(newProduct.pricePublic)
    const pricePrivate = Number(newProduct.pricePrivate)
    const priceSubscription = Number(newProduct.priceSubscription)

    if (newProduct.pricePublic === "" || isNaN(pricePublic) || pricePublic <= 0) {
      errors.pricePublic = "السعر العام يجب أن يكون رقم موجب "
    }

    if (newProduct.pricePrivate === "" || isNaN(pricePrivate) || pricePrivate <= 0) {
      errors.pricePrivate = "السعر الخاص يجب أن يكون رقم موجب"
    }

    if (newProduct.priceSubscription === "" || isNaN(priceSubscription) || priceSubscription <= 0) {
      errors.priceSubscription = "السعر المشترك يجب أن يكون رقم موجب "
    }

    if (newProduct.pricePublic !== "" && newProduct.pricePrivate !== "" && newProduct.priceSubscription !== "") {
      if (pricePublic < pricePrivate) {
        errors.priceRelation = "السعر العام يجب أن يكون أكبر من أو يساوي السعر الخاص"
      }
      if (pricePrivate < priceSubscription) {
        errors.priceRelation = "السعر الخاص يجب أن يكون أكبر من أو يساوي السعر المشترك"
      }
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleAddProduct = async () => {
    if (!validateProduct()) {
      return
    }

    setIsSubmitting(true)

    try {
      let imageFileToSubmit = imageFile

      if (isEditMode && !imageFile && imagePreview) {
        try {
          const response = await fetch(imagePreview)
          const blob = await response.blob()
          imageFileToSubmit = new File([blob], "product-image.jpg", { type: blob.type })
        } catch (error) {
          console.error("Failed to convert image URL to File:", error)
        }
      }

      const productData = {
        name: newProduct.name,
        pricePublic: Number(newProduct.pricePublic) || 0,
        pricePrivate: Number(newProduct.pricePrivate) || 0,
        priceSubscription: Number(newProduct.priceSubscription) || 0,
        categoryId: Number(newProduct.categoryId),
        stockQuantity: Number(newProduct.stockQuantity) || 0,
        barcode: newProduct.barcode || undefined,
        imageFile: imageFileToSubmit || undefined,
      }

      if (isEditMode && editingProduct) {
        const result = await updateProduct({
          ...productData,
          id: editingProduct.id,
        })

        if (result.success) {
          toast({
            title: "تم التعديل بنجاح",
            description: result.message || "تم تعديل المنتج بنجاح",
          })
        }
      } else {
        const result = await createProduct(productData)

        if (result.success) {
          toast({
            title: "تم الإضافة بنجاح",
            description: result.message || "تم إضافة المنتج بنجاح",
          })
        }
      }

      mutate()

      setNewProduct({
        name: "",
        barcode: "",
        stockQuantity: "",
        pricePublic: "",
        pricePrivate: "",
        priceSubscription: "",
        categoryId: "",
      })
      setImagePreview(null)
      setImageFile(null)
      setIsDialogOpen(false)
      setIsEditMode(false)
      setEditingProduct(null)
      setValidationErrors({})
    } catch (error: any) {
      toast({
        title: "فشلت العملية",
        description: error.message || "حدث خطأ أثناء حفظ المنتج",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditProduct = (product: Product) => {
    setNewProduct({
      name: product.name,
      barcode: product.barcode || "",
      stockQuantity: product.stockQuantity.toString(),
      pricePublic: product.pricePublic.toString(),
      pricePrivate: product.pricePrivate.toString(),
      priceSubscription: product.priceSubscription.toString(),
      categoryId: product.categoryId?.toString() || "",
    })
    setImagePreview(product.imageUrl)
    setImageFile(null)
    setEditingProduct(product)
    setIsEditMode(true)
    setValidationErrors({})
    setIsDialogOpen(true)
  }

  const handleDeleteProduct = (product: Product) => {
    setDeletingProduct(product)
    setIsDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!deletingProduct) return

    try {
      const result = await deleteProduct(deletingProduct.id)

      if (result.success) {
        toast({
          title: "تم الحذف بنجاح",
          description: result.message || "تم حذف المنتج بنجاح",
        })

        mutate()
      }
    } catch (error: any) {
      toast({
        title: "فشل الحذف",
        description: error.message || "حدث خطأ أثناء حذف المنتج",
        variant: "destructive",
      })
    } finally {
      setIsDeleteDialogOpen(false)
      setDeletingProduct(null)
    }
  }

  const handleOpenAddDialog = () => {
    setNewProduct({
      name: "",
      barcode: "",
      stockQuantity: "",
      pricePublic: "",
      pricePrivate: "",
      priceSubscription: "",
      categoryId: "",
    })
    setImagePreview(null)
    setImageFile(null)
    setIsEditMode(false)
    setEditingProduct(null)
    setValidationErrors({})
    setIsDialogOpen(true)
  }

  const handlePageChange = (newPage: number) => {
    if (pagination) {
      setCurrentPage(Math.max(1, Math.min(newPage, pagination.totalPages)))
    }
  }

const getPageNumbers = () => {
    if (!pagination) return []

    const totalPages = pagination.totalPages
    const pages: (number | string)[] = []
    const siblingCount = 1 // عدد الصفحات التي تظهر حول الصفحة الحالية

    // --- 1. هذا هو التعديل الذي طلبته ---
    // إذا كان عدد الصفحات 4 أو أقل، اعرضهم كلهم
    const totalPagesToShowSimple = 4
    if (totalPages <= totalPagesToShowSimple) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
      return pages
    }
    // --- نهاية التعديل ---


    // --- 2. "التغييرات اللازمة" (لوجيك ديناميكي) ---
    // اعرض الصفحة الأولى دائماً
    pages.push(1)

    // 3. احسب نطاق الصفحات (قبل وبعد الصفحة الحالية)
    // (نضمن أن النطاق لا يتجاوز 2 أو (إجمالي الصفحات - 1))
    const leftSiblingIndex = Math.max(currentPage - siblingCount, 2)
    const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages - 1)

    // 4. اعرض "..." جهة اليسار إذا لزم الأمر
    if (leftSiblingIndex > 2) {
      pages.push("...")
    }

    // 5. اعرض الأرقام التي في المنتصف
    for (let i = leftSiblingIndex; i <= rightSiblingIndex; i++) {
      pages.push(i)
    }

    // 6. اعرض "..." جهة اليمين إذا لزم الأمر
    if (rightSiblingIndex < totalPages - 1) {
      pages.push("...")
    }

    // 7. اعرض الصفحة الأخيرة دائماً
    pages.push(totalPages)

    return pages
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>المنتجات</CardTitle>
          <CardDescription>جاري تحميل المنتجات...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>المنتجات</CardTitle>
          <CardDescription>حدث خطأ أثناء تحميل المنتجات</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <p className="text-destructive mb-4">{error.message}</p>
            <Button onClick={() => mutate()}>إعادة المحاولة</Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>قائمة المنتجات</CardTitle>
              <CardDescription>عرض وإدارة جميع المنتجات</CardDescription>
            </div>
            {canCreate && (
              <Button className="w-full sm:w-auto" onClick={handleOpenAddDialog}>
                <Plus className="ml-2 h-4 w-4" />
                إضافة منتج
              </Button>
            )}
          </div>
          
    <div className="space-y-3 mt-4">
      {/* Search and Filters Row */}
      <div className="flex flex-col md:flex-row gap-3 items-end">
        {/* Search Input - removed fixed width to take more space */}
        <div className="relative flex-1 w-full md:w-auto">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            ref={searchInputRef}
            placeholder="ابحث بالاسم..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-10 text-right"
          />
        </div>

        {/* Category Filter - fixed width with flex-shrink-0 */}
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full md:w-[120px] flex-shrink-0">
            <SelectValue placeholder="القسم" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع الأقسام</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id.toString()}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Stock Filter - fixed width with flex-shrink-0 */}
        <Select value={stockFilter} onValueChange={(value) => setStockFilter(value)}>
          <SelectTrigger className="w-full md:w-[100px] flex-shrink-0">
            <SelectValue placeholder="حالة المخزون" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">الكل</SelectItem>
            <SelectItem value="inStock">متاح</SelectItem>
            <SelectItem value="outOfStock">غير متاح</SelectItem>
          </SelectContent>
        </Select>

        {/* Page Size - fixed width with flex-shrink-0 */}
        <Select
          value={pageSize.toString()}
          onValueChange={(value) => {
            setPageSize(Number(value))
            setCurrentPage(1)
          }}
        >
          <SelectTrigger className="w-full md:w-[100px] flex-shrink-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="10">10 صفوف</SelectItem>
            <SelectItem value="20">20 صف</SelectItem>
            <SelectItem value="50">50 صف</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
        </CardHeader>
        <CardContent>
          {/* Mobile Card View */}
          <div className="md:hidden space-y-4">
            {products.map((product, index) => {
              const displayIndex = (currentPage - 1) * pageSize + index + 1
              return (
                <Card key={product.id} className="overflow-hidden relative">
                  <span className="absolute top-2 right-2 flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-semibold z-10">
                    {displayIndex}
                  </span>

                  <CardContent className="p-4">
                    <div className="flex gap-3 mb-3">
                      <button
                        onClick={() => setSelectedImage(product.imageUrl)}
                        className="relative h-16 w-16 rounded-lg overflow-hidden flex-shrink-0 bg-muted hover:opacity-80 transition-opacity cursor-pointer"
                      >
                        <Image
                          src={product.imageUrl || "/placeholder.svg"}
                          alt={product.name}
                          fill
                          className="object-cover"
                        />
                      </button>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-base min-w-0 break-words pt-1">{product.name}</h3>
                        <p className="text-sm text-muted-foreground">باركود: {product.barcode || "غير محدد"}</p>
                        <p className="text-sm text-muted-foreground">
                          المخزون: {product.stockQuantity}
                        </p>
                        <div className="mt-1">
                          <Badge variant={product.isInStock ? "default" : "destructive"} className="text-xs">
                            {product.isInStock ? "متاح" : "غير متاح"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm mb-3">
                      <div>
                        <span className="text-muted-foreground block text-xs">عام</span>
                        <span className="font-medium">{product.pricePublic} د.ع</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-xs">خاص</span>
                        <span className="font-medium">{product.pricePrivate} د.ع</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-xs">مشترك</span>
                        <span className="font-medium">{product.priceSubscription} د.ع</span>
                      </div>
                    </div>
                    
                    {showActionsColumn && (
                      <div className="flex gap-2 pt-3 border-t">
                        {canUpdate && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 bg-transparent"
                            onClick={() => handleEditProduct(product)}
                          >
                            <Pencil className="ml-2 h-3.5 w-3.5" />
                            تعديل
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 text-destructive hover:text-destructive hover:bg-destructive/10 bg-transparent"
                            onClick={() => handleDeleteProduct(product)}
                          >
                            <Trash2 className="ml-2 h-3.5 w-3.5" />
                            حذف
                          </Button>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto rounded-md border">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted/50">
                <tr>
                  <th scope="col" className="px-4 py-3 text-right text-sm font-semibold">
                    #
                  </th>
                  <th scope="col" className="px-4 py-3 text-right text-sm font-semibold">
                    صورة
                  </th>
                  <th scope="col" className="px-4 py-3 text-right text-sm font-semibold">
                    الاسم
                  </th>
                  <th scope="col" className="px-4 py-3 text-right text-sm font-semibold">
                    باركود
                  </th>
                  <th scope="col" className="px-4 py-3 text-right text-sm font-semibold">
                    المخزون
                  </th>
                  <th scope="col" className="px-4 py-3 text-right text-sm font-semibold">
                    متاح مخزون
                  </th>
                  <th scope="col" className="px-4 py-3 text-right text-sm font-semibold">
                    تاريخ الإنشاء
                  </th>
                  <th scope="col" className="px-4 py-3 text-right text-sm font-semibold">
                    السعر العام
                  </th>
                  <th scope="col" className="px-4 py-3 text-right text-sm font-semibold">
                    السعر الخاص
                  </th>
                  <th scope="col" className="px-4 py-3 text-right text-sm font-semibold">
                    سعر المشترك
                  </th>
                  
                  {showActionsColumn && (
                    <th scope="col" className="px-4 py-3 text-left text-sm font-semibold">
                      الإجراءات
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-background">
                {products.map((product, index) => {
                  const displayIndex = (currentPage - 1) * pageSize + index + 1
                  return (
                    <tr key={product.id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-4 py-4 text-sm font-medium text-center">{displayIndex}</td>
                      <td className="px-4 py-4">
                        <button
                          onClick={() => setSelectedImage(product.imageUrl)}
                          className="relative h-12 w-12 rounded-lg overflow-hidden bg-muted hover:opacity-80 transition-opacity cursor-pointer"
                        >
                          <Image
                            src={product.imageUrl || "/placeholder.svg"}
                            alt={product.name}
                            fill
                            className="object-cover"
                          />
                        </button>
                      </td>
                      <td className="px-4 py-4 text-sm font-medium">{product.name}</td>
                      <td className="px-4 py-4 text-sm text-muted-foreground">{product.barcode || "غير محدد"}</td>
                      <td className="px-4 py-4 text-sm text-muted-foreground">
                        {product.stockQuantity}
                      </td>
                      <td className="px-4 py-4 text-sm">
                        <Badge variant={product.isInStock ? "default" : "destructive"}>
                          {product.isInStock ? "متاح" : "غير متاح"}
                        </Badge>
                      </td>
                      <td className="px-4 py-4 text-sm text-muted-foreground">{formatDateArabic(product.createdAt)}</td>
                      <td className="px-4 py-4 text-sm text-muted-foreground">
                        {product.pricePublic} د.ع
                      </td>
                      <td className="px-4 py-4 text-sm text-muted-foreground">
                        {product.pricePrivate} د.ع
                      </td>
                      <td className="px-4 py-4 text-sm text-muted-foreground">
                        {product.priceSubscription} د.ع
                      </td>
                      
                      {showActionsColumn && (
                        <td className="px-4 py-4 text-sm">
                          <div className="flex gap-1 justify-end">
                            {canUpdate && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleEditProduct(product)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            )}
                            {canDelete && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => handleDeleteProduct(product)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {pagination && pagination.totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                صفحة {pagination.currentPage} من {pagination.totalPages} ({pagination.totalCount} منتج)
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={!pagination.hasPrevious}
                  className="gap-1"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>

                {getPageNumbers().map((page, index) =>
                  page === "..." ? (
                    <span key={`ellipsis-${index}`} className="px-2 text-muted-foreground">
                      ...
                    </span>
                  ) : (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => handlePageChange(page as number)}
                      className="h-8 w-8 p-0"
                    >
                      {page}
                    </Button>
                  ),
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={!pagination.hasNext}
                  className="gap-1"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {products.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-lg font-medium mb-1">لا توجد منتجات</p>
              <p className="text-sm">جرب تغيير معايير البحث أو الفلترة</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogClose className="absolute left-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
            <X className="h-4 w-4" />
            <span className="sr-only">إغلاق</span>
          </DialogClose>
          <DialogHeader>
            <DialogTitle>{isEditMode ? "تعديل المنتج" : "إضافة منتج جديد"}</DialogTitle>
            <DialogDescription>
              {isEditMode ? "قم بتعديل بيانات المنتج" : "أدخل بيانات المنتج الجديد"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>صورة المنتج</Label>
              <div className="flex flex-col gap-3">
                {imagePreview ? (
                  <div className="relative w-full h-48 rounded-lg overflow-hidden bg-muted border-2 border-dashed border-border">
                    <Image src={imagePreview || "/placeholder.svg"} alt="Preview" fill className="object-contain" />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 left-2 h-8 w-8"
                      onClick={handleRemoveImage}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <label
                    htmlFor="image-upload"
                    className={`flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                      validationErrors.image
                        ? "border-destructive bg-destructive/10 hover:bg-destructive/20"
                        : "border-border bg-muted/50 hover:bg-muted"
                    }`}
                  >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-10 h-10 mb-3 text-muted-foreground" />
                      <p className="mb-2 text-sm text-muted-foreground">
                        <span className="font-semibold">اضغط لرفع صورة</span>
                      </p>
                      <p className="text-xs text-muted-foreground">PNG, JPG أو JPEG</p>
                    </div>
                    <Input
                      id="image-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUpload}
                    />
                  </label>
                )}
                {validationErrors.image && <p className="text-sm text-destructive">{validationErrors.image}</p>}
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="product-name">اسم المنتج</Label>
              <Input
                id="product-name"
                value={newProduct.name}
                onChange={(e) => {
                  setNewProduct({ ...newProduct, name: e.target.value })
                  if (validationErrors.name) {
                    setValidationErrors({ ...validationErrors, name: "" })
                  }
                }}
                placeholder="أدخل اسم المنتج"
                className={`text-right ${validationErrors.name ? "border-destructive" : ""}`}
              />
              {validationErrors.name && <p className="text-sm text-destructive">{validationErrors.name}</p>}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="category">القسم</Label>
              <Select
                value={newProduct.categoryId}
                onValueChange={(value) => {
                  setNewProduct({ ...newProduct, categoryId: value })
                  if (validationErrors.categoryId) {
                    setValidationErrors({ ...validationErrors, categoryId: "" })
                  }
                }}
              >
                <SelectTrigger id="category" className={validationErrors.categoryId ? "border-destructive" : ""}>
                  <SelectValue placeholder="اختر القسم" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id.toString()}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {validationErrors.categoryId && <p className="text-sm text-destructive">{validationErrors.categoryId}</p>}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="barcode">الباركود (اختياري)</Label>
              <Input
                id="barcode"
                value={newProduct.barcode}
                onChange={(e) => setNewProduct({ ...newProduct, barcode: e.target.value })}
                placeholder="أدخل الباركود"
                className="text-right"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="stock">المخزون</Label>
              <Input
                id="stock"
                type="number"
                value={newProduct.stockQuantity}
                onChange={(e) => {
                  setNewProduct({ ...newProduct, stockQuantity: e.target.value })
                  if (validationErrors.stockQuantity) {
                    setValidationErrors({ ...validationErrors, stockQuantity: "" })
                  }
                }}
                placeholder="أدخل الكمية"
                className={`text-right ${validationErrors.stockQuantity ? "border-destructive" : ""}`}
              />
              {validationErrors.stockQuantity && (
                <p className="text-sm text-destructive">{validationErrors.stockQuantity}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="public-price">السعر العام</Label>
                <Input
                  id="public-price"
                  type="number"
                  step="0.01"
                  value={newProduct.pricePublic}
                  onChange={(e) => {
                    setNewProduct({ ...newProduct, pricePublic: e.target.value })
                    if (validationErrors.pricePublic || validationErrors.priceRelation) {
                      setValidationErrors({
                        ...validationErrors,
                        pricePublic: "",
                        priceRelation: "",
                      })
                    }
                  }}
                  placeholder="0.00"
                  className={`text-right ${validationErrors.pricePublic ? "border-destructive" : ""}`}
                />
                {validationErrors.pricePublic && (
                  <p className="text-sm text-destructive">{validationErrors.pricePublic}</p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="special-price">السعر الخاص</Label>
                <Input
                  id="special-price"
                  type="number"
                  step="0.01"
                  value={newProduct.pricePrivate}
                  onChange={(e) => {
                    setNewProduct({ ...newProduct, pricePrivate: e.target.value })
                    if (validationErrors.pricePrivate || validationErrors.priceRelation) {
                      setValidationErrors({
                        ...validationErrors,
                        pricePrivate: "",
                        priceRelation: "",
                      })
                    }
                  }}
                  placeholder="0.00"
                  className={`text-right ${validationErrors.pricePrivate ? "border-destructive" : ""}`}
                />
                {validationErrors.pricePrivate && (
                  <p className="text-sm text-destructive">{validationErrors.pricePrivate}</p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="subscription-price">سعر المشترك</Label>
                <Input
                  id="subscription-price"
                  type="number"
                  step="0.01"
                  value={newProduct.priceSubscription}
                  onChange={(e) => {
                    setNewProduct({ ...newProduct, priceSubscription: e.target.value })
                    if (validationErrors.priceSubscription || validationErrors.priceRelation) {
                      setValidationErrors({
                        ...validationErrors,
                        priceSubscription: "",
                        priceRelation: "",
                      })
                    }
                  }}
                  placeholder="0.00"
                  className={`text-right ${validationErrors.priceSubscription ? "border-destructive" : ""}`}
                />
                {validationErrors.priceSubscription && (
                  <p className="text-sm text-destructive">{validationErrors.priceSubscription}</p>
                )}
              </div>
            </div>

            {validationErrors.priceRelation && (
              <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-md">
                <p className="text-sm text-destructive">{validationErrors.priceRelation}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSubmitting}>
              إلغاء
            </Button>
            <Button onClick={handleAddProduct} disabled={isSubmitting}>
              {isSubmitting ? "جاري الحفظ..." : isEditMode ? "حفظ التعديلات" : "إضافة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>هل أنت متأكد من الحذف؟</AlertDialogTitle>
            <AlertDialogDescription>
              هذا الإجراء لا يمكن التراجع عنه. سيتم حذف المنتج نهائياً من النظام.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={selectedImage !== null} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl md:max-w-3xl lg:max-w-4xl p-4 md:p-6">
          <DialogClose className="absolute left-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring disabled:pointer-events-none z-10">
            <X className="h-5 w-5" />
          </DialogClose>
          <DialogHeader>
            <DialogTitle className="text-lg md:text-xl">عرض صورة المنتج</DialogTitle>
          </DialogHeader>
          {selectedImage && (
            <div className="relative w-full h-[60vh] sm:h-[70vh] md:h-[500px] rounded-lg overflow-hidden bg-muted">
              <Image src={selectedImage || "/placeholder.svg"} alt="صورة المنتج" fill className="object-contain" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}