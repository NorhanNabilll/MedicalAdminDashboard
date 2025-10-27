"use client"

import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { X } from "lucide-react"
import { useState, useEffect, useMemo } from "react"
import {
  type Prescription,
  updatePrescriptionStatus,
  mapStatusToArabic,
  mapArabicToStatus,
  getImageUrl,
} from "@/lib/api/prescriptions"
import { formatDateArabic } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/context/AuthContext"
import Image from "next/image"

interface PrescriptionDetailsModalProps {
  prescription: Prescription | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate?: () => void
}

type PrescriptionStatus = "تم الطلب" | "تم الالغاء" | "تم الموافقه" | "تم الرفض"

const statusColors: Record<PrescriptionStatus, string> = {
  "تم الطلب": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  "تم الالغاء": "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  "تم الموافقه": "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  "تم الرفض": "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
}

export function PrescriptionDetailsModal({
  prescription,
  open,
  onOpenChange,
  onUpdate,
}: PrescriptionDetailsModalProps) {
  const { hasPermission } = useAuth()
  const canUpdate = useMemo(() => hasPermission("Prescriptions.Update"), [hasPermission])

  const { toast } = useToast()
  const [editablePrescription, setEditablePrescription] = useState<Prescription | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    if (prescription) {
      setEditablePrescription(JSON.parse(JSON.stringify(prescription)))
    }
  }, [prescription])

  if (!prescription || !editablePrescription) return null

  const isStatusEditable = canUpdate && prescription.status !== 3

  const handleStatusChange = async (newArabicStatus: string) => {
    if (!canUpdate) return

    const newStatus = mapArabicToStatus(newArabicStatus as PrescriptionStatus)
    const previousStatus = editablePrescription.status

    setEditablePrescription({ ...editablePrescription, status: newStatus })

    try {
      setIsUpdating(true)
      await updatePrescriptionStatus(prescription.id, newStatus)

      toast({
        title: "تم تحديث الحالة",
        description: "تم تحديث حالة الوصفة بنجاح",
      })

      onUpdate?.()
    } catch (error: any) {
      setEditablePrescription({ ...editablePrescription, status: previousStatus })

      const errorMessage = error.response?.data?.message || error.message || "حدث خطأ أثناء تحديث حالة الوصفة"

      toast({
        title: "فشل التحديث",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const arabicStatus = mapStatusToArabic(editablePrescription.status) as PrescriptionStatus

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[98vw] max-h-[95vh] p-0 gap-0 flex flex-col overflow-hidden bg-gray-50" dir="rtl">
        <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 bg-white shrink-0">
          <h2 className="text-base font-bold text-gray-800 text-right">تفاصيل الوصفة</h2>
          <button
            onClick={() => onOpenChange(false)}
            className="text-gray-400 hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm p-1 inline-flex items-center"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-3 space-y-3">
            {/* Header with prescription number and status */}
            <div className="bg-white p-3 rounded-lg shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="text-right">
                  <h3 className="text-base font-bold text-gray-900">
                    رقم الوصفة: {editablePrescription.prescriptionNumber}
                  </h3>
                  <p className="text-xs text-gray-600 mt-0.5">
                    تاريخ الإرسال: {formatDateArabic(editablePrescription.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {isStatusEditable ? (
                    <Select value={arabicStatus} onValueChange={handleStatusChange} disabled={isUpdating || !canUpdate}>
                      <SelectTrigger className="w-[140px] text-right h-7 text-xs" dir="rtl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent dir="rtl">
                        <SelectItem value="تم الطلب">تم الطلب</SelectItem>
                        <SelectItem value="تم الموافقه">تم الموافقه</SelectItem>
                        <SelectItem value="تم الرفض">تم الرفض</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${statusColors[arabicStatus]}`}>
                      {arabicStatus}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Prescription Image */}
            <div className="bg-white p-3 rounded-lg shadow-sm">
              <h3 className="text-sm font-bold text-gray-900 mb-2 text-right">صورة الوصفة</h3>
              <div className="relative w-full h-64 rounded-md overflow-hidden border bg-muted">
                <Image
                  src={getImageUrl(editablePrescription.imageUrl) || "/placeholder.svg"}
                  alt={`وصفة رقم ${editablePrescription.prescriptionNumber}`}
                  fill
                  className="object-contain"
                />
              </div>
            </div>

            {/* Patient Information */}
            <div className="bg-white p-3 rounded-lg shadow-sm">
              <h3 className="text-sm font-bold text-gray-900 mb-2 text-right">معلومات المريض</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="text-right">
                  <p className="text-xs font-medium text-gray-600 mb-0.5">اسم المريض</p>
                  <p className="text-xs font-semibold text-gray-900">{editablePrescription.customerName}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium text-gray-600 mb-0.5">رقم الهاتف</p>
                  <p className="text-xs font-semibold text-gray-900 font-mono" dir="ltr">
                    {editablePrescription.customerPhone}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium text-gray-600 mb-0.5">كود المريض</p>
                  <p className="text-xs font-semibold text-gray-900 font-mono">{editablePrescription.customerCode}</p>
                </div>
              </div>
            </div>

            {/* Additional Notes */}
            {editablePrescription.additionalNotes && (
              <div className="bg-white p-3 rounded-lg shadow-sm">
                <h3 className="text-sm font-bold text-gray-900 mb-2 text-right">الملاحظات</h3>
                <p className="text-xs text-gray-700 whitespace-pre-wrap break-words">
                  {editablePrescription.additionalNotes}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center px-3 py-2 border-t border-gray-200 bg-gray-50 shrink-0 justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="text-gray-600 bg-white hover:bg-gray-100 border-gray-200 text-xs font-semibold px-3 py-1.5 h-8"
          >
            إغلاق
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
