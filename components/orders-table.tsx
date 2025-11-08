"use client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useEffect, useRef, useState, useMemo } from "react"
import { useSignalR } from '@/context/SignalRContext'
import { Button } from "@/components/ui/button"
import { Search, Download, ChevronLeft, ChevronRight, FileText, Loader2, X, CalendarIcon } from "lucide-react" 
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getAllOrders, OrderStatusEnum, getStatusDisplay, type Order, exportOrders, type ExportOrdersBody } from "@/lib/api/orders"
import { useToast } from "@/hooks/use-toast"
import { formatDateArabic, cn } from "@/lib/utils"
import useSWR from "swr"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { OrderDetailsModal } from "@/components/order-details-modal"

import { Checkbox } from "@/components/ui/checkbox"
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogClose 
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { format } from "date-fns"
import { arEG } from "date-fns/locale"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"

// (دالة getStatusBadgeClassName زي ما هي)
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
};

export default function OrdersTable({ defaultStatus = "all" }: { defaultStatus?: OrderStatusEnum | "all" }) {
  const { toast } = useToast()
  const { registerOrderCallback } = useSignalR();
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<OrderStatusEnum | "all">(defaultStatus)
  const [currentPage, setCurrentPage] = useState(1)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [pageSize, setPageSize] = useState(10)

  const [selectedOrderIds, setSelectedOrderIds] = useState<number[]>([])
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false)
  const [exportFormat, setExportFormat] = useState<"1" | "2">("1") // 1 = Excel, 2 = PDF
  const [exportTab, setExportTab] = useState<"filtered" | "selected">("filtered")
  const [startDate, setStartDate] = useState<Date | undefined>(undefined)
  const [endDate, setEndDate] = useState<Date | undefined>(undefined)

  const { data, error, isLoading, mutate } = useSWR(
    ["orders", currentPage, pageSize, statusFilter, debouncedSearchTerm, startDate, endDate],
    () =>
      getAllOrders({
        page: currentPage,
        pageSize: pageSize,
        status: statusFilter === "all" ? "all" : statusFilter,
        searchTerm: debouncedSearchTerm || undefined,
        startDate: startDate ? format(startDate, "yyyy-MM-dd") : undefined,
        endDate: endDate ? format(endDate, "yyyy-MM-dd") : undefined,
      }),
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000,
    },
  )
  
  const orders = data?.data.items || []
  const pagination = data?.data.pagination
  
  const currentOrderIdsOnPage = useMemo(() => orders.map((order) => order.id), [orders]);
  
  const isAllOnPageSelected = useMemo(() => 
      orders.length > 0 && currentOrderIdsOnPage.every(id => selectedOrderIds.includes(id)),
      [currentOrderIdsOnPage, selectedOrderIds, orders.length]
  );
  
  const handleSelectAllOnPage = (checked: boolean) => {
    if (checked) {
      setSelectedOrderIds((prev) => [...new Set([...prev, ...currentOrderIdsOnPage])]);
    } else {
      setSelectedOrderIds((prev) => prev.filter(id => !currentOrderIdsOnPage.includes(id)));
    }
  };
  
  const handleSelectRow = (orderId: number, checked: boolean) => {
    setSelectedOrderIds((prev) =>
      checked ? [...prev, orderId] : prev.filter((id) => id !== orderId)
    )
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchQuery)
    }, 600)
    return () => clearTimeout(timer)
  }, [searchQuery])

 /* useEffect(() => {
    registerOrderCallback(() => {
      //console.log('Order created - refreshing table...');
      mutate();
    });
  }, [mutate, registerOrderCallback]);*/
  useEffect(() => {
  const handleOrdersUpdated = (e: Event) => {
    //console.log('📦 ordersUpdated event received - refreshing orders table...');
    mutate(); // يعيد تحميل الطلبات من الـ API
  };

  window.addEventListener('ordersUpdated', handleOrdersUpdated as EventListener);

  return () => {
    window.removeEventListener('ordersUpdated', handleOrdersUpdated as EventListener);
  };
}, [mutate]);

  
  useEffect(() => {
    setSelectedOrderIds([])
    setExportTab("filtered")
  }, [statusFilter, debouncedSearchTerm, pageSize, startDate, endDate])

  const handleSearch = (value: string) => {
    setSearchQuery(value)
    setCurrentPage(1) 
  }

  const handleStatusChange = (value: string) => {
    setStatusFilter(value === "all" ? "all" : (Number.parseInt(value) as OrderStatusEnum))
    setCurrentPage(1) 
  }
  
  const handleStartDateChange = (date: Date | undefined) => {
    setStartDate(date)
    setCurrentPage(1)
  }
  const handleEndDateChange = (date: Date | undefined) => {
    setEndDate(date)
    setCurrentPage(1)
  }

  const handleConfirmExport = async () => {
    setIsExporting(true)
    
    let currentExportTab = exportTab
    if (selectedOrderIds.length === 0) {
      currentExportTab = "filtered"
      setExportTab("filtered")
    }
    
    let body: ExportOrdersBody = {
      format: Number(exportFormat) as 2 | 1,
    }

    if (currentExportTab === "selected") {
      if (selectedOrderIds.length === 0) {
        toast({ title: "خطأ", description: "الرجاء اختيار طلب واحد على الأقل", variant: "destructive" })
        setIsExporting(false)
        return
      }
      body.orderIds = selectedOrderIds
    } else {
      if (debouncedSearchTerm) body.searchTerm = debouncedSearchTerm
      if (statusFilter !== "all") body.status = statusFilter
      if (startDate) body.startDate = format(startDate, "yyyy-MM-dd")
      if (endDate) body.endDate = format(endDate, "yyyy-MM-dd")
    }

    try {
      await exportOrders(body)
      toast({
        title: "تم التصدير بنجاح",
        description: `جاري تحميل ملف ${exportFormat === "1" ? "Excel" : "PDF"}...`,
      })
      setIsExportDialogOpen(false)
      setSelectedOrderIds([])
    } catch (error: any) {
      toast({
        title: "فشل التصدير",
        description: error.message || "حدث خطأ أثناء إنشاء الملف",
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
    mutate()
  }

  const goToPage = (page: number) => {
    if (pagination) {
      setCurrentPage(Math.max(1, Math.min(page, pagination.totalPages)))
    }
  }

const getPageNumbers = () => {
    if (!pagination) return []

    const totalPages = pagination.totalPages
    const pages: (number | string)[] = []
    const siblingCount = 1 // عدد الصفحات التي تظهر حول الصفحة الحالية

    // --- 1. هذا هو التعديل الذي طلبته ---
    // إذا كان عدد الصفحات 4 أو أقل، اعرضهم كلهم
    const totalPagesToShowSimple = 4
    if (totalPages <= totalPagesToShowSimple) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
      return pages
    }
    // --- نهاية التعديل ---


    // --- 2. "التغييرات اللازمة" (لوجيك ديناميكي) ---
    // اعرض الصفحة الأولى دائماً
    pages.push(1)

    // 3. احسب نطاق الصفحات (قبل وبعد الصفحة الحالية)
    // (نضمن أن النطاق لا يتجاوز 2 أو (إجمالي الصفحات - 1))
    const leftSiblingIndex = Math.max(currentPage - siblingCount, 2)
    const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages - 1)

    // 4. اعرض "..." جهة اليسار إذا لزم الأمر
    if (leftSiblingIndex > 2) {
      pages.push("...")
    }

    // 5. اعرض الأرقام التي في المنتصف
    for (let i = leftSiblingIndex; i <= rightSiblingIndex; i++) {
      pages.push(i)
    }

    // 6. اعرض "..." جهة اليمين إذا لزم الأمر
    if (rightSiblingIndex < totalPages - 1) {
      pages.push("...")
    }

    // 7. اعرض الصفحة الأخيرة دائماً
    pages.push(totalPages)

    return pages
  }

  const goToPreviousPage = () => {
    if (pagination?.hasPrevious) {
      setCurrentPage(currentPage - 1)
    }
  }

  const goToNextPage = () => {
    if (pagination?.hasNext) {
      setCurrentPage(currentPage + 1)
    }
  }

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

          {/* --- ✅ تعديل: Toolbar محسن للـ Responsive --- */}
          <div className="flex flex-col gap-3 mt-4">
            
            {/* الصف الأول: البحث والتصدير */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1 w-full">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  ref={searchInputRef}
                  placeholder="ابحث برقم الطلب أو اسم المريض..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pr-10 text-right"
                />
              </div>
              <Button
                variant="outline"
                onClick={() => setIsExportDialogOpen(true)}
                disabled={isExporting}
                className="w-full sm:w-auto bg-transparent flex-shrink-0"
              >
                <Download className="ml-2 h-4 w-4" />
                تصدير
              </Button>
            </div>
            
            {/* الصف الثاني: فلاتر التاريخ والحالة وعدد الصفوف */}
            {/* استخدمنا "flex-wrap" للسماح للعناصر بالنزول لسطر جديد في الشاشات المتوسطة
              و "min-w-[200px]" لحقول التاريخ لضمان عدم انضغاطها بشكل سيء
            */}
            <div className="flex flex-col sm:flex-row gap-3 sm:flex-wrap">
              
              {/* Start Date Picker - تعديل: الزر والـ Popover أصبحوا داخل div واحد */}
              <div className="flex-1 w-full sm:min-w-[200px] flex items-center gap-1">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "flex-1 justify-start text-right font-normal bg-transparent", // <-- تعديل: "flex-1" بدل "w-full"
                        !startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="ml-2 h-4 w-4" />
                      {startDate ? format(startDate, "dd/MM/yyyy") : <span>تاريخ البدء</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={handleStartDateChange}
                      initialFocus
                      locale={arEG}
                    />
                  </PopoverContent>
                </Popover>
                {/* زر المسح (X) - أصبح flex-shrink-0 ليحافظ على حجمه */}
                {startDate && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-9 w-9 flex-shrink-0" // <-- تعديل: حجم موحد
                    onClick={() => handleStartDateChange(undefined)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              
              {/* End Date Picker - نفس تعديل زر البدء */}
              <div className="flex-1 w-full sm:min-w-[200px] flex items-center gap-1">
                 <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "flex-1 justify-start text-right font-normal bg-transparent", // <-- تعديل: "flex-1" بدل "w-full"
                        !endDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="ml-2 h-4 w-4" />
                      {endDate ? format(endDate, "dd/MM/yyyy") : <span>تاريخ الانتهاء</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={handleEndDateChange}
                      initialFocus
                      locale={arEG}
                    />
                  </PopoverContent>
                </Popover>
                {/* زر المسح */}
                {endDate && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-9 w-9 flex-shrink-0" // <-- تعديل: حجم موحد
                    onClick={() => handleEndDateChange(undefined)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              
              {/* Status Filter */}
              <Select value={statusFilter.toString()} onValueChange={handleStatusChange}>
                <SelectTrigger className="w-full sm:w-[180px] flex-shrink-0">
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
              
              {/* Page Size Selector */}
              <Select
                value={pageSize.toString()}
                onValueChange={(value) => {
                  setPageSize(Number(value))
                  setCurrentPage(1)
                }}
              >
                <SelectTrigger className="w-full sm:w-[120px] flex-shrink-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 صفوف</SelectItem>
                  <SelectItem value="50">50 صف</SelectItem>
                  <SelectItem value="100">100 صف</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {/* ------------------------------------------- */}
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
                      <CardContent className="p-4 relative">
                        {/* Checkbox للموبايل */}
                        <div className="absolute top-3 left-3 z-10">
                          <Checkbox
                            checked={selectedOrderIds.includes(order.id)}
                            onCheckedChange={(checked) => handleSelectRow(order.id, checked as boolean)}
                            className="h-5 w-5"
                            aria-labelledby={`order-mobile-${order.id}`}
                          />
                        </div>
                        
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                                {displayIndex}
                              </span>
                              <h3 id={`order-mobile-${order.id}`} className="font-semibold text-base">{order.orderNumber}</h3>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">{order.shippingInfo.fullName}</p>
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
                            <span>{(order.summary.shippingFee)} د.ع</span>
                          </div>
                          <div className="flex justify-between font-semibold">
                            <span>المبلغ الإجمالي:</span>
                            <span>{(order.summary.total)} د.ع</span>
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
                      {/* Checkbox للـ Header */}
                      <th scope="col" className="px-4 py-3">
                        <Checkbox
                          checked={isAllOnPageSelected}
                          onCheckedChange={(checked) => handleSelectAllOnPage(checked as boolean)}
                          aria-label="Select all rows on this page"
                        />
                      </th>
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
                          {/* Checkbox للـ Row */}
                          <td className="px-4 py-4">
                            <Checkbox
                              checked={selectedOrderIds.includes(order.id)}
                              onCheckedChange={(checked) => handleSelectRow(order.id, checked as boolean)}
                              aria-labelledby={`order-${order.id}`}
                            />
                          </td>
                          <td className="px-4 py-4 text-sm font-medium">{displayIndex}</td>
                          <td id={`order-${order.id}`} className="px-4 py-4 text-sm font-medium">{order.orderNumber}</td>
                          <td className="px-4 py-4 text-sm">{order.shippingInfo.fullName}</td>
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
                            {(order.summary.shippingFee)} د.ع
                          </td>
                          <td className="px-4 py-4 text-sm font-semibold">
                            {(order.summary.total)} د.ع
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

      {/* --- Dialog التصدير الجديد (معدل) --- */}
      <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
        <DialogContent className="sm:max-w-[425px]" dir="rtl">
          <DialogHeader>
            <DialogTitle>تصدير الطلبات</DialogTitle>
            <DialogDescription>
              اختر نوع وطريقة التصدير التي تفضلها.
            </DialogDescription>
            <DialogClose className="absolute left-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
              <X className="h-4 w-4" />
            </DialogClose>
          </DialogHeader>
          <div className="py-4 space-y-6">
            <Tabs 
              value={(selectedOrderIds.length > 0) ? exportTab : "filtered"} // <-- يجبره على "filtered" لو مفيش تحديد
              onValueChange={(v) => setExportTab(v as any)} 
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="filtered">تصدير الفلترة الحالية</TabsTrigger>
                <TabsTrigger value="selected" disabled={selectedOrderIds.length === 0}>
                  تصدير المحدد ({(selectedOrderIds.length)})
                </TabsTrigger>
              </TabsList>
            </Tabs>


            <div className="space-y-3">
              <Label>نوع الملف</Label>
              <RadioGroup
                defaultValue="1"
                value={exportFormat}
                onValueChange={(v) => setExportFormat(v as "1" | "2")}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2 space-x-reverse">
                  <RadioGroupItem value="1" id="excel" />
                  <Label htmlFor="excel" className="font-normal">Excel (xlsx)</Label>
                </div>
                <div className="flex items-center space-x-2 space-x-reverse">
                  <RadioGroupItem value="2" id="pdf" />
                  <Label htmlFor="pdf" className="font-normal">PDF</Label>
                </div>
              </RadioGroup>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsExportDialogOpen(false)} disabled={isExporting}>إلغاء</Button>
            <Button onClick={handleConfirmExport} disabled={isExporting}>
              {isExporting ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Download className="ml-2 h-4 w-4" />}
              {isExporting ? "جاري التصدير..." : "تأكيد التصدير"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* ------------------------------------------- */}


      {/* OrderDetailsModal (زي ما هي) */}
      <OrderDetailsModal
        order={selectedOrder}
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        onUpdate={handleOrderUpdate}
      />
    </>
  )
}