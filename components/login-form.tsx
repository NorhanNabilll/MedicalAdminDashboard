"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { login, verifyMfa } from "@/lib/api/authApi" // <-- 1. استدعاء verifyMfa الجديدة
import { useToast } from "@/hooks/use-toast"
import ReCAPTCHA from "react-google-recaptcha"
import { Loader2 } from "lucide-react" // <-- 2. استدعاء أيقونة التحميل
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp" // <-- 3. استدعاء كومبوننت إدخال الكود
import { Label } from "./ui/label"


export default function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null)
  const router = useRouter()
  const { toast } = useToast()

  // --- 4. إضافة States جديدة للخطوة الثانية ---
  const [step, setStep] = useState<'login' | 'verify'>('login') // لتتبع الخطوات
  const [tempToken, setTempToken] = useState<string | null>(null) // لحفظ التوكن المؤقت
  const [mfaEmail, setMfaEmail] = useState<string>("") // لعرض الإيميل لليوزر
  const [mfaCode, setMfaCode] = useState<string>("") // لحفظ الكود المدخل
  // ------------------------------------------

  // --- 5. تعديل دالة handleSubmit (بتاعة اللوجن) ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // 5أ. لو إحنا في خطوة الكود، نستخدم الدالة الجديدة
    if (step === 'verify') {
      await handleVerifySubmit()
      return
    }

    // (ده كود خطوة اللوجن العادية)
    setIsLoading(true)

   /* if (!recaptchaToken) {
      toast({
        title: "الرجاء التحقق",
        description: "يرجى تأكيد أنك لست روبوتًا.",
        variant: "destructive",
      })
      setIsLoading(false)
      return
    }*/

    try {
      // (5ب) استقبال الرد من دالة اللوجن المعدلة
      const response = await login(email, password, recaptchaToken== null ? "" : recaptchaToken);
      
      if (response.requiresMFA) {
        // --- 5ج. الانتقال لخطوة الـ MFA ---
        toast({
          title: "تم إرسال الكود",
          description: "تم إرسال كود التحقق إلى بريدك الإلكتروني.",
        })
        setTempToken(response.data.tempToken) // حفظ التوكن المؤقت
        setMfaEmail(response.data.email)      // حفظ الإيميل
        setStep('verify')                     // تغيير الفورم
      } else {
        // (حالة اللوجن العادي لو حصل - الكود القديم)
        window.location.href = "/"
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "فشل تسجيل الدخول. يرجى المحاولة مرة أخرى.";
      toast({
        title: "فشل تسجيل الدخول",
        description: errorMessage,
        variant: "destructive", 
      });
    } finally {
        setIsLoading(false)
    }
  }

  // --- 6. إضافة دالة جديدة للتحقق من الكود ---
  const handleVerifySubmit = async () => {
    if (!tempToken || mfaCode.length < 6) {
      toast({ title: "خطأ", description: "الكود يجب أن يكون 6 أرقام.", variant: "destructive" });
      return;
    }
    
    setIsLoading(true);

    try {
      // (6أ) استدعاء الدالة الجديدة
      await verifyMfa(tempToken, mfaCode);
      
      // (6ب) نجح التحقق!
      toast({
        title: "تم التحقق بنجاح",
        description: "جاري تسجيل دخولك...",
      });
      // تم حفظ التوكنز في دالة verifyMfa، الآن نوجه للداش بورد
      window.location.href = "/";

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "فشل التحقق. الكود غير صحيح أو انتهت صلاحيته.";
      toast({
        title: "فشل التحقق",
        description: errorMessage,
        variant: "destructive", 
      });
      setIsLoading(false);
    }
  }
  
  // --- 7. تعديل الـ JSX ---
  return (
    <div className="w-full max-w-md">
      <div className="bg-white/100 rounded-2xl shadow-xl shadow-slate-300/30 p-8 space-y-6 border border-white/50 backdrop-blur-lg">
        
        {/* --- 7أ. عرض مختلف بناءً على الخطوة --- */}
        
        {step === 'login' && (
          <>
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

              {/* reCAPTCHA */}
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
                disabled={isLoading || !email || !password }//|| !recaptchaToken}
                className="w-full py-2 px-4 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg transition duration-200 disabled:opacity-50"
              >
                {isLoading ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : "تسجيل الدخول"}
              </Button>
            </form>
          </>
        )}

        {/* --- 7ب. فورم إدخال الكود (الخطوة الثانية) --- */}
        {step === 'verify' && (
          <>
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-bold text-card-foreground">التحقق بخطوتين (MFA)</h1>
              <p className="text-sm text-muted-foreground" dir="rtl">
                تم إرسال كود تحقق مكون من 6 أرقام إلى بريدك الإلكتروني: <br />
                <span className="font-medium text-foreground">{mfaEmail}</span>
              </p>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2" dir="ltr">
                <Label htmlFor="otp-code" className="text-right block mb-2">أدخل الكود</Label>
                <InputOTP 
                  maxLength={6} 
                  value={mfaCode}
                  onChange={(value) => setMfaCode(value)}
                >
                  <InputOTPGroup className="w-full flex justify-center">
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <Button
                type="submit"
                disabled={isLoading || mfaCode.length < 6}
                className="w-full py-2 px-4 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg transition duration-200 disabled:opacity-50"
              >
                {isLoading ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : "تحقق وتسجيل الدخول"}
              </Button>
            </form>
          </>
        )}
        
      </div>
    </div>
  )
}