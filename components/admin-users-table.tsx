"use client"

import { useState, useEffect, useRef } from "react"
import useSWR from "swr"
import { fetchAdminUsers, deleteAdminUser, type AdminUser } from "@/lib/api/admin-users"
import { fetchRoles } from "@/lib/api/roles"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Trash2, Edit2, Search, Plus, ChevronLeft, ChevronRight } from "lucide-react"
import AdminUserDialog from "./admin-user-dialog"
import { formatNumberEnglish } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"

export default function AdminUsersTable() {
  const { toast } = useToast()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
      setCurrentPage(1)
    }, 600)

    return () => clearTimeout(timer)
  }, [searchQuery])

  const {
    data: adminUsersData = {
      items: [],
      pagination: { currentPage: 1, pageSize: 10, totalCount: 0, totalPages: 0, hasPrevious: false, hasNext: false },
    },
    mutate: mutateUsers,
    isLoading,
  } = useSWR(
    ["adminUsers", currentPage, debouncedSearchQuery, pageSize],
    () =>
      fetchAdminUsers({
        page: currentPage,
        pageSize: pageSize,
        searchTerm: debouncedSearchQuery || undefined,
      }),
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000,
    },
  )

  const { data: roles = [] } = useSWR("roles", () => fetchRoles())

  const adminUsers = adminUsersData.items || []
  const pagination = adminUsersData.pagination

  const handleAddUser = () => {
    setEditingUser(null)
    setIsDialogOpen(true)
  }

  const handleEditUser = (user: AdminUser) => {
    setEditingUser(user)
    setIsDialogOpen(true)
  }

  const handleDeleteUser = (userId: string) => {
    setDeletingUserId(userId)
    setIsDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!deletingUserId) return

    setIsSubmitting(true)
    try {
      await deleteAdminUser(deletingUserId)
      toast({
        title: "تم الحذف بنجاح",
        description: "تم حذف المسؤول بنجاح",
      })
      mutateUsers()
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || "فشل في حذف المسؤول"
      toast({
        title: "حدث خطأ",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
      setIsDeleteDialogOpen(false)
      setDeletingUserId(null)
    }
  }

  const handleDialogClose = () => {
    setIsDialogOpen(false)
    setEditingUser(null)
  }

  const handleUserSaved = () => {
    mutateUsers()
    handleDialogClose()
  }

  const goToPage = (page: number) => {
    if (pagination) {
      setCurrentPage(Math.max(1, Math.min(page, pagination.totalPages)))
    }
  }

  const goToPreviousPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1)
  }

  const goToNextPage = () => {
    if (pagination && currentPage < pagination.totalPages) {
      setCurrentPage(currentPage + 1)
    }
  }

  const getPageNumbers = () => {
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

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>قائمة المديرين</CardTitle>
              <CardDescription>عرض وإدارة جميع مديرين لوحة التحكم</CardDescription>
            </div>
            <Button className="w-full sm:w-auto" onClick={handleAddUser}>
              <Plus className="ml-2 h-4 w-4" />
              إضافة مسؤول
            </Button>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 md:gap-4 items-end mt-4">
            <div className="relative flex-1 w-full">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                placeholder="البحث بالاسم أو البريد الإلكتروني..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10 text-right"
              />
            </div>
            <Select
              value={pageSize.toString()}
              onValueChange={(value) => {
                setPageSize(Number(value))
                setCurrentPage(1)
              }}
            >
              <SelectTrigger className="w-full sm:w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 صفوف</SelectItem>
                <SelectItem value="20">20 صف</SelectItem>
                <SelectItem value="50">50 صف</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner className="h-8 w-8" />
            </div>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="md:hidden space-y-4">
                {adminUsers.map((user, index) => {
                  const displayIndex = (currentPage - 1) * pageSize + index + 1
                  return (
                    <Card key={user.id} className="overflow-hidden relative">
                      <span className="absolute top-2 right-2 flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-semibold z-10">
                        {displayIndex}
                      </span>
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <div>
                            <p className="text-xs text-muted-foreground">الاسم</p>
                            <p className="font-semibold">{user.fullName}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">البريد الإلكتروني</p>
                            <p className="text-sm break-all">{user.userName}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">الدور</p>
                            <p className="text-sm font-medium">{user.roles?.[0]?.name || "غير محدد"}</p>
                          </div>
                          <div className="flex gap-2 pt-3 border-t">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 bg-transparent"
                              onClick={() => handleEditUser(user)}
                            >
                              <Edit2 className="ml-2 h-3.5 w-3.5" />
                              تعديل
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 text-destructive hover:text-destructive hover:bg-destructive/10 bg-transparent"
                              onClick={() => handleDeleteUser(user.id)}
                            >
                              <Trash2 className="ml-2 h-3.5 w-3.5" />
                              حذف
                            </Button>
                          </div>
                        </div>
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
                        الاسم
                      </th>
                      <th scope="col" className="px-4 py-3 text-right text-sm font-semibold">
                        البريد الإلكتروني
                      </th>
                      <th scope="col" className="px-4 py-3 text-right text-sm font-semibold">
                        الدور
                      </th>
                      <th scope="col" className="px-4 py-3 text-center text-sm font-semibold">
                        الإجراءات
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-background">
                    {adminUsers.map((user, index) => {
                      const displayIndex = (currentPage - 1) * pageSize + index + 1
                      return (
                        <tr key={user.id} className="hover:bg-muted/50 transition-colors">
                          <td className="px-4 py-4 text-sm font-medium text-center">{displayIndex}</td>
                          <td className="px-4 py-4 text-sm font-medium">{user.fullName}</td>
                          <td className="px-4 py-4 text-sm text-muted-foreground break-all">{user.userName}</td>
                          <td className="px-4 py-4 text-sm font-medium">{user.roles?.[0]?.name || "غير محدد"}</td>
                          <td className="px-4 py-4 text-sm">
                            <div className="flex gap-1 justify-center">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleEditUser(user)}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => handleDeleteUser(user.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {pagination && pagination.totalCount > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-4 border-t">
                  <div className="text-sm text-muted-foreground px-4">
                    عرض {formatNumberEnglish((currentPage - 1) * pageSize + 1)} -{" "}
                    {formatNumberEnglish(Math.min(currentPage * pageSize, pagination.totalCount))} من{" "}
                    {formatNumberEnglish(pagination.totalCount)} مسؤول
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={goToPreviousPage}
                      disabled={!pagination.hasPrevious}
                      className="h-8 w-8 p-0 bg-transparent"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>

                    <div className="flex items-center gap-1">
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
                            onClick={() => goToPage(page as number)}
                            className="h-8 w-8 p-0"
                          >
                            {formatNumberEnglish(page as number)}
                          </Button>
                        ),
                      )}
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={goToNextPage}
                      disabled={!pagination.hasNext}
                      className="h-8 w-8 p-0 bg-transparent"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {!isLoading && adminUsers.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <p className="text-lg font-medium mb-1">لا يوجد مسؤولين</p>
                  <p className="text-sm">جرب تغيير معايير البحث</p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <AdminUserDialog
        open={isDialogOpen}
        onOpenChange={handleDialogClose}
        user={editingUser}
        roles={roles}
        onSave={handleUserSaved}
      />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogTitle>هل أنت متأكد من الحذف؟</AlertDialogTitle>
          <AlertDialogDescription>
            هذا الإجراء لا يمكن التراجع عنه. سيتم حذف المسؤول نهائياً من النظام.
          </AlertDialogDescription>
          <div className="flex gap-2 justify-end">
            <AlertDialogCancel disabled={isSubmitting}>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isSubmitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSubmitting ? "جاري الحذف..." : "حذف"}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}