"use client"

import DashboardLayout from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { UserPlus, Pencil, Trash2, Search, ChevronLeft, ChevronRight } from "lucide-react"
import { useState, useRef, useEffect, useMemo } from "react"
import { useAuth } from "@/context/AuthContext"
import { withPermission } from "@/components/with-permission"
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
import {
  fetchUsers,
  createUser,
  updateUser,
  deleteUser,
  mapCustomerTypeToArabic,
  mapArabicToCustomerType,
  type User,
  type Pagination,
} from "@/lib/api/users"
import { useToast } from "@/hooks/use-toast"
import { Skeleton } from "@/components/ui/skeleton"

function UsersPage() {
  const { toast } = useToast()

  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
      setCurrentPage(1) // Reset to first page when searching
    }, 600)

    return () => clearTimeout(timer)
  }, [searchQuery])

  const { data, error, isLoading, mutate } = useSWR(
    ["/v1/User", { searchByCode: debouncedSearchQuery, pageNumber: currentPage, pageSize }],
    ([key, options]) => fetchUsers(key, options),
  )

  const { hasPermission } = useAuth()

  // تحديد الصلاحيات مرة واحدة
  const canCreate = useMemo(() => hasPermission("Users.Create"), [hasPermission])
  const canUpdate = useMemo(() => hasPermission("Users.Update"), [hasPermission])
  const canDelete = useMemo(() => hasPermission("Users.Delete"), [hasPermission])

  // إذا كان عنده أي صلاحية تعديل أو حذف، يظهر عمود الإجراءات
  const showActionsColumn = canUpdate || canDelete
  const users = data?.items || []
  const pagination: Pagination | undefined = data?.pagination

  const getPageNumbers = () => {
    if (!pagination) return []

    const totalPages = pagination.totalPages
    const pages: (number | string)[] = []

    if (totalPages <= 4) {
      // Show all pages if 4 or fewer
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // Show first 3 pages + ellipsis + last page
      pages.push(1)
      pages.push(2)
      pages.push(3)
      pages.push("...")
      pages.push(totalPages)
    }

    return pages
  }

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [newUser, setNewUser] = useState({
    fullName: "",
    customerId: "",
    phoneNumber: "",
    address: "",
    type: "خاص",
  })

  const handleAddUser = async () => {
    if (newUser.fullName && newUser.customerId && newUser.phoneNumber && newUser.address) {
      setIsSubmitting(true)
      try {
        const userData = {
          customerId: newUser.customerId,
          fullName: newUser.fullName,
          phoneNumber: newUser.phoneNumber,
          address: newUser.address,
          customerType: mapArabicToCustomerType(newUser.type),
        }

        if (isEditMode && editingUserId !== null) {
          await updateUser(editingUserId, userData)
          toast({
            title: "تم التعديل بنجاح",
            description: "تم تعديل بيانات المستخدم بنجاح",
          })
        } else {
          await createUser(userData)
          toast({
            title: "تمت الإضافة بنجاح",
            description: "تم إضافة المستخدم الجديد بنجاح",
          })
        }

        // Refresh the users list
        mutate()

        setNewUser({ fullName: "", customerId: "", phoneNumber: "", address: "", type: "خاص" })
        setIsDialogOpen(false)
        setIsEditMode(false)
        setEditingUserId(null)
      } catch (error) {
        toast({
          title: "حدث خطأ",
          description: error instanceof Error ? error.message : "فشل في حفظ البيانات",
          variant: "destructive",
        })
      } finally {
        setIsSubmitting(false)
      }
    }
  }

  const handleEditUser = (user: User) => {
    setNewUser({
      fullName: user.fullName,
      customerId: user.customerId,
      phoneNumber: user.phoneNumber,
      address: user.address,
      type: mapCustomerTypeToArabic(user.customerType),
    })
    setEditingUserId(user.id)
    setIsEditMode(true)
    setIsDialogOpen(true)
  }

  const handleDeleteUser = (userId: string) => {
    setDeletingUserId(userId)
    setIsDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (deletingUserId !== null) {
      try {
        await deleteUser(deletingUserId)
        toast({
          title: "تم الحذف بنجاح",
          description: "تم حذف المستخدم من النظام",
        })

        // Refresh the users list
        mutate()

        setIsDeleteDialogOpen(false)
        setDeletingUserId(null)
      } catch (error) {
        toast({
          title: "حدث خطأ",
          description: error instanceof Error ? error.message : "فشل في حذف المستخدم",
          variant: "destructive",
        })
      }
    }
  }

  const handleOpenAddDialog = () => {
    setNewUser({ fullName: "", customerId: "", phoneNumber: "", address: "", type: "عام" })
    setIsEditMode(false)
    setEditingUserId(null)
    setIsDialogOpen(true)
  }

  if (error) {
    return (
      <DashboardLayout>
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-destructive">
              <p className="text-lg font-semibold">حدث خطأ في تحميل البيانات</p>
              <p className="text-sm mt-2">{error.message}</p>
              <Button onClick={() => mutate()} className="mt-4">
                إعادة المحاولة
              </Button>
            </div>
          </CardContent>
        </Card>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">إدارة المستخدمين</h1>
            <p className="text-muted-foreground mt-1">إدارة حسابات المستخدمين والصلاحيات</p>
          </div>
        </div>

        <Card>
  <CardHeader>
  <div className="flex flex-col gap-4">
    {/* Section 1: Title and Add Button */}
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div>
        <CardTitle>قائمة المستخدمين</CardTitle>
        <CardDescription>جميع المستخدمين المسجلين في النظام</CardDescription>
      </div>
      {canCreate && (
        <Button className="w-full md:w-auto" onClick={handleOpenAddDialog}>
          <UserPlus className="ml-2 h-4 w-4" />
          إضافة مستخدم جديد
        </Button>
      )}
    </div>

    {/* Section 2: Filters (Search and Page Size) */}
    {/* This is the corrected part */}
    <div className="flex flex-col sm:flex-row gap-4 items-end mt-4">
      {/* Search Input */}
      <div className="w-full sm:flex-1">
        <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={searchInputRef}
          id="search"
          placeholder="ابحث عن المستخدم بالكود..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pr-10 text-right"
        />
      </div>
      
      {/* Page Size Selector */}
      <div className="w-full sm:w-auto">
        <Select
          value={pageSize.toString()}
          onValueChange={(value) => {
            setPageSize(Number(value))
            setCurrentPage(1)
          }}
        >
          <SelectTrigger id="pageSize" className="w-full md:w-[120px]">
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
  </div>
</CardHeader>
          <CardContent>
            <div className="space-y-4">
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center space-x-4 space-x-reverse">
                      <Skeleton className="h-12 w-12 rounded-full" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  <div className="md:hidden space-y-4">
                    {users?.map((user, index) => (
                      <Card key={user.id} className="overflow-hidden">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary/10 text-primary font-semibold">
                                {(currentPage - 1) * pageSize + index + 1}
                              </div>
                              <div className="flex-1">
                                <h3 className="font-semibold text-base">{user.fullName}</h3>
                                <p className="text-sm text-muted-foreground mt-0.5">{user.customerId}</p>
                              </div>
                            </div>
                          </div>
                          <div className="space-y-2 text-sm">
                            <div className="flex items-start">
                              <span className="text-muted-foreground min-w-[80px]">التليفون:</span>
                              <span className="font-medium">{user.phoneNumber}</span>
                            </div>
                            <div className="flex items-start">
                              <span className="text-muted-foreground min-w-[80px]">العنوان:</span>
                              <span className="font-medium min-w-0 break-words">{user.address}</span>
                            </div>
                          </div>

                          {showActionsColumn && (
                            <div className="flex gap-2 mt-4 pt-3 border-t">
                              {canUpdate && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="flex-1 bg-transparent"
                                  onClick={() => handleEditUser(user)}
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
                                  onClick={() => handleDeleteUser(user.id)}
                                >
                                  <Trash2 className="ml-2 h-3.5 w-3.5" />
                                  حذف
                                </Button>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  <div className="hidden md:block overflow-x-auto rounded-md border">
                    <table className="min-w-full divide-y divide-border">
                      <thead className="bg-muted/50">
                        <tr>
                          <th scope="col" className="px-4 py-3 text-right text-sm font-semibold w-12">
                            #
                          </th>
                          <th scope="col" className="px-4 py-3 text-right text-sm font-semibold">
                            الاسم
                          </th>
                          <th scope="col" className="px-4 py-3 text-right text-sm font-semibold">
                            الكود
                          </th>
                          <th scope="col" className="px-4 py-3 text-right text-sm font-semibold">
                            رقم التليفون
                          </th>
                          <th scope="col" className="px-4 py-3 text-right text-sm font-semibold">
                            العنوان
                          </th>
                          {showActionsColumn && (
                            <th scope="col" className="px-4 py-3 text-center text-sm font-semibold">
                              الإجراءات
                            </th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border bg-background">
                        {users?.map((user, index) => (
                          <tr key={user.id} className="hover:bg-muted/50 transition-colors">
                            <td className="px-4 py-4 text-sm font-medium text-muted-foreground">
                              {(currentPage - 1) * pageSize + index + 1}
                            </td>
                            <td className="px-4 py-4 text-sm font-medium">{user.fullName}</td>
                            <td className="px-4 py-4 text-sm text-muted-foreground">{user.customerId}</td>
                            <td className="px-4 py-4 text-sm text-muted-foreground">{user.phoneNumber}</td>
                            <td className="px-4 py-4 text-sm text-muted-foreground  whitespace-normal break-words">
                              {user.address}
                            </td>
                            {showActionsColumn && (
                              <td className="px-4 py-4 text-sm">
                                <div className="flex gap-1 justify-center">
                                  {canUpdate && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() => handleEditUser(user)}
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                  )}
                                  {canDelete && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                      onClick={() => handleDeleteUser(user.id)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {pagination && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t">
                      <div className="text-sm text-muted-foreground px-4">
                        صفحة {pagination.currentPage} من {pagination.totalPages} ({pagination.totalCount} مستخدم)
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                          disabled={!pagination.hasPrevious}
                          className="gap-1"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>

                        {getPageNumbers().map((page, idx) =>
                          page === "..." ? (
                            <span key={`ellipsis-${idx}`} className="px-2 text-muted-foreground">
                              ...
                            </span>
                          ) : (
                            <Button
                              key={page}
                              variant={currentPage === page ? "default" : "outline"}
                              size="sm"
                              onClick={() => setCurrentPage(page as number)}
                              className="h-8 w-8 p-0"
                            >
                              {page}
                            </Button>
                          ),
                        )}

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setCurrentPage(Math.min(pagination.totalPages, currentPage + 1))}
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
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{isEditMode ? "تعديل بيانات المستخدم" : "إضافة مستخدم جديد"}</DialogTitle>
            <DialogDescription>
              {isEditMode ? "قم بتعديل بيانات المستخدم" : "أدخل بيانات المستخدم الجديد"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">الاسم</Label>
              <Input
                id="name"
                value={newUser.fullName}
                onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })}
                placeholder="أدخل الاسم"
                className="text-right"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="code">الكود</Label>
              <Input
                id="code"
                value={newUser.customerId}
                onChange={(e) => setNewUser({ ...newUser, customerId: e.target.value })}
                placeholder="أدخل الكود"
                className="text-right"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone">رقم التليفون</Label>
              <Input
                id="phone"
                value={newUser.phoneNumber}
                onChange={(e) => setNewUser({ ...newUser, phoneNumber: e.target.value })}
                placeholder="أدخل رقم التليفون"
                className="text-right"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="address">العنوان</Label>
              <Input
                id="address"
                value={newUser.address}
                onChange={(e) => setNewUser({ ...newUser, address: e.target.value })}
                placeholder="أدخل العنوان"
                className="text-right"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="type">النوع</Label>
              <Select
                value={newUser.type}
                onValueChange={(value) => setNewUser({ ...newUser, type: value })}
                disabled={!isEditMode}
              >
                <SelectTrigger id="type" className="text-right">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="عام">عام</SelectItem>
                  <SelectItem value="خاص">خاص</SelectItem>
                  <SelectItem value="مشترك">مشترك</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSubmitting}>
              إلغاء
            </Button>
            <Button onClick={handleAddUser} disabled={isSubmitting}>
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
              هذا الإجراء لا يمكن التراجع عنه. سيتم حذف المستخدم نهائياً من النظام.
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
    </DashboardLayout>
  )
}

export default withPermission(UsersPage, { permission: "Users.View" })
