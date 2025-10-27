"use client"
import DashboardLayout from "@/components/dashboard-layout"
import OrdersTable from "@/components/orders-table"
import { withPermission } from "@/components/with-permission";
 function OrdersPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">إدارة الطلبات</h1>
          <p className="text-muted-foreground mt-1">متابعة وإدارة جميع الطلبات</p>
        </div>

        <OrdersTable />
      </div>
    </DashboardLayout>
  )
}
export default withPermission(OrdersPage, { permission: "Orders.View" });
