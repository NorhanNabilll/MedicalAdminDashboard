"use client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useEffect, useRef } from "react"
import { useSignalR } from '@/context/SignalRContext';
import { Button } from "@/components/ui/button"
import { Search, Download, ChevronLeft, ChevronRight, FileText, Loader2 } from "lucide-react"
import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getAllOrders, OrderStatusEnum, getStatusDisplay, type Order } from "@/lib/api/orders"
import { useToast } from "@/hooks/use-toast"
import { formatDateArabic, formatCurrencyEnglish } from "@/lib/utils"
import useSWR from "swr"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { OrderDetailsModal } from "@/components/order-details-modal"

const getStatusBadgeClassName = (status: OrderStatusEnum) => {
  switch (status) {
    case OrderStatusEnum.Pending:
      return "bg-blue-100 text-blue-700 hover:bg-blue-100"
    case OrderStatusEnum.Shipped:
      return "bg-amber-100 text-amber-700 hover:bg-amber-100"
    case OrderStatusEnum.Delivered:
      return "bg-green-100 text-green-700 hover:bg-green-100"
    case OrderStatusEnum.Cancelled:
      return "bg-red-100 text-red-700 hover:bg-red-100"
    default:
      return ""
  }
}

export default function OrdersTable({ defaultStatus = "all" }: { defaultStatus?: OrderStatusEnum | "all" }) {
  const { toast } = useToast()
  const { registerOrderCallback, isConnected } = useSignalR();
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<OrderStatusEnum | "all">(defaultStatus)
  const [currentPage, setCurrentPage] = useState(1)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [pageSize, setPageSize] = useState(10)

  // Debounce logic
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchQuery)
    }, 600)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const { data, error, isLoading, mutate } = useSWR(
    ["orders", currentPage, pageSize, statusFilter, debouncedSearchTerm],
    () =>
      getAllOrders({
        page: currentPage,
        pageSize: pageSize,
        status: statusFilter === "all" ? "all" : statusFilter,
        searchTerm: debouncedSearchTerm || undefined,
      }),
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000,
    },
  )

  useEffect(() => {
    registerOrderCallback(() => {
      console.log('Order created - refreshing table...');
      mutate();
    });
  }, [mutate, registerOrderCallback]);

  const handleSearch = (value: string) => {
    setSearchQuery(value)
    setCurrentPage(1) // Reset to first page on search
  }

  const handleStatusChange = (value: string) => {
    setStatusFilter(value === "all" ? "all" : (Number.parseInt(value) as OrderStatusEnum))
    setCurrentPage(1) // Reset to first page on filter change
  }

  const handleExport = async () => {
    setIsExporting(true)
    try {
      // Simulate export delay
      await new Promise((resolve) => setTimeout(resolve, 1000))

      toast({
        title: "تم التصدير بنجاح",
        description: "تم تصدير الطلبات إلى ملف Excel",
      })
    } catch (error: any) {
      toast({
        title: "فشل التصدير",
        description: error.message || "حدث خطأ أثناء تصدير الطلبات",
        variant: "destructive",
      })
    } finally {
      setIsExporting(false)
    }
  }

  const handleViewDetails = (order: Order) => {
    setSelectedOrder(order)
    setIsModalOpen(true)
  }

  const handleOrderUpdate = () => {
    mutate() // Refresh the orders list
  }

  const goToPage = (page: number) => {
    if (data?.data.pagination) {
      setCurrentPage(Math.max(1, Math.min(page, data.data.pagination.totalPages)))
    }
  }

  const getPageNumbers = () => {
    if (!data?.data.pagination) return []

    const totalPages = data.data.pagination.totalPages
    const pages: (number | string)[] = []

    if (totalPages <= 4) {
      // Show all pages if 4 or fewer
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // Show first 3 pages + ellipsis + last page
      pages.push(1)
      pages.push(2)
      pages.push(3)
      pages.push("...")
      pages.push(totalPages)
    }

    return pages
  }

  const goToPreviousPage = () => {
    if (data?.data.pagination.hasPrevious) {
      setCurrentPage(currentPage - 1)
    }
  }

  const goToNextPage = () => {
    if (data?.data.pagination.hasNext) {
      setCurrentPage(currentPage + 1)
    }
  }

  const orders = data?.data.items || []
  const pagination = data?.data.pagination

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>إدارة الطلبات</CardTitle>
              <CardDescription>عرض وإدارة جميع الطلبات</CardDescription>
            </div>
          </div>

          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row gap-3 mt-4">
            <div className="relative flex-1 w-full">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                placeholder="ابحث برقم الطلب أو اسم المريض..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="pr-10 text-right"
              />
            </div>
            <Select value={statusFilter.toString()} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="حالة الطلب" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الحالات</SelectItem>
                <SelectItem value={OrderStatusEnum.Pending.toString()}>تم الطلب</SelectItem>
                <SelectItem value={OrderStatusEnum.Shipped.toString()}>تم الشحن</SelectItem>
                <SelectItem value={OrderStatusEnum.Delivered.toString()}>تم الاستلام</SelectItem>
                <SelectItem value={OrderStatusEnum.Cancelled.toString()}>تم الإلغاء</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={pageSize.toString()}
              onValueChange={(value) => {
                setPageSize(Number(value))
                setCurrentPage(1)
              }}
            >
              <SelectTrigger className="w-full sm:w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 صفوف</SelectItem>
                <SelectItem value="50">50 صف</SelectItem>
                <SelectItem value="100">100 صف</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={handleExport}
              disabled={isExporting}
              className="w-full sm:w-auto bg-transparent"
            >
              <Download className="ml-2 h-4 w-4" />
              {isExporting ? "جاري التصدير..." : "تصدير"}
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="mr-3 text-muted-foreground">جاري تحميل الطلبات...</span>
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>حدث خطأ أثناء تحميل الطلبات. يرجى المحاولة مرة أخرى.</AlertDescription>
            </Alert>
          )}

          {!isLoading && !error && (
            <>
              {/* Mobile Card View */}
              <div className="md:hidden space-y-4">
                {orders.map((order, index) => {
                  const displayIndex = (currentPage - 1) * pageSize + index + 1
                  return (
                    <Card key={order.id} className="overflow-hidden">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                                {displayIndex}
                              </span>
                              <h3 className="font-semibold text-base">{order.orderNumber}</h3>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">{order.customerName}</p>
                            <Badge className={getStatusBadgeClassName(order.status)}>
                              {getStatusDisplay(order.status)}
                            </Badge>
                          </div>
                        </div>

                        <div className="space-y-2 text-sm mb-3">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">التاريخ:</span>
                            <span>{formatDateArabic(order.orderDate)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">العنوان:</span>
                            <span className="text-left">{order.shippingInfo.address}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">سعر التوصيل:</span>
                            <span>{formatCurrencyEnglish(order.summary.shippingFee)} د.ع</span>
                          </div>
                          <div className="flex justify-between font-semibold">
                            <span>المبلغ الإجمالي:</span>
                            <span>{formatCurrencyEnglish(order.summary.total)} د.ع</span>
                          </div>
                        </div>

                        <Button variant="default" size="sm" className="w-full" onClick={() => handleViewDetails(order)}>
                          <FileText className="ml-2 h-3.5 w-3.5" />
                          التفاصيل
                        </Button>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto rounded-md border">
                <table className="min-w-full divide-y divide-border">
                  <thead className="bg-muted/50">
                    <tr>
                      <th scope="col" className="px-4 py-3 text-right text-sm font-semibold w-[60px]">
                        #
                      </th>
                      <th scope="col" className="px-4 py-3 text-right text-sm font-semibold">
                        رقم الطلب
                      </th>
                      <th scope="col" className="px-4 py-3 text-right text-sm font-semibold">
                        اسم المريض
                      </th>
                      <th scope="col" className="px-4 py-3 text-right text-sm font-semibold">
                        تاريخ الطلب
                      </th>
                      <th scope="col" className="px-4 py-3 text-right text-sm font-semibold">
                        حالة الطلب
                      </th>
                      <th scope="col" className="px-4 py-3 text-right text-sm font-semibold">
                        العنوان
                      </th>
                      <th scope="col" className="px-4 py-3 text-right text-sm font-semibold">
                        سعر التوصيل
                      </th>
                      <th scope="col" className="px-4 py-3 text-right text-sm font-semibold">
                        المبلغ الإجمالي
                      </th>
                      <th scope="col" className="px-4 py-3 text-right text-sm font-semibold"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-background">
                    {orders.map((order, index) => {
                      const displayIndex = (currentPage - 1) * pageSize + index + 1
                      return (
                        <tr key={order.id} className="hover:bg-muted/50 transition-colors">
                          <td className="px-4 py-4 text-sm font-medium">{displayIndex}</td>
                          <td className="px-4 py-4 text-sm font-medium">{order.orderNumber}</td>
                          <td className="px-4 py-4 text-sm">{order.customerName}</td>
                          <td className="px-4 py-4 text-sm text-muted-foreground">
                            {formatDateArabic(order.orderDate)}
                          </td>
                          <td className="px-4 py-4 text-sm">
                            <Badge className={getStatusBadgeClassName(order.status)}>
                              {getStatusDisplay(order.status)}
                            </Badge>
                          </td>
                          <td className="px-4 py-4 text-sm text-muted-foreground max-w-[200px] truncate">
                            {order.shippingInfo.address}
                          </td>
                          <td className="px-4 py-4 text-sm text-muted-foreground">
                            {formatCurrencyEnglish(order.summary.shippingFee)} د.ع
                          </td>
                          <td className="px-4 py-4 text-sm font-semibold">
                            {formatCurrencyEnglish(order.summary.total)} د.ع
                          </td>
                          <td className="px-4 py-4 text-sm">
                            <Button variant="default" size="sm" onClick={() => handleViewDetails(order)}>
                              التفاصيل
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination && pagination.totalCount > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-4 border-t">
                  <div className="text-sm text-muted-foreground px-4">
                    صفحة {currentPage} من {pagination.totalPages} ({pagination.totalCount} طلب)
                  </div>

                  <div className="flex items-center gap-1 px-2.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={goToPreviousPage}
                      disabled={!pagination.hasPrevious}
                      className="gap-1"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>

                    <div className="flex items-center gap-1">
                      {getPageNumbers().map((page, index) =>
                        page === "..." ? (
                          <span key={`ellipsis-${index}`} className="px-2 text-muted-foreground">
                            ...
                          </span>
                        ) : (
                          <Button
                            key={page}
                            variant={pagination.currentPage === page ? "default" : "outline"}
                            size="sm"
                            onClick={() => goToPage(page as number)}
                            className="h-8 w-8 p-0"
                          >
                            {page}
                          </Button>
                        ),
                      )}
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={goToNextPage}
                      disabled={!pagination.hasNext}
                      className="gap-1"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {!isLoading && orders.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <p className="text-lg font-medium mb-1">لا توجد طلبات</p>
                  <p className="text-sm">جرب تغيير معايير البحث أو الفلترة</p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* OrderDetailsModal */}
      <OrderDetailsModal
        order={selectedOrder}
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        onUpdate={handleOrderUpdate}
      />
    </>
  )
}
