"use client"

import { AlertDialogFooter } from "@/components/ui/alert-dialog"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { LogOut, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { logout } from "@/lib/api/authApi"

interface Admin {
  fullName: string
  email: string
}

export default function ProfileMenu() {
  const [admin, setAdmin] = useState<Admin | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const router = useRouter()

  // ✅ دالة لتحميل البيانات
  const loadAdminData = () => {
    const adminData = localStorage.getItem("admin")
    if (adminData) {
      try {
        const parsedAdmin = JSON.parse(adminData)
        setAdmin(parsedAdmin)
      } catch (error) {
        //console.error("Failed to parse admin data:", error)
      }
    }
  }

  useEffect(() => {
    // Load admin data from localStorage
    loadAdminData()

    // ✅ الاستماع لـ custom event
    const handleStorageChange = () => {
      loadAdminData()
    }

    window.addEventListener('profileUpdated', handleStorageChange)

    return () => {
      window.removeEventListener('profileUpdated', handleStorageChange)
    }
  }, [])

  const handleLogout = async () => {
    setIsLoading(true)
    try {
      await logout()
      router.push("/login")
    } catch (error) {
      //console.error("Logout failed:", error)
      localStorage.removeItem("accessToken")
      localStorage.removeItem("refreshToken")
      localStorage.removeItem("admin")
      router.push("/login")
    } finally {
      setIsLoading(false)
    }
  }

  if (!admin) {
    return null
  }

  const initials = (admin.fullName || "")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  return (
    <>
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="flex flex-col items-end gap-0.5 sm:gap-1">
          <p className="text-xs sm:text-sm font-medium text-foreground line-clamp-1">{admin.fullName}</p>
          <p className="text-xs text-muted-foreground line-clamp-1">{admin.email}</p>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/profile")}
          className="h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 flex-shrink-0"
          title="تعديل الملف الشخصي"
        >
          <User className="h-4 w-4 sm:h-4 sm:w-4 md:h-5 md:w-5" />
        </Button>

        <Avatar className="h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 flex-shrink-0">
          <AvatarImage src="/abstract-profile.png" alt={admin.fullName} />
          <AvatarFallback className="bg-primary text-primary-foreground font-semibold text-xs sm:text-sm">
            {initials}
          </AvatarFallback>
        </Avatar>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowLogoutConfirm(true)}
          disabled={isLoading}
          className="h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 flex-shrink-0"
          title="تسجيل الخروج"
        >
          <LogOut className="h-4 w-4 sm:h-4 sm:w-4 md:h-5 md:w-5" />
        </Button>
      </div>

      <AlertDialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد تسجيل الخروج</AlertDialogTitle>
            <AlertDialogDescription>هل أنت متأكد من رغبتك في تسجيل الخروج؟</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3 justify-end">
            <AlertDialogFooter>
              <AlertDialogCancel>إلغاء</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleLogout}
                disabled={isLoading}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isLoading ? "جاري تسجيل الخروج..." : "تسجيل الخروج"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}