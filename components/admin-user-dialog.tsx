"use client"

import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { createAdminUser, updateAdminUser, type AdminUser } from "@/lib/api/admin-users"
import type { Role } from "@/lib/api/roles"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"

interface AdminUserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: AdminUser | null
  roles: Role[]
  onSave: () => void
}

export default function AdminUserDialog({ open, onOpenChange, user, roles, onSave }: AdminUserDialogProps) {
  const { toast } = useToast()

  // ١. تعريف قواعد الفاليديشن باستخدام Zod
  const adminUserSchema = z
    .object({
      fullName: z.string().min(3, { message: "الاسم يجب أن يكون 3 أحرف على الأقل." }),
      email: z.string().email({ message: "البريد الإلكتروني غير صالح." }),
      // كلمة المرور اختيارية مبدئيًا
      password: z.string().optional(),
      roleId: z.string({ required_error: "يجب اختيار الدور." }),
    })
    .refine(
      (data) => {
        // هذا الشرط يتم تطبيقه على الكائن بأكمله
        // إذا كان `user` غير موجود (وضع الإضافة)، فيجب أن تكون كلمة المرور موجودة
        if (!user) {
          return data.password && data.password.length >= 8
        }
        return true // في وضع التعديل، لا نتحقق من كلمة المرور
      },
      {
        message: "كلمة المرور مطلوبة ويجب أن تكون 8 أحرف على الأقل.",
        path: ["password"], // ربط الخطأ بحقل كلمة المرور
      },
    )
    .refine(
      (data) => {
        if (data.password) {
          return /[A-Z]/.test(data.password) && /[0-9]/.test(data.password) && /[^a-zA-Z0-9]/.test(data.password)
        }
        return true
      },
      {
        message: "كلمة المرور يجب أن تحتوي على حرف كبير ورقم ورمز.",
        path: ["password"],
      },
    )

  type AdminUserFormData = z.infer<typeof adminUserSchema>
  // ٢. إعداد react-hook-form
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
    watch,
  } = useForm<AdminUserFormData>({
    resolver: zodResolver(adminUserSchema),
  })

  // مشاهدة قيمة roleId لتحديث Select
  const roleId = watch("roleId")

  useEffect(() => {
    if (open) {
      if (user) {
        reset({
          fullName: user.fullName,
          email: user.email || user.userName, // Use email if available, fallback to userName
          roleId: user.roles?.[0]?.id || "",
          password: "", // كلمة المرور لا تُعرض في وضع التعديل
        })
      } else {
        // وضع الإضافة: تفريغ النموذج
        reset({ fullName: "", email: "", password: "", roleId: undefined })
      }
    }
  }, [user, open, reset])

  // ٣. دالة الحفظ الجديدة
  const handleSave = async (data: AdminUserFormData) => {
    try {
      if (user) {
        // في وضع التعديل، لا نرسل كلمة المرور
        await updateAdminUser(user.id, { fullName: data.fullName, email: data.email, roleId: data.roleId })
        toast({ title: "تم التعديل بنجاح" })
      } else {
        // في وضع الإضافة، نرسل كل البيانات
        await createAdminUser(data as any) // `as any` لتجنب خطأ النوع لأن كلمة المرور موجودة
        toast({ title: "تمت الإضافة بنجاح" })
      }
      onSave()
      onOpenChange(false)
    } catch (error: any) {
      //console.error("Save user error:", error)
      toast({
        title: "فشل الحفظ",
        description: error.message || "حدث خطأ أثناء حفظ المسؤول.",
        variant: "destructive",
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl">
        <DialogHeader>
          <DialogTitle>{user ? "تعديل المسؤول" : "إضافة مسؤول جديد"}</DialogTitle>
        </DialogHeader>

        {/* ٤. تحديث الـ JSX لاستخدام react-hook-form */}
        <form onSubmit={handleSubmit(handleSave)} className="space-y-4">
          <div>
            <Label htmlFor="fullName">الاسم الكامل</Label>
            <Input id="fullName" {...register("fullName")} placeholder="أدخل الاسم الكامل" className="mt-2" />
            {errors.fullName && <p className="text-sm text-destructive mt-1">{errors.fullName.message}</p>}
          </div>

          <div>
            <Label htmlFor="email">البريد الإلكتروني</Label>
            <Input
              id="email"
              type="email"
              {...register("email")}
              placeholder="أدخل البريد الإلكتروني"
              className="mt-2"
            />
            {errors.email && <p className="text-sm text-destructive mt-1">{errors.email.message}</p>}
          </div>

          {!user && (
            <div>
              <Label htmlFor="password">كلمة المرور</Label>
              <Input
                id="password"
                type="password"
                {...register("password")}
                placeholder="أدخل كلمة المرور"
                className="mt-2"
              />
              {errors.password && <p className="text-sm text-destructive mt-1">{errors.password.message}</p>}
            </div>
          )}

          <div>
            <Label htmlFor="role">الدور</Label>
            <Select value={roleId} onValueChange={(value) => setValue("roleId", value, { shouldValidate: true })}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="اختر الدور" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem key={role.id} value={role.id}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.roleId && <p className="text-sm text-destructive mt-1">{errors.roleId.message}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              إلغاء
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
              {isSubmitting ? "جاري الحفظ..." : "حفظ"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
