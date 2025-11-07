"use client"

import { useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/context/AuthContext"
import { Loader2, Users, Package, TrendingUp, Activity, Shield, Pill, ShoppingCart } from "lucide-react"
import DashboardLayout from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import useSWR from "swr"
import { getStatistics } from "@/lib/api/statistics"
import { OrderStatusEnum } from "@/lib/api/orders"
import { useSignalR } from '@/context/SignalRContext' // استيراد SignalR
import dynamic from 'next/dynamic'
import { Skeleton } from "@/components/ui/skeleton"
const OrdersTable = dynamic(() => import('@/components/orders-table'), {
  loading: () => ( 
    <Card>
      <CardHeader><Skeleton className="h-6 w-32" /></CardHeader>
      <CardContent><Skeleton className="h-48 w-full" /></CardContent>
    </Card>
  ),
  ssr: false // <-- مهم لو الجدول يستخدم window أو localStorage بكثرة
});
export default function HomePage() {
  const router = useRouter()
  const { admin, isLoading, getDefaultRoute } = useAuth()
  const { registerOrderCallback } = useSignalR() // استدعاء دالة تسجيل المستمع

  // SWR لجلب الإحصائيات + الحصول على دالة mutate
  const {
    data: statsData,
    isLoading: isLoadingStats,
    error: statsError,
    mutate: mutateStatistics, // دالة لتحديث هذه البيانات
  } = useSWR("/v1/Admins/statistics", getStatistics, {
    revalidateOnFocus: false,
  })

  /*// ✅ الخطوة 1: تسجيل "مستمع" لتحديث الإحصائيات
  useEffect(() => {
    // تسجيل دالة "callback" ليتم استدعاؤها عند وصول إشعار
    registerOrderCallback(() => {
      //console.log('New order detected - refreshing statistics...');
      // عند وصول إشعار، قم بإعادة جلب بيانات الإحصائيات
      mutateStatistics();
    });
  }, [mutateStatistics, registerOrderCallback]); // الاعتماديات لضمان عدم تكرار التسجيل*/
  // ✅ الخطوة 1 (الحل B): استماع عام لتحديث الإحصائيات عند أي إشعار SignalR
useEffect(() => {
  const handleOrdersUpdated = (e: Event) => {
    //console.log('📢 ordersUpdated event received - refreshing statistics...');
    mutateStatistics(); // يعيد جلب الإحصائيات من الـ API
  };

  // التسجيل
  window.addEventListener('ordersUpdated', handleOrdersUpdated as EventListener);

  // التنظيف عند إلغاء المكون
  return () => {
    window.removeEventListener('ordersUpdated', handleOrdersUpdated as EventListener);
  };
}, [mutateStatistics]);


  // إعادة توجيه المستخدمين غير SuperAdmin
  useEffect(() => {
    if (!isLoading && admin) {
      const defaultRoute = getDefaultRoute()
      if (defaultRoute !== "/") {
        router.replace(defaultRoute)
      }
    }
  }, [admin, isLoading, router, getDefaultRoute])

  // شاشة التحميل الرئيسية
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // شاشة احتياطية لغير السوبر أدمن أثناء التوجيه
  if (!admin?.roles?.includes("SuperAdmin")) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // ✅ الخطوة 2: تعديل مصفوفة الإحصائيات
  // قمنا بتعديل "value" ليقرأ من "statsData.data" بشكل صحيح
  const stats = [
    {
      title: "إجمالي المرضى",
      value: statsData?.totalUsers ?? "0",
      icon: Users,
      color: "text-sky-600 bg-sky-100",
      isLoading: isLoadingStats,
    },
    {
      title: "إجمالى المسؤولين",
      value: statsData?.totalAdmins ?? "0",
      icon: Shield,
      color: "text-amber-600 bg-amber-100",
      isLoading: isLoadingStats,
    },
    {
      title: "الأدوية المتوفرة",
      value: statsData?.totalProducts ?? "0",
      icon: Pill,
      color: "text-red-600 bg-red-100",
      isLoading: isLoadingStats,
    },
    {
      title: "إجمالى الطلبات",
      value: statsData?.totalOrders ?? "0",
      icon: ShoppingCart,
      color: "text-green-600 bg-green-100",
      isLoading: isLoadingStats,
    },
  ]

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 md:p-6">
        {/* Page Header */}
        <div className="space-y-2">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">مرحباً بك، {admin.fullName}</h1>
          <p className="text-muted-foreground">نظرة عامة على نشاط النظام الطبي</p>
        </div>

        {/* عرض خطأ إذا فشل جلب الإحصائيات */}
        {statsError && (
            <p className="text-destructive">فشل في تحميل الإحصائيات: {statsError.message}</p>
        )}

        {/* Stats Grid - Redesigned */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title} className="transition-all hover:shadow-lg hover:-translate-y-1">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {/* Themed Icon */}
                    <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${stat.color}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    {/* Text Content */}
                    <div className="flex flex-col">
                      <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                      {stat.isLoading ? (
                        <div className="mt-1">
                          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                      ) : (
                        <p className="text-2xl font-bold">{stat.value ?? 0}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Orders Table */}
        <OrdersTable defaultStatus={OrderStatusEnum.Pending} />
      </div>
    </DashboardLayout>
  )
}