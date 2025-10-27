"use client"

import { useEffect, ComponentType } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/context/AuthContext"
import { Loader2 } from "lucide-react"

interface WithPermissionProps {
  permission?: string
  superAdminOnly?: boolean
}

export function withPermission<P extends object>(
  Component: ComponentType<P>,
  options: WithPermissionProps = {}
) {
  return function ProtectedComponent(props: P) {
    const router = useRouter()
    const { admin, hasPermission, isLoading } = useAuth()
    const { permission, superAdminOnly } = options

    useEffect(() => {
      if (!isLoading) {
        // التحقق من SuperAdmin
        if (superAdminOnly && !admin?.roles?.includes("SuperAdmin")) {
          router.replace("/unauthorized")
          return
        }

        // التحقق من الصلاحية
        if (permission && !hasPermission(permission)) {
          router.replace("/unauthorized")
          return
        }
      }
    }, [admin, hasPermission, isLoading, router])

    // شاشة التحميل
    if (isLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )
    }

    // التحقق من الصلاحيات
    const hasAccess =
      (!superAdminOnly || admin?.roles?.includes("SuperAdmin")) &&
      (!permission || hasPermission(permission))

    if (!hasAccess) {
      return null // سيتم التوجيه
    }

    return <Component {...props} />
  }
}
