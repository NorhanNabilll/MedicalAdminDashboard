"use client"

import DashboardLayout from "@/components/dashboard-layout"
import ProductsTable from "@/components/products-table"
import { withPermission } from "@/components/with-permission";
function ProductsPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">المنتجات</h1>
          <p className="text-muted-foreground mt-1">إدارة المنتجات والمخزون</p>
        </div>

        <ProductsTable />
      </div>
    </DashboardLayout>
  )
}
export default withPermission(ProductsPage, { permission: "Products.View" });
