"use client"

import DashboardLayout from "@/components/dashboard-layout"
import AdminUsersTable from "@/components/admin-users-table"
import { withPermission } from "@/components/with-permission";

 function AdminUsersPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">مديرين لوحة التحكم</h1>
          <p className="text-muted-foreground mt-1">إدارة مديرين لوحة التحكم</p>
        </div>

        <AdminUsersTable />
      </div>
    </DashboardLayout>
  )
}
export default withPermission(AdminUsersPage, { superAdminOnly: true });
