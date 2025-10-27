"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { forgotPassword } from "@/lib/api/authApi"
import { Loader2 } from "lucide-react"

const schema = z.object({
  email: z.string().email({ message: "البريد الإلكتروني غير صالح." }),
})

export default function ForgotPasswordPage() {
  const { toast } = useToast()
  const [isSuccess, setIsSuccess] = useState(false)
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: { email: string }) => {
    try {
      await forgotPassword(data.email)
      setIsSuccess(true)
    } catch (error: any) {
      toast({
        title: "فشل الإرسال",
        description: error.message || "حدث خطأ أثناء إرسال طلب إعادة التعيين.",
        variant: "destructive",
      })
    }
  }

  return (
   <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-green-50 to-slate-100 p-4" dir="rtl">
      <div className="w-full max-w-md bg-card rounded-2xl shadow-lg p-8 space-y-6">
        {isSuccess ? (
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-bold text-card-foreground">تم إرسال الرابط بنجاح</h1>
            <p className="text-muted-foreground">
              لقد قمنا بإرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني. يرجى التحقق من صندوق الوارد الخاص بك.
            </p>
          </div>
        ) : (
          <>
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-bold text-card-foreground">نسيت كلمة المرور</h1>
              <p className="text-sm text-muted-foreground">أدخل بريدك الإلكتروني وسنرسل لك رابطًا لإعادة تعيين كلمة المرور.</p>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="email">البريد الإلكتروني</Label>
                <Input id="email" type="email" {...register("email")} placeholder="you@example.com" className="mt-2" />
                {errors.email && <p className="text-sm text-destructive mt-1">{errors.email.message}</p>}
              </div>
              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                إرسال رابط إعادة التعيين
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
