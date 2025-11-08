"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Link from "next/link"
import { login } from "@/lib/api/authApi"
import { useToast } from "@/hooks/use-toast"
import ReCAPTCHA from "react-google-recaptcha"

export default function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null)
  const router = useRouter()
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    if (!recaptchaToken) {
      toast({
        title: "الرجاء التحقق",
        description: "يرجى تأكيد أنك لست روبوتًا.",
        variant: "destructive",
      })
      setIsLoading(false)
      return
    }

    try {
      // استدعي login مع تمرير توكن الـ reCAPTCHA إذا كان الـ API يدعمه
      await login(email, password, recaptchaToken)
      window.location.href = "/"

      // router.push("/")
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "فشل تسجيل الدخول. يرجى المحاولة مرة أخرى."
      // استدعاء رسالة التنبيه المنبثقة بدلاً من تحديث الحالة
      toast({
        title: "فشل تسجيل الدخول",
        description: errorMessage,
        variant: "destructive",
      })
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="bg-white/100 rounded-2xl shadow-xl shadow-slate-300/30 p-8 space-y-6 border border-white/50 backdrop-blur-lg">
        {/* Logo and Title */}
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center">
              <span className="text-primary-foreground text-2xl font-bold">ص</span>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-card-foreground">صيدليه السكري</h1>
          <p className="text-sm text-muted-foreground">الوصول الآمن إلى لوحة التحكم الخاصة بك</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email Field */}
          <div className="space-y-2">
            <label htmlFor="email" className="block text-sm font-medium text-card-foreground">
              البريد الإلكتروني
            </label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
              className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
            />
          </div>

          {/* Password Field */}
          <div className="space-y-2">
            <label htmlFor="password" className="block text-sm font-medium text-card-foreground">
              كلمة المرور
            </label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
              className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
            />
          </div>

          {/* Forgot Password Link */}
          <div className="flex justify-start">
            <a href="/forgot-password" className="text-sm text-primary hover:text-primary/80 font-medium">
              هل نسيت كلمة المرور؟
            </a>
          </div>

          {/* reCAPTCHA (محفوظة كما طلبتي) */}
          <div className="flex justify-center pt-2">
            <ReCAPTCHA
              sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || ""}
              onChange={(token) => setRecaptchaToken(token)}
              onExpired={() => setRecaptchaToken(null)}
            />
          </div>

          {/* Login Button */}
          <Button
            type="submit"
            disabled={isLoading || !email || !password || !recaptchaToken}
            className="w-full py-2 px-4 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg transition duration-200 disabled:opacity-50"
          >
            {isLoading ? "جاري تسجيل الدخول..." : "تسجيل الدخول"}
          </Button>
        </form>

        
      </div>
    </div>
  )
}
