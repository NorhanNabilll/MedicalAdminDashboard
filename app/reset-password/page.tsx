"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { resetPassword } from "@/lib/api/authApi"
import { Loader2 } from "lucide-react"
const schema = z.object({
  newPassword: z.string().min(8, { message: "كلمة المرور يجب أن تكون 8 أحرف على الأقل." }),
})

export default function ResetPasswordPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  
  const email = searchParams.get('email')
  const token = searchParams.get('token')

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: { newPassword: string }) => {
    if (!email || !token) {
      toast({ title: "خطأ", description: "رابط غير صالح.", variant: "destructive" })
      return
    }

    try {
      await resetPassword({ email, token, newPassword: data.newPassword })
      toast({
        title: "تم تغيير كلمة المرور بنجاح",
        description: "يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة.",
      })
      setTimeout(() => router.push('/login'), 2000)
    } catch (error: any) {
      toast({
        title: "فشل إعادة التعيين",
        description: error.message || "حدث خطأ.",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-green-50 to-slate-100 p-4" dir="rtl">
      <div className="w-full max-w-md bg-card rounded-2xl shadow-lg p-8 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-card-foreground">إعادة تعيين كلمة المرور</h1>
          <p className="text-sm text-muted-foreground">أدخل كلمة المرور الجديدة لحسابك.</p>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="newPassword">كلمة المرور الجديدة</Label>
            <Input id="newPassword" type="password" {...register("newPassword")} className="mt-2" />
            {errors.newPassword && <p className="text-sm text-destructive mt-1">{errors.newPassword.message}</p>}
          </div>
          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
            حفظ كلمة المرور الجديدة
          </Button>
        </form>
      </div>
    </div>
  )
}
