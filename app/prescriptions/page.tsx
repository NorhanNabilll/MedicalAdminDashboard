"use client"
import { formatDateArabic } from "@/lib/utils"
import { useState, useEffect, useMemo, useCallback } from "react"
import { useAuth } from "@/context/AuthContext"
import DashboardLayout from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, ChevronLeft, ChevronRight, Loader2, FileText, X, ZoomIn } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { withPermission } from "@/components/with-permission"
import {
  fetchPrescriptions,
  updatePrescriptionStatus,
  mapStatusToArabic,
  mapArabicToStatus,
  type Prescription,
  type PaginationInfo,
} from "@/lib/api/prescriptions"
import { useToast } from "@/hooks/use-toast"
import { PrescriptionDetailsModal } from "@/components/prescription-details-modal"
import { Dialog, DialogContent } from "@/components/ui/dialog"

type PrescriptionStatus = "تم الطلب" | "تم الالغاء" | "تم الموافقه" | "تم الرفض"

const statusColors: Record<PrescriptionStatus, string> = {
  "تم الطلب": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  "تم الالغاء": "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  "تم الموافقه": "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  "تم الرفض": "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
}

// Image Zoom Modal Component
function ImageZoomModal({ imageUrl, open, onOpenChange }: { imageUrl: string | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  if (!imageUrl) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 overflow-hidden">
        <div className="relative w-full h-full flex items-center justify-center bg-white/95">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 left-4 z-10 bg-black/50 hover:bg-black/70 text-white"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-5 w-5" />
          </Button>
          <div className="w-full h-full flex items-center justify-center p-4 overflow-auto">
            <img
              src={imageUrl}
              alt="Prescription"
              className="max-w-full max-h-[90vh] object-contain"
              style={{ imageRendering: 'high-quality' }}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function PrescriptionsPage() {
  const { hasPermission } = useAuth()
  const canUpdate = useMemo(() => hasPermission("Prescriptions.Update"), [hasPermission])

  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState("")
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<number>(-1)
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
  const [pageSize, setPageSize] = useState(10)
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    pageSize: 10,
    totalCount: 0,
    totalPages: 1,
    hasPrevious: false,
    hasNext: false,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [zoomedImage, setZoomedImage] = useState<string | null>(null)
  const [isZoomModalOpen, setIsZoomModalOpen] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 500)

    return () => clearTimeout(timer)
  }, [searchTerm])

  const loadPrescriptions = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const data = await fetchPrescriptions({
        page: pagination.currentPage,
        pageSize: pageSize,
        status: statusFilter === -1 ? undefined : statusFilter,
        searchTerm: debouncedSearchTerm || undefined,
      })

      setPrescriptions(data.items)
      setPagination(data.pagination)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "حدث خطأ في تحميل البيانات"
      setError(errorMessage)
      toast({
        title: "خطأ",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [pagination.currentPage, pageSize, statusFilter, debouncedSearchTerm, toast])

  useEffect(() => {
    loadPrescriptions()
  }, [loadPrescriptions])

  const handleStatusChange = async (id: number, newArabicStatus: PrescriptionStatus) => {
    const newStatus = mapArabicToStatus(newArabicStatus)

    try {
      await updatePrescriptionStatus(id, newStatus)

      setPrescriptions((prev) =>
        prev.map((prescription) => (prescription.id === id ? { ...prescription, status: newStatus } : prescription)),
      )

      toast({
        title: "تم التحديث",
        description: "تم تحديث حالة الوصفة بنجاح",
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "فشل في تحديث حالة الوصفة"
      toast({
        title: "خطأ",
        description: errorMessage,
        variant: "destructive",
      })
    }
  }

  const handlePageChange = (newPage: number) => {
    setPagination((prev) => ({ ...prev, currentPage: newPage }))
  }

  const handleViewDetails = (prescription: Prescription) => {
    setSelectedPrescription(prescription)
    setIsModalOpen(true)
  }

  const handlePrescriptionUpdate = () => {
    loadPrescriptions()
  }

  const handleImageZoom = (imageUrl: string) => {
    setZoomedImage(imageUrl)
    setIsZoomModalOpen(true)
  }

  const getPageNumbers = () => {
    const totalPages = pagination.totalPages
    const currentPage = pagination.currentPage
    const pages: (number | string)[] = []
    const siblingCount = 1

    const totalPagesToShowSimple = 4
    if (totalPages <= totalPagesToShowSimple) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
      return pages
    }

    pages.push(1)

    const leftSiblingIndex = Math.max(currentPage - siblingCount, 2)
    const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages - 1)

    if (leftSiblingIndex > 2) {
      pages.push("...")
    }

    for (let i = leftSiblingIndex; i <= rightSiblingIndex; i++) {
      pages.push(i)
    }

    if (rightSiblingIndex < totalPages - 1) {
      pages.push("...")
    }

    pages.push(totalPages)

    return pages
  }

  return (
    <DashboardLayout>
      <div className="space-y-4 md:space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">إدارة الوصفات</h1>
          <p className="text-muted-foreground mt-1 md:mt-2">عرض وإدارة الوصفات الطبية</p>
        </div>

        {/* Prescriptions Table */}
        <Card>
          <CardHeader className="space-y-4">
            <div>
              <CardTitle className="text-lg md:text-xl">قائمة الوصفات</CardTitle>
              <CardDescription className="text-sm">جميع الوصفات الطبية المسجلة في النظام</CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 md:gap-4 items-end">
              <div className="relative flex-1 w-full">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="البحث برقم الوصفة او معلومات المريض..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10 text-sm md:text-base"
                />
              </div>
              <Select
                value={statusFilter.toString()}
                onValueChange={(value) => {
                  setStatusFilter(Number.parseInt(value))
                  setPagination((prev) => ({ ...prev, currentPage: 1 }))
                }}
              >
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="تصفية حسب الحالة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="-1">الكل</SelectItem>
                  <SelectItem value="0">تم الطلب</SelectItem>
                  <SelectItem value="1">تم الموافقه</SelectItem>
                  <SelectItem value="2">تم الرفض</SelectItem>
                  <SelectItem value="3">تم الالغاء</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={pageSize.toString()}
                onValueChange={(value) => {
                  setPageSize(Number(value))
                  setPagination((prev) => ({ ...prev, currentPage: 1 }))
                }}
              >
                <SelectTrigger className="w-full sm:w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 صفوف</SelectItem>
                  <SelectItem value="20">20 صف</SelectItem>
                  <SelectItem value="50">50 صف</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <p className="text-destructive mb-4">{error}</p>
                <Button onClick={loadPrescriptions} variant="outline">
                  إعادة المحاولة
                </Button>
              </div>
            ) : (
              <>
                {/* Mobile Card View */}
                <div className="md:hidden space-y-4">
                  {prescriptions.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8 text-sm">لا توجد نتائج للبحث</div>
                  ) : (
                    prescriptions.map((prescription, index) => {
                      const arabicStatus = mapStatusToArabic(prescription.status) as PrescriptionStatus
                      const displayIndex = (pagination.currentPage - 1) * pageSize + index + 1

                      return (
                        <Card key={prescription.id} className="overflow-hidden">
                          <CardContent className="p-4">
                            <div className="mb-3">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="flex items-center justify-center h-7 w-7 rounded-full bg-primary/10 text-primary text-sm font-semibold">
                                  {displayIndex}
                                </span>
                                <div>
                                  <h3 className="font-semibold text-base">{prescription.prescriptionNumber}</h3>
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    {formatDateArabic(prescription.createdAt)}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className={`${statusColors[arabicStatus]} text-xs`}>
                                  {arabicStatus}
                                </Badge>
                              </div>
                            </div>

                            <div className="space-y-2 text-sm mb-3">
                              <div className="flex items-start">
                                <span className="text-muted-foreground min-w-[90px]">اسم المريض:</span>
                                <span className="font-medium">{prescription.customerName}</span>
                              </div>
                              <div className="flex items-start">
                                <span className="text-muted-foreground min-w-[90px]">رقم الهاتف:</span>
                                <span className="font-medium font-mono text-xs">{prescription.customerPhone}</span>
                              </div>
                              <div className="flex items-start">
                                <span className="text-muted-foreground min-w-[90px]">كود المريض:</span>
                                <span className="font-medium font-mono text-xs">{prescription.customerCode}</span>
                              </div>
                            </div>

                            <Button
                              variant="default"
                              size="sm"
                              className="w-full"
                              onClick={() => handleViewDetails(prescription)}
                            >
                              <FileText className="ml-2 h-3.5 w-3.5" />
                              التفاصيل
                            </Button>
                          </CardContent>
                        </Card>
                      )
                    })
                  )}
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block w-full">
                  <div className="rounded-md border overflow-hidden">
                    <table className="min-w-full divide-y divide-border">
                      <thead className="bg-muted/50">
                        <tr>
                          <th scope="col" className="px-4 py-3 text-right text-sm font-semibold w-[60px]">
                            #
                          </th>
                          <th scope="col" className="px-4 py-3 text-right text-sm font-semibold ">
                            رقم الوصفة
                          </th>
                          <th scope="col" className="px-4 py-3 text-right text-sm font-semibold ">
                            تاريخ الإرسال
                          </th>
                          <th scope="col" className="px-4 py-3 text-right text-sm font-semibold ">
                            اسم المريض
                          </th>
                          <th scope="col" className="px-4 py-3 text-center text-sm font-semibold ">
                            رقم الهاتف
                          </th>
                          <th scope="col" className="px-4 py-3 text-right text-sm font-semibold ">
                            كود المريض
                          </th>
                          <th scope="col" className="px-4 py-3 text-right text-sm font-semibold ">
                            الحالة
                          </th>
                          <th scope="col" className="px-4 py-3 text-right text-sm font-semibold "></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border bg-background">
                        {prescriptions.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="text-center text-muted-foreground py-12">
                              <div className="flex flex-col items-center gap-2">
                                <p className="text-base font-medium">لا توجد نتائج للبحث</p>
                                <p className="text-sm">جرب تغيير معايير البحث</p>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          prescriptions.map((prescription, index) => {
                            const arabicStatus = mapStatusToArabic(prescription.status) as PrescriptionStatus
                            const displayIndex = (pagination.currentPage - 1) * pageSize + index + 1

                            return (
                              <tr key={prescription.id} className="hover:bg-muted/50 transition-colors">
                                <td className="px-3 py-4 text-sm font-medium">{displayIndex}</td>
                                <td className="px-3 py-4 text-sm font-medium">
                                  <span className="block break-words" title={prescription.prescriptionNumber}>
                                    {prescription.prescriptionNumber}
                                  </span>
                                </td>
                                <td className="px-3 py-4 text-sm">
                                  <span className="whitespace-nowrap block">
                                    {formatDateArabic(prescription.createdAt)}
                                  </span>
                                </td>
                                <td className="px-3 py-4 text-sm">
                                  <div className="max-w-[140px]">
                                    <span className="break-words block" title={prescription.customerName}>
                                      {prescription.customerName}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-3 py-4 text-sm text-center w-[120px]">
                                  <span className="font-mono block whitespace-nowrap" dir="ltr">
                                    {prescription.customerPhone}
                                  </span>
                                </td>
                                <td className="px-3 py-4 text-sm">
                                  <span className="font-mono block break-words">{prescription.customerCode}</span>
                                </td>
                                <td className="px-3 py-4 text-sm">
                                  <Badge
                                    variant="outline"
                                    className={`${statusColors[arabicStatus]} text-xs whitespace-nowrap`}
                                  >
                                    {arabicStatus}
                                  </Badge>
                                </td>
                                <td className="px-3 py-4 text-sm">
                                  <Button variant="default" size="sm" onClick={() => handleViewDetails(prescription)}>
                                    التفاصيل
                                  </Button>
                                </td>
                              </tr>
                            )
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {pagination.totalPages > 1 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 pt-4 border-t">
                    <div className="text-sm text-muted-foreground mx-3.5">
                      صفحة {pagination.currentPage} من {pagination.totalPages} ({pagination.totalCount} وصفة)
                    </div>
                    <div className="flex items-center gap-1 mx-3.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePageChange(pagination.currentPage - 1)}
                        disabled={!pagination.hasPrevious}
                        className="gap-1"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>

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
                            onClick={() => handlePageChange(page as number)}
                            className="h-8 w-8 p-0"
                          >
                            {page}
                          </Button>
                        ),
                      )}

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePageChange(pagination.currentPage + 1)}
                        disabled={!pagination.hasNext}
                        className="gap-1"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <PrescriptionDetailsModal
          prescription={selectedPrescription}
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
          onUpdate={handlePrescriptionUpdate}
          onImageZoom={handleImageZoom}
        />

        <ImageZoomModal
          imageUrl={zoomedImage}
          open={isZoomModalOpen}
          onOpenChange={setIsZoomModalOpen}
        />
      </div>
    </DashboardLayout>
  )
}

export default withPermission(PrescriptionsPage, { permission: "Prescriptions.View" })