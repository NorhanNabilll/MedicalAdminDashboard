"use client"
import { withPermission } from "@/components/with-permission"
import DashboardLayout from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Pencil, Trash2, Loader2, Search, ChevronLeft, ChevronRight } from "lucide-react"
import { useState, useEffect, useRef, useMemo } from "react"
import { useAuth } from "@/context/AuthContext"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import useSWR from "swr"
import { getCategories, createCategory, updateCategory, deleteCategory, type Category } from "@/lib/api/categories"
import { useToast } from "@/hooks/use-toast"

function CategoriesPage() {
  const { hasPermission } = useAuth()
  // تحديد الصلاحيات مرة واحدة
  const canCreate = useMemo(() => hasPermission("Categories.Create"), [hasPermission])
  const canUpdate = useMemo(() => hasPermission("Categories.Update"), [hasPermission])
  const canDelete = useMemo(() => hasPermission("Categories.Delete"), [hasPermission])
  // إذا كان عنده أي صلاحية تعديل أو حذف، يظهر عمود الإجراءات
  const showActionsColumn = canUpdate || canDelete

  const [searchTerm, setSearchTerm] = useState("")
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
      setCurrentPage(1)
    }, 600)

    return () => clearTimeout(timer)
  }, [searchTerm])

  const { data, error, isLoading, mutate } = useSWR(["categories", debouncedSearchTerm, currentPage, pageSize], () =>
    getCategories({
      page: currentPage,
      pageSize:pageSize,
      searchTerm: debouncedSearchTerm || undefined,
    }),
  )

  useEffect(() => {
    if (data && searchInputRef.current && document.activeElement !== searchInputRef.current) {
      setTimeout(() => {
        if (searchInputRef.current && document.activeElement !== searchInputRef.current) {
          searchInputRef.current.focus()
        }
      }, 0)
    }
  }, [data])

  const { toast } = useToast()

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [deletingCategoryId, setDeletingCategoryId] = useState<number | null>(null)
  const [categoryName, setCategoryName] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [nameError, setNameError] = useState("")

  const categories = data?.data && "items" in data.data ? data.data.items : []
  const pagination = data?.data && "items" in data.data ? data.data.pagination : null

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

  const handleAddCategory = async () => {
    if (!categoryName.trim()) {
      setNameError("اسم القسم مطلوب")
      return
    }
    if (categoryName.trim().length < 2) {
      setNameError("اسم القسم يجب أن يكون على الأقل حرفين")
      return
    }

    setIsSubmitting(true)
    try {
      if (isEditMode && editingCategoryId) {
        const response = await updateCategory(editingCategoryId, {
          id: editingCategoryId,
          name: categoryName,
        })
        if (response.success) {
          toast({
            title: "تم التعديل بنجاح",
            description: response.message,
          })
          mutate()
        } else {
          toast({
            title: "فشل التعديل",
            description: response.message,
            variant: "destructive",
            // duration: 10
          })
        }
      } else {
        const response = await createCategory({ name: categoryName })
        if (response.success) {
          toast({
            title: "تمت الإضافة بنجاح",
            description: response.message,
          })
          mutate()
        } else {
          toast({
            title: "فشلت الإضافة",
            description: response.message,
            variant: "destructive",
          })
        }
      }
      setCategoryName("")
      setNameError("")
      setIsDialogOpen(false)
      setIsEditMode(false)
      setEditingCategoryId(null)
    } catch (error: any) {
      toast({
        title: "حدث خطأ",
        description: error.message || "فشل في حفظ القسم",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditCategory = (category: Category) => {
    setCategoryName(category.name)
    setEditingCategoryId(category.id)
    setIsEditMode(true)
    setIsDialogOpen(true)
  }

  const handleDeleteCategory = (categoryId: number) => {
    setDeletingCategoryId(categoryId)
    setIsDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!deletingCategoryId) return

    setIsSubmitting(true)
    try {
      const response = await deleteCategory(deletingCategoryId)
      if (response.success) {
        toast({
          title: "تم الحذف بنجاح",
          description: response.message,
        })
        mutate()
      } else {
        toast({
          title: "فشل الحذف",
          description: response.message,
          variant: "destructive",
        })
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || "فشل في حذف القسم"
      toast({
        title: "حدث خطأ",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
      setIsDeleteDialogOpen(false)
      setDeletingCategoryId(null)
    }
  }

  const handleOpenAddDialog = () => {
    setCategoryName("")
    setNameError("")
    setIsEditMode(false)
    setEditingCategoryId(null)
    setIsDialogOpen(true)
  }

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage)
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">الأقسام</h1>
            <p className="text-muted-foreground mt-1">إدارة أقسام المنتجات</p>
          </div>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    )
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">الأقسام</h1>
            <p className="text-muted-foreground mt-1">إدارة أقسام المنتجات</p>
          </div>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <p className="text-destructive mb-4">فشل في تحميل الأقسام</p>
                <Button onClick={() => mutate()} variant="outline" size="sm">
                  إعادة المحاولة
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6" dir="rtl">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">الأقسام</h1>
          <p className="text-muted-foreground mt-1">إدارة أقسام المنتجات</p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <CardTitle>قائمة الأقسام</CardTitle>
                <CardDescription>عرض وإدارة جميع الأقسام</CardDescription>
              </div>
              {canCreate && (
                <Button onClick={handleOpenAddDialog} className="gap-2 w-full md:w-auto">
                  <Plus className="h-4 w-4" />
                  إضافة قسم
                </Button>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-4 items-end mt-4">
              <div className="w-full sm:flex-1">
                <Label htmlFor="search" className="mb-2 block">
                  البحث
                </Label>
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    ref={searchInputRef}
                    id="search"
                    type="text"
                    placeholder="ابحث عن قسم..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pr-10 text-right w-full"
                  />
                </div>
              </div>
              <div className="w-full sm:w-auto">
                <Select
                  value={pageSize.toString()}
                  onValueChange={(value) => {
                    setPageSize(Number(value))
                    setCurrentPage(1)
                  }}
                >
                  <SelectTrigger id="pageSize" className="w-full sm:w-[120px]">
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
            {categories.length === 0 && debouncedSearchTerm ? (
              <div className="text-center py-12 text-muted-foreground">
                <p className="text-lg font-medium mb-1">لا توجد نتائج</p>
                <p className="text-sm">لا توجد نتائج للبحث "{debouncedSearchTerm}"</p>
              </div>
            ) : categories.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p className="text-lg font-medium mb-1">لا توجد أقسام</p>
                <p className="text-sm">ابدأ بإضافة قسم جديد</p>
              </div>
            ) : (
              <>
                {/* Mobile*/}
                <div className="md:hidden space-y-4">
                  {categories.map((category, index) => {
                    const displayIndex = (currentPage - 1) * pageSize + index + 1
                    return (
                      <Card key={category.id} className="overflow-hidden">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3 flex-1">
                              <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary/10 text-primary font-semibold flex-shrink-0">
                                {displayIndex}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-base truncate">{category.name}</h3>
                                <p className="text-sm text-muted-foreground mt-1">{category.productCount} منتج</p>
                              </div>
                            </div>
                          </div>

                          {/* إظهار الأزرار فقط إذا كان عنده صلاحيات */}
                          {showActionsColumn && (
                            <div className="flex gap-2">
                              {canUpdate && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="flex-1 bg-transparent"
                                  onClick={() => handleEditCategory(category)}
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
                                  onClick={() => handleDeleteCategory(category.id)}
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

                {/* Descktop*/}
                <div className="hidden md:block overflow-x-auto rounded-md border">
                  <table className="min-w-full divide-y divide-border">
                    <thead className="bg-muted/50">
                      <tr>
                        <th scope="col" className="px-4 py-3 text-right text-sm font-semibold w-20">
                          #
                        </th>
                        <th scope="col" className="px-4 py-3 text-right text-sm font-semibold">
                          اسم القسم
                        </th>
                        <th scope="col" className="px-2 py-3 text-right text-sm font-semibold">
                          عدد المنتجات
                        </th>
                        {/* إظهار عمود الإجراءات فقط إذا كان عنده صلاحيات */}
                        {showActionsColumn && (
                          <th scope="col" className="px-4 py-3 text-center text-sm font-semibold w-32">
                            الإجراءات
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border bg-background">
                      {categories.map((category, index) => {
                        const displayIndex = (currentPage - 1) * pageSize + index + 1
                        return (
                          <tr key={category.id} className="hover:bg-muted/50 transition-colors">
                            <td className="px-4 py-4 text-sm font-medium">{displayIndex}</td>
                            <td className="px-4 py-4 text-sm">
                              <span>{category.name}</span>
                            </td>
                            <td className="px-6 py-4 text-sm  text-muted-foreground ">{category.productCount}</td>

                            {/* إظهار خلية الإجراءات فقط إذا كان العمود ظاهر */}
                            {showActionsColumn && (
                              <td className="px-4 py-4 text-sm">
                                <div className="flex gap-2 justify-center">
                                  {canUpdate && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
                                      onClick={() => handleEditCategory(category)}
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                  )}

                                  {canDelete && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                      onClick={() => handleDeleteCategory(category.id)}
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
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 pt-4 border-t">
                    <div className="text-sm text-muted-foreground mx-3.5">
                      صفحة {pagination.currentPage} من {pagination.totalPages} ({pagination.totalCount} قسم)
                    </div>

                    <div className="flex items-center gap-1 mx-3.5">
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
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]" dir="rtl">
          <DialogHeader>
            <DialogTitle>{isEditMode ? "تعديل القسم" : "إضافة قسم جديد"}</DialogTitle>
            <DialogDescription>{isEditMode ? "قم بتعديل اسم القسم" : "أدخل اسم القسم الجديد"}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="category-name">اسم القسم</Label>
              <Input
                id="category-name"
                value={categoryName}
                onChange={(e) => {
                  setCategoryName(e.target.value)
                  setNameError("")
                }}
                placeholder="أدخل اسم القسم"
                className="text-right"
                disabled={isSubmitting}
              />
              {nameError && <p className="text-sm text-destructive">{nameError}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSubmitting}>
              إلغاء
            </Button>
            <Button
              onClick={handleAddCategory}
              disabled={isSubmitting || !categoryName.trim() || categoryName.trim().length < 2}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  جاري الحفظ...
                </>
              ) : isEditMode ? (
                "حفظ التعديلات"
              ) : (
                "إضافة"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>هل أنت متأكد من الحذف؟</AlertDialogTitle>
            <AlertDialogDescription>
              هذا الإجراء لا يمكن التراجع عنه. سيتم حذف القسم نهائياً من النظام.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isSubmitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  جاري الحذف...
                </>
              ) : (
                "حذف"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  )
}
export default withPermission(CategoriesPage, { permission: "Categories.View" })
