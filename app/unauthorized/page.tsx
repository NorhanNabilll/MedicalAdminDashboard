"use client"

import { Button } from "@/components/ui/button"
import { ShieldX } from "lucide-react"
import { useRouter } from "next/navigation"

export default function UnauthorizedPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <ShieldX className="h-16 w-16 text-destructive mx-auto" />
        <h1 className="text-2xl font-bold">غير مصرح لك بالوصول</h1>
        <p className="text-muted-foreground">
          ليس لديك الصلاحيات المطلوبة للوصول إلى هذه الصفحه
        </p>
        <Button onClick={() => router.push("/login")}>
          العودة لتسجيل الدخول
        </Button>
      </div>
    </div>
  )
}
