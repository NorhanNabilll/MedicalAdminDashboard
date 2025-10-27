"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Pencil, Trash2, Loader2, Search } from "lucide-react"
import { useState, useEffect } from "react"
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
import useSWR from "swr"
import { getCategories, createCategory, updateCategory, deleteCategory, type Category } from "@/lib/api/categories"
import { useToast } from "@/hooks/use-toast"

type CategoriesListProps = {
  selectedCategoryId: number | null
  onCategorySelect: (categoryId: number | null) => void
}

export default function CategoriesList({ selectedCategoryId, onCategorySelect }: CategoriesListProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("")

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchTerm])

  const { data, error, isLoading, mutate } = useSWR(["categories", debouncedSearchTerm], () =>
    getCategories({ pageSize: 100, searchTerm: debouncedSearchTerm || undefined }),
  )
  const { toast } = useToast()

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [deletingCategoryId, setDeletingCategoryId] = useState<number | null>(null)
  const [categoryName, setCategoryName] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const categories = data?.data && "items" in data.data ? data.data.items : []

  const handleAddCategory = async () => {
    if (!categoryName.trim()) return

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
        if (selectedCategoryId === deletingCategoryId) {
          onCategorySelect(null)
        }
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
    setIsEditMode(false)
    setEditingCategoryId(null)
    setIsDialogOpen(true)
  }

  if (isLoading) {
    return (
      <Card className="h-fit">
        <CardHeader>
          <CardTitle>الأقسام</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="h-fit">
        <CardHeader>
          <CardTitle>الأقسام</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-destructive mb-4">فشل في تحميل الأقسام</p>
            <Button onClick={() => mutate()} variant="outline" size="sm">
              إعادة المحاولة
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className="h-fit">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>الأقسام</CardTitle>
            <Button size="icon" variant="outline" className="h-8 w-8 bg-transparent" onClick={handleOpenAddDialog}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="ابحث عن قسم..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10 text-right"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div
              onClick={() => onCategorySelect(null)}
              className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                selectedCategoryId === null ? "bg-primary text-primary-foreground" : "bg-card hover:bg-accent/50"
              }`}
            >
              <span className="font-medium">الكل</span>
            </div>

            {categories.map((category) => (
              <div
                key={category.id}
                onClick={() => onCategorySelect(category.id)}
                className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedCategoryId === category.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-card hover:bg-accent/50"
                }`}
              >
                <span className="font-medium">{category.name}</span>
                <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditCategory(category)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleDeleteCategory(category.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}

            {categories.length === 0 && debouncedSearchTerm && (
              <div className="text-center py-8 text-muted-foreground">
                <p>لا توجد نتائج للبحث "{debouncedSearchTerm}"</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
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
                onChange={(e) => setCategoryName(e.target.value)}
                placeholder="أدخل اسم القسم"
                className="text-right"
                disabled={isSubmitting}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSubmitting}>
              إلغاء
            </Button>
            <Button onClick={handleAddCategory} disabled={isSubmitting}>
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
        <AlertDialogContent>
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
    </>
  )
}
