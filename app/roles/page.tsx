"use client"

import DashboardLayout from "@/components/dashboard-layout"
import RolesTable from "@/components/roles-table"
import { withPermission } from "@/components/with-permission";
 function RolesPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">الأدوار والصلاحيات</h1>
          <p className="text-muted-foreground mt-1">إدارة الأدوار والصلاحيات للمستخدمين</p>
        </div>

        <RolesTable />
      </div>
    </DashboardLayout>
  )
}
export default withPermission(RolesPage,  { superAdminOnly: true });
