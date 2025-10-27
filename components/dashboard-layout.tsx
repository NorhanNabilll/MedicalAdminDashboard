"use client"

import type React from "react"
import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import {
  Home,
  Users,
  Package,
  ShoppingCart,
  Menu,
  X,
  FolderOpen,
  FileText,
  Settings,
  LogOut,
  Shield,
  UserCog,
  Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { logout } from "@/lib/api/authApi"
import { useAuth } from "@/context/AuthContext"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

const navItems = [
  { text: "الرئيسية", icon: Home, path: "/", superAdminOnly: true },
  { text: "إدارة المستخدمين", icon: Users, path: "/users", permission: "Users.View" },
  { text: "إدارة الاقسام", icon: FolderOpen, path: "/categories", permission: "Categories.View" },
  { text: "إدارة المنتجات", icon: Package, path: "/products", permission: "Products.View" },
  { text: "إدارة الطلبات", icon: ShoppingCart, path: "/orders", permission: "Orders.View" },
  { text: "إدارة الوصفات", icon: FileText, path: "/prescriptions", permission: "Prescriptions.View" },
  { text: "الأدوار والصلاحيات", icon: Shield, path: "/roles", superAdminOnly: true },
  { text: "المديرين", icon: UserCog, path: "/admin-users", superAdminOnly: true },
  { text: "الإعدادات", icon: Settings, path: "/settings", superAdminOnly: true },
]

// --- User Profile Sub-component ---
function UserProfile() {
  const [admin, setAdmin] = useState<{ fullName: string; email: string } | null>(null)
  const router = useRouter()

  useEffect(() => {
    const adminData = localStorage.getItem("admin")
    if (adminData) {
      try {
        setAdmin(JSON.parse(adminData))
      } catch (error) {
        console.error("Failed to parse admin data:", error)
      }
    }
  }, [])

  if (!admin) return null

  const initials = (admin.fullName || "")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  return (
    <Link
      href="/profile"
      className="flex items-center gap-3 px-4 h-16 hover:bg-sidebar-accent/50 transition-colors w-full cursor-pointer"
    >
      <Avatar className="h-10 w-10">
        <AvatarImage src="/abstract-profile.png" alt={admin.fullName} />
        <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground font-semibold">
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="flex flex-col items-end">
        <p className="text-sm font-medium text-sidebar-foreground">{admin.fullName}</p>
        <p className="text-xs text-muted-foreground">{admin.email}</p>
      </div>
    </Link>
  )
}

// --- Main Dashboard Layout ---
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { admin, hasPermission, isLoading } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const pathname = usePathname()
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const visibleNavItems = navItems.filter((item) => {
    if (item.superAdminOnly) {
      return admin?.roles?.includes("SuperAdmin")
    }
    if (item.permission) {
      return hasPermission(item.permission)
    }
    return true
  })

  return (
    <div className="min-h-screen bg-muted/30" dir="rtl">
      {/* Top Header */}
      <header className="fixed top-0 left-0 right-0 md:right-60 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-16 items-center justify-between px-4">
          <h1 className="text-xl font-semibold text-foreground md:hidden">لوحة التحكم</h1>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="فتح القائمة"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </header>

      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex fixed top-0 right-0 h-screen w-60 border-l bg-sidebar flex-col z-50">
        <div className="border-b">
          <UserProfile />
        </div>

        <nav className="flex-1 overflow-y-auto p-4">
          <ul className="space-y-2">
            {visibleNavItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.path
              return (
                <li key={item.path}>
                  <Link
                    href={item.path}
                    //prefetch={true}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                      isActive ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground"
                    )}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    <span>{item.text}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="border-t p-4">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            onClick={() => setShowLogoutConfirm(true)}
          >
            <LogOut className="h-5 w-5" />
            <span>تسجيل الخروج</span>
          </Button>
        </div>
      </aside>

      {/* Sidebar - Mobile */}
      {mobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="fixed top-0 right-0 z-50 h-screen w-64 border-l bg-sidebar shadow-lg md:hidden animate-in slide-in-from-right duration-300">
            <div className="flex h-full flex-col">
              <div className="border-b">
                <UserProfile />
              </div>

              <nav className="flex-1 overflow-y-auto p-4">
                <ul className="space-y-2">
                  {visibleNavItems.map((item) => {
                    const Icon = item.icon
                    const isActive = pathname === item.path
                    return (
                      <li key={item.path}>
                        <Link
                          href={item.path}
                         // prefetch={true}
                          onClick={() => setMobileMenuOpen(false)}
                          className={cn(
                            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                            "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                            isActive ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground"
                          )}
                        >
                          <Icon className="h-5 w-5 flex-shrink-0" />
                          <span>{item.text}</span>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </nav>

              <div className="border-t p-4">
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  onClick={() => {
                    setMobileMenuOpen(false)
                    setShowLogoutConfirm(true)
                  }}
                >
                  <LogOut className="h-5 w-5" />
                  <span>تسجيل الخروج</span>
                </Button>
              </div>
            </div>
          </aside>
        </>
      )}

      {/* Logout Confirmation Dialog */}
      <AlertDialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد تسجيل الخروج</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من رغبتك في تسجيل الخروج؟
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => logout()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              تسجيل الخروج
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Main Content */}
      <main className="pt-16 md:mr-60">
        <div className="p-4 md:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  )
}