"use client"

import { useState } from "react"
import useSWR from "swr"
import { fetchRoles, deleteRole, type Role } from "@/lib/api/roles"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Trash2, Edit2, Loader2, Plus } from "lucide-react"
import RoleDialog from "./role-dialog"
import { useToast } from "@/hooks/use-toast"

export default function RolesTable() {
  const { toast } = useToast()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; roleId: string | null }>({
    open: false,
    roleId: null,
  })
  const [isDeleting, setIsDeleting] = useState(false)

  const { data: allRoles = [], mutate, isLoading } = useSWR("roles", () => fetchRoles())

  const filteredRoles = allRoles

  const handleAddRole = () => {
    setEditingRole(null)
    setIsDialogOpen(true)
  }

  const handleEditRole = (role: Role) => {
    setEditingRole(role)
    setIsDialogOpen(true)
  }

  const handleDeleteRole = async () => {
    if (!deleteConfirm.roleId) return
    setIsDeleting(true)
    try {
      await deleteRole(deleteConfirm.roleId)
      toast({ title: "تم الحذف بنجاح", description: "تم حذف الدور بنجاح." })
      mutate()
      setDeleteConfirm({ open: false, roleId: null })
    } catch (error: any) {
      console.error("Delete role error:", error)
      toast({
        title: "فشل الحذف",
        description: error.message || "حدث خطأ أثناء حذف الدور.",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleDialogClose = () => {
    setIsDialogOpen(false)
    setEditingRole(null)
  }

  const handleRoleSaved = () => {
    mutate()
    handleDialogClose()
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>قائمة الأدوار</CardTitle>
              <CardDescription>إدارة الأدوار والصلاحيات للمستخدمين</CardDescription>
            </div>
            <Button onClick={handleAddRole} className="gap-2">
              <Plus className="h-4 w-4" />
              إضافة دور
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {filteredRoles.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-lg font-medium mb-1">لا توجد أدوار</p>
              <p className="text-sm">ابدأ بإضافة دور جديد</p>
            </div>
          ) : (
            <>
              {/* Mobile View */}
              <div className="md:hidden space-y-4">
                {filteredRoles.map((role, index) => (
                  <Card key={role.id} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary/10 text-primary font-semibold">
                            {index + 1}
                          </div>
                          <h3 className="font-semibold text-base min-w-0 break-words">{role.name}</h3>
                        </div>
                      </div>
                      <div className="flex gap-2 pt-3 border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 bg-transparent"
                          onClick={() => handleEditRole(role)}
                        >
                          <Edit2 className="ml-2 h-3.5 w-3.5" />
                          تعديل
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 text-destructive hover:text-destructive hover:bg-destructive/10 bg-transparent"
                          onClick={() => setDeleteConfirm({ open: true, roleId: role.id })}
                        >
                          <Trash2 className="ml-2 h-3.5 w-3.5" />
                          حذف
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Desktop View */}
              <div className="hidden md:block overflow-x-auto rounded-md border">
                <table className="min-w-full divide-y divide-border">
                  <thead className="bg-muted/50">
                    <tr>
                      <th scope="col" className="px-4 py-3 text-right text-sm font-semibold w-20">
                        #
                      </th>
                      <th scope="col" className="px-4 py-3 text-right text-sm font-semibold">
                        اسم الدور
                      </th>
                      <th scope="col" className="px-4 py-3 text-center text-sm font-semibold w-32">
                        الإجراءات
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-background">
                    {filteredRoles.map((role, index) => (
                      <tr key={role.id} className="hover:bg-muted/50 transition-colors">
                        <td className="px-4 py-4 text-sm font-medium">{index + 1}</td>
                        <td className="px-4 py-4 text-sm">{role.name}</td>
                        <td className="px-4 py-4 text-sm">
                          <div className="flex gap-2 justify-center">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
                              onClick={() => handleEditRole(role)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => setDeleteConfirm({ open: true, roleId: role.id })}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <RoleDialog open={isDialogOpen} onOpenChange={handleDialogClose} role={editingRole} onSave={handleRoleSaved} />

      <AlertDialog open={deleteConfirm.open} onOpenChange={(open) => setDeleteConfirm({ ...deleteConfirm, open })}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>هل أنت متأكد من الحذف؟</AlertDialogTitle>
            <AlertDialogDescription>
              هذا الإجراء لا يمكن التراجع عنه. سيتم حذف الدور نهائياً من النظام.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteRole}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
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
