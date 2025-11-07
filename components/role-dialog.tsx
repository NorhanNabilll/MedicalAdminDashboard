"use client"

import { useState, useEffect } from "react"
import {
  createRoleWithName,
  assignPermissionsToRole,
  updateRoleWithPermissions,
  getRoleById,
  type PermissionGroup,
} from "@/lib/api/roles"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Spinner } from "@/components/ui/spinner"
import { useToast } from "@/hooks/use-toast"

interface RoleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  role: any | null
  onSave: () => void
}

const allActions = [
  { key: "view", label: "عرض" },
  { key: "create", label: "إضافة" },
  { key: "update", label: "تعديل" },
  { key: "delete", label: "حذف" },
]

export default function RoleDialog({ open, onOpenChange, role, onSave }: RoleDialogProps) {
  const { toast } = useToast()
  const [roleName, setRoleName] = useState("")
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<number[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isFetchingPermissions, setIsFetchingPermissions] = useState(false)

  const defaultPermissionGroups: PermissionGroup[] = [
    {
      moduleName: "المنتجات",
      permissions: [
        { id: 1, name: "عرض", moduleName: "المنتجات" },
        { id: 2, name: "إضافة", moduleName: "المنتجات" },
        { id: 3, name: "تعديل", moduleName: "المنتجات" },
        { id: 4, name: "حذف", moduleName: "المنتجات" },
      ],
    },
    {
      moduleName: "الأقسام",
      permissions: [
        { id: 5, name: "عرض", moduleName: "الأقسام" },
        { id: 6, name: "إضافة", moduleName: "الأقسام" },
        { id: 7, name: "تعديل", moduleName: "الأقسام" },
        { id: 8, name: "حذف", moduleName: "الأقسام" },
      ],
    },
    {
      moduleName: "المستخدمين",
      permissions: [
        { id: 9, name: "عرض", moduleName: "المستخدمين" },
        { id: 10, name: "إضافة", moduleName: "المستخدمين" },
        { id: 11, name: "تعديل", moduleName: "المستخدمين" },
        { id: 12, name: "حذف", moduleName: "المستخدمين" },
      ],
    },
    {
      moduleName: "الطلبات",
      permissions: [
        { id: 13, name: "عرض", moduleName: "الطلبات" },
        { id: 14, name: "تعديل", moduleName: "الطلبات" },
      ],
    },
    {
      moduleName: "الوصفات",
      permissions: [
        { id: 15, name: "عرض", moduleName: "الوصفات" },
        { id: 16, name: "تعديل", moduleName: "الوصفات" },
      ],
    },
  ]

  useEffect(() => {
    if (role && open) {
      setRoleName(role.name)
      setIsFetchingPermissions(true)

      getRoleById(role.id)
        .then((roleData) => {
          // Extract permission IDs from the fetched role
          const permissionIds = roleData.permissions.map((p) => p.id)
          setSelectedPermissionIds(permissionIds)
          //console.log("[] Loaded permissions for role:", permissionIds)
        })
        .catch((error) => {
          //console.error("[] Failed to fetch role permissions:", error.message)
          toast({
            title: "خطأ",
            description: "فشل في تحميل صلاحيات الدور.",
            variant: "destructive",
          })
        })
        .finally(() => {
          setIsFetchingPermissions(false)
        })
    } else if (!open) {
      setRoleName("")
      setSelectedPermissionIds([])
    }
  }, [role, open, toast])

  const handlePermissionChange = (permissionId: number, checked: boolean) => {
    setSelectedPermissionIds((prev) => (checked ? [...prev, permissionId] : prev.filter((id) => id !== permissionId)))
  }

  const handleSave = async () => {
    if (!roleName.trim()) {
      toast({
        title: "خطأ في الإدخال",
        description: "يرجى إدخال اسم الدور.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      if (role) {
        await updateRoleWithPermissions(role.id, roleName, selectedPermissionIds)
        toast({
          title: "تم التحديث بنجاح",
          description: `تم تحديث الدور "${roleName}" بنجاح.`,
        })
      } else {
        const roleResponse = await createRoleWithName(roleName)

        if (roleResponse.data?.id) {
          const roleId = roleResponse.data.id

          if (selectedPermissionIds.length > 0) {
            await assignPermissionsToRole(roleId, selectedPermissionIds)
          }

          toast({
            title: "تم الحفظ بنجاح",
            description: `تم إنشاء الدور "${roleName}" بنجاح.`,
          })
        } else {
          throw new Error(roleResponse.data?.error || "فشل في إنشاء الدور.")
        }
      }

      onSave()
      onOpenChange(false)
    } catch (error: any) {
      toast({
        title: "فشل الحفظ",
        description: error.message || "حدث خطأ أثناء حفظ الدور.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle>{role ? "تعديل الدور" : "إضافة دور جديد"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div>
            <Label htmlFor="roleName" className="mb-2 block">
              اسم الدور
            </Label>
            <Input
              id="roleName"
              value={roleName}
              onChange={(e) => setRoleName(e.target.value)}
              placeholder="أدخل اسم الدور"
              disabled={isLoading || isFetchingPermissions}
            />
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">تعيين الصلاحيات</h3>
            {isFetchingPermissions ? (
              <div className="flex justify-center items-center py-8">
                <Spinner />
              </div>
            ) : (
              <div className="border rounded-lg overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">الوحدة</TableHead>
                      {allActions.map((action) => (
                        <TableHead key={action.key} className="text-center w-[100px]">
                          {action.label}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {defaultPermissionGroups.map((group) => (
                      <TableRow key={group.moduleName}>
                        <TableCell className="font-medium">{group.moduleName}</TableCell>
                        {allActions.map((action) => {
                          const permission = group.permissions.find((p) => p.name === action.label)
                          return (
                            <TableCell key={`${group.moduleName}-${action.key}`} className="text-center">
                              {permission ? (
                                <Checkbox
                                  id={`permission-${permission.id}`}
                                  checked={selectedPermissionIds.includes(permission.id)}
                                  onCheckedChange={(checked) =>
                                    handlePermissionChange(permission.id, checked as boolean)
                                  }
                                />
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                          )
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading || isFetchingPermissions}>
            إلغاء
          </Button>
          <Button onClick={handleSave} disabled={isLoading || isFetchingPermissions}>
            {isLoading ? "جاري الحفظ..." : "حفظ"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
