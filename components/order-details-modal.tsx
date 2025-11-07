"use client"

import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { X, Trash2, Printer } from "lucide-react"
import { useState, useEffect, useMemo, useRef } from "react"
import {
  type Order,
  OrderStatusEnum,
  getStatusDisplay,
  updateOrderStatus,
  updateOrderItemQuantity,
  deleteOrderItem,
  updateShippingFee,
} from "@/lib/api/orders"
import { formatDateArabic } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/context/AuthContext"
import EditableNumberInput from "./EditableNumberInput"

interface OrderDetailsModalProps {
  order: Order | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate?: () => void
}

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

export function OrderDetailsModal({ order, open, onOpenChange, onUpdate }: OrderDetailsModalProps) {
  const { hasPermission } = useAuth()
  const canUpdate = useMemo(() => hasPermission("Orders.Update"), [hasPermission])

  const { toast } = useToast()
  const [editableOrder, setEditableOrder] = useState<Order | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const printRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (order) {
      setEditableOrder(JSON.parse(JSON.stringify(order)))
    }
  }, [order])

  if (!order || !editableOrder) return null

  const isPending = editableOrder.status === OrderStatusEnum.Pending
  const isProductsEditable = isPending && canUpdate
  const isStatusEditable = canUpdate
  const isShippingFeeEditable = isPending && canUpdate

  const handleStatusChange = async (newStatus: string) => {
    if (!canUpdate) return

    const statusValue = Number.parseInt(newStatus) as OrderStatusEnum

    const previousStatus = editableOrder.status
    setEditableOrder({ ...editableOrder, status: statusValue })

    try {
      setIsUpdating(true)
      const response = await updateOrderStatus(order.id, statusValue)

      toast({
        title: "تم تحديث الحالة",
        description: response.message || "تم تحديث حالة الطلب بنجاح",
      })

      onUpdate?.()
    } catch (error: any) {
      setEditableOrder({ ...editableOrder, status: previousStatus })

      const errorMessage = error.response?.data?.message || error.message || "حدث خطأ أثناء تحديث حالة الطلب"

      toast({
        title: "فشل التحديث",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const handleQuantityChange = async (itemId: number, newQuantity: number) => {
    if (!canUpdate || newQuantity < 1) return

    const previousItems = [...editableOrder.items]
    const previousSummary = { ...editableOrder.summary }

    const updatedItems = editableOrder.items.map((item) => {
      if (item.id === itemId) {
        const subtotal = item.unitPrice * newQuantity
        return { ...item, quantity: newQuantity, subtotal }
      }
      return item
    })

    const newSubtotal = updatedItems.reduce((sum, item) => sum + item.subtotal, 0)
    const newTotal = newSubtotal + editableOrder.summary.shippingFee

    setEditableOrder({
      ...editableOrder,
      items: updatedItems,
      summary: {
        ...editableOrder.summary,
        subtotal: newSubtotal,
        total: newTotal,
        totalItems: updatedItems.reduce((sum, item) => sum + item.quantity, 0),
      },
    })

    try {
      setIsUpdating(true)
      await updateOrderItemQuantity(order.id, itemId, newQuantity)
      toast({
        title: "تم تحديث الكمية",
        description: "تم تحديث كمية المنتج بنجاح",
      })
      onUpdate?.()
    } catch (error: any) {
      setEditableOrder({
        ...editableOrder,
        items: previousItems,
        summary: previousSummary,
      })

      toast({
        title: "فشل التحديث",
        description: error.response?.data?.message || error.message || "حدث خطأ أثناء تحديث الكمية",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDeleteItem = async (itemId: number) => {
    if (!canUpdate) return

    if (editableOrder.items.length <= 1) {
      toast({
        title: "لا يمكن الحذف",
        description: "يجب أن يحتوي الطلب على منتج واحد على الأقل",
        variant: "destructive",
      })
      return
    }

    const previousItems = [...editableOrder.items]
    const previousSummary = { ...editableOrder.summary }

    const updatedItems = editableOrder.items.filter((item) => item.id !== itemId)
    const newSubtotal = updatedItems.reduce((sum, item) => sum + item.subtotal, 0)
    const newTotal = newSubtotal + editableOrder.summary.shippingFee

    setEditableOrder({
      ...editableOrder,
      items: updatedItems,
      summary: {
        ...editableOrder.summary,
        subtotal: newSubtotal,
        total: newTotal,
        totalItems: updatedItems.reduce((sum, item) => sum + item.quantity, 0),
      },
    })

    try {
      setIsUpdating(true)
      await deleteOrderItem(order.id, itemId)
      toast({
        title: "تم حذف المنتج",
        description: "تم حذف المنتج من الطلب بنجاح",
      })
      onUpdate?.()
    } catch (error: any) {
      setEditableOrder({
        ...editableOrder,
        items: previousItems,
        summary: previousSummary,
      })

      toast({
        title: "فشل الحذف",
        description: error.response?.data?.message || error.message || "حدث خطأ أثناء حذف المنتج",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const handleShippingFeeChange = async (newFee: number) => {
    if (!canUpdate || newFee < 0) return

    const previousShippingFee = editableOrder.summary.shippingFee
    const previousTotal = editableOrder.summary.total

    const newTotal = editableOrder.summary.subtotal + newFee

    setEditableOrder({
      ...editableOrder,
      summary: {
        ...editableOrder.summary,
        shippingFee: newFee,
        total: newTotal,
      },
    })

    try {
      setIsUpdating(true)
      await updateShippingFee(order.id, newFee)
      toast({
        title: "تم تحديث أجور التوصيل",
        description: "تم تحديث أجور التوصيل بنجاح",
      })
      onUpdate?.()
    } catch (error: any) {
      setEditableOrder({
        ...editableOrder,
        summary: {
          ...editableOrder.summary,
          shippingFee: previousShippingFee,
          total: previousTotal,
        },
      })

      toast({
        title: "فشل التحديث",
        description: error.response?.data?.message || error.message || "حدث خطأ أثناء تحديث أجور التوصيل",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const handlePrint = () => {
    const printWindow = window.open("", "", "width=800,height=600")
    if (!printWindow) {
      toast({
        title: "خطأ",
        description: "لم يتمكن من فتح نافذة الطباعة. تأكد من تعطيل مانع النوافذ المنبثقة",
        variant: "destructive",
      })
      return
    }

    const htmlContent = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>طباعة الوصل - ${editableOrder.orderNumber}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    html, body {
      margin: 0 !important;
      padding: 0 !important;
      width: 100%;
      height: 100%;
      background: white;
    }

    @page {
      size: A4;
      margin: 8mm 8mm 8mm 8mm;
    }

    @media print {
      body {
        margin: 0;
        padding: 0;
      }
    }

    body {
      font-family: Arial, sans-serif;
      color: #333;
      background: white;
      padding: 0;
      margin: 0;
    }

    .receipt {
      max-width: 100%;
      width: 100%;
      background: white;
      padding: 0;
      margin: 0;
      page-break-after: avoid;
    }

    .header {
      text-align: center;
      margin-bottom: 10px;
      padding-bottom: 8px;
      border-bottom: 2px solid #000;
    }

    .header h1 {
      font-size: 16px;
      margin: 0 0 4px 0;
      font-weight: bold;
    }

    .header p {
      font-size: 11px;
      margin: 2px 0;
    }

    .section {
      margin-bottom: 8px;
    }

    .section-title {
      font-size: 11px;
      font-weight: bold;
      margin: 0 0 4px 0;
      padding-bottom: 2px;
      border-bottom: 1px solid #ddd;
    }

    .info-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 4px;
      font-size: 9px;
    }

    .info-item {
      text-align: right;
    }

    .info-label {
      display: block;
      color: #666;
      font-weight: bold;
      font-size: 8px;
      margin-bottom: 1px;
    }

    .info-value {
      display: block;
      color: #000;
      font-weight: bold;
      font-size: 10px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9px;
      margin: 4px 0;
    }

    table th {
      background: #f5f5f5;
      border: 1px solid #999;
      padding: 3px;
      text-align: right;
      font-weight: bold;
    }

    table td {
      border: 1px solid #999;
      padding: 3px;
      text-align: right;
    }

    table tbody tr:nth-child(even) {
      background: #fafafa;
    }

    .summary-box {
      border: 1px solid #000;
      padding: 6px;
      background: #f9f9f9;
      margin-top: 6px;
    }

    .summary-row {
      display: flex;
      justify-content: space-between;
      padding: 2px 0;
      font-size: 9px;
      text-align: right;
    }

    .summary-row.total {
      font-size: 11px;
      font-weight: bold;
      border-top: 2px solid #000;
      padding-top: 4px;
      margin-top: 2px;
    }

    .badge {
      display: inline-block;
      padding: 2px 4px;
      border-radius: 2px;
      font-size: 8px;
      font-weight: bold;
      margin-top: 2px;
    }

    .badge-pending { background: #dbeafe; color: #1e40af; }
    .badge-shipped { background: #fef3c7; color: #b45309; }
    .badge-delivered { background: #d1fae5; color: #065f46; }
    .badge-cancelled { background: #fee2e2; color: #991b1b; }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="header">
      <h1>فاتورة طلب</h1>
      <p>رقم الطلب: ${editableOrder.orderNumber}</p>
      <p>تاريخ الطلب: ${formatDateArabic(editableOrder.orderDate)}</p>
      <span class="badge badge-${
        editableOrder.status === 0
          ? "pending"
          : editableOrder.status === 1
            ? "shipped"
            : editableOrder.status === 2
              ? "delivered"
              : "cancelled"
      }">
        ${
          editableOrder.status === 0
            ? "تم الطلب"
            : editableOrder.status === 1
              ? "تم الشحن"
              : editableOrder.status === 2
                ? "تم الاستلام"
                : "تم الإلغاء"
        }
      </span>
    </div>

    <div class="section">
      <div class="section-title">معلومات المريض</div>
      <div class="info-grid">
        <div class="info-item">
          <span class="info-label">اسم المريض:</span>
          <span class="info-value">${editableOrder.shippingInfo.fullName}</span>
        </div>
        <div class="info-item">
          <span class="info-label">رقم الهاتف:</span>
          <span class="info-value" dir="ltr">${editableOrder.shippingInfo.phoneNumber}</span>
        </div>
        <div class="info-item">
          <span class="info-label">العنوان:</span>
          <span class="info-value">${editableOrder.shippingInfo.address}</span>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">المنتجات المطلوبة</div>
      <table>
        <thead>
          <tr>
            <th style="width: 30px">#</th>
            <th>المنتج</th>
            <th style="width: 50px">الكمية</th>
            <th style="width: 60px">السعر</th>
            <th style="width: 70px">الإجمالي</th>
          </tr>
        </thead>
        <tbody>
          ${editableOrder.items
            .map(
              (item, index) => `
            <tr>
              <td>${index + 1}</td>
              <td>${item.productName}</td>
              <td>${item.quantity}</td>
              <td>${item.unitPrice} د.ع</td>
              <td>${item.subtotal} د.ع</td>
            </tr>
          `,
            )
            .join("")}
        </tbody>
      </table>
    </div>

    <div class="summary-box">
      <div class="summary-row">
        <span>المجموع الفرعي:</span>
        <span>${editableOrder.summary.subtotal} د.ع</span>
      </div>
      <div class="summary-row">
        <span>أجور التوصيل:</span>
        <span>${editableOrder.summary.shippingFee} د.ع</span>
      </div>
      <div class="summary-row">
        <span>إجمالي المنتجات:</span>
        <span>${editableOrder.summary.totalItems}</span>
      </div>
      <div class="summary-row total">
        <span>المبلغ الإجمالي:</span>
        <span>${editableOrder.summary.total} د.ع</span>
      </div>
    </div>
  </div>

  <script>
    window.print();
    window.onafterprint = function() {
      window.close();
    };
  </script>
</body>
</html>
    `

    printWindow.document.write(htmlContent)
    printWindow.document.close()
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="max-w-[98vw] max-h-[95vh] p-0 gap-0 flex flex-col overflow-hidden bg-gray-50 print:hidden"
          dir="rtl"
        >
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 bg-white shrink-0">
            <h2 className="text-base font-bold text-gray-800 text-right">تفاصيل الطلب</h2>
            <button
              onClick={() => onOpenChange(false)}
              className="text-gray-400 hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm p-1 inline-flex items-center"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="p-3 space-y-3">
              <div className="bg-white p-3 rounded-lg shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="text-right">
                    <h3 className="text-base font-bold text-gray-900">رقم الطلب: {editableOrder.orderNumber}</h3>
                    <p className="text-xs text-gray-600 mt-0.5">
                      تاريخ الطلب: {formatDateArabic(editableOrder.orderDate)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {isStatusEditable ? (
                      <Select
                        value={editableOrder.status.toString()}
                        onValueChange={handleStatusChange}
                        disabled={isUpdating || !canUpdate}
                      >
                        <SelectTrigger className="w-[140px] text-right h-7 text-xs" dir="rtl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent dir="rtl">
                          <SelectItem value={OrderStatusEnum.Pending.toString()}>تم الطلب</SelectItem>
                          <SelectItem value={OrderStatusEnum.Shipped.toString()}>تم الشحن</SelectItem>
                          <SelectItem value={OrderStatusEnum.Delivered.toString()}>تم الاستلام</SelectItem>
                          <SelectItem value={OrderStatusEnum.Cancelled.toString()}>تم الإلغاء</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge
                        className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${getStatusBadgeClassName(editableOrder.status)}`}
                      >
                        {getStatusDisplay(editableOrder.status)}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-white p-3 rounded-lg shadow-sm">
                <h3 className="text-sm font-bold text-gray-900 mb-2 text-right">معلومات المريض</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="text-right">
                    <p className="text-xs font-medium text-gray-600 mb-0.5">اسم المريض</p>
                    <p className="text-xs font-semibold text-gray-900">{editableOrder.shippingInfo.fullName}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium text-gray-600 mb-0.5">رقم الهاتف</p>
                    <p className="text-xs font-semibold text-gray-900" dir="ltr">
                      {editableOrder.shippingInfo.phoneNumber}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium text-gray-600 mb-0.5">العنوان</p>
                    <p className="text-xs font-semibold text-gray-900">{editableOrder.shippingInfo.address}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="p-3">
                  <h3 className="text-sm font-bold text-gray-900 text-right">المنتجات المطلوبة</h3>
                </div>

                <div className="hidden md:block">
                  <table className="w-full text-xs" dir="rtl">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-1.5 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          #
                        </th>
                        <th className="px-3 py-1.5 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          المنتج
                        </th>
                        <th className="px-3 py-1.5 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          الكمية
                        </th>
                        <th className="px-3 py-1.5 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          سعر الوحدة
                        </th>
                        <th className="px-3 py-1.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          الإجمالي الفرعي
                        </th>
                        {isProductsEditable && (
                          <th className="px-3 py-1.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider"></th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {editableOrder.items.map((item, index) => (
                        <tr key={item.id}>
                          <td className="px-3 py-2 whitespace-nowrap text-gray-600 text-right text-xs">{index + 1}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-right">
                            <div className="font-semibold text-gray-900 text-xs">{item.productName}</div>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-right">
                            {isProductsEditable ? (
                              <EditableNumberInput
                                initialValue={item.quantity}
                                onValueChange={(newQuantity) => handleQuantityChange(item.id, newQuantity)}
                                min={1}
                                className="w-14 text-center h-6 text-xs"
                                disabled={isUpdating}
                              />
                            ) : (
                              <span className="text-gray-600 text-xs">{item.quantity}</span>
                            )}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-gray-600 text-right text-xs">
                            {item.unitPrice} د.ع
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-left font-semibold text-gray-800 text-xs">
                            {item.subtotal} د.ع
                          </td>
                          {isProductsEditable && (
                            <td className="px-3 py-2 whitespace-nowrap text-left">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteItem(item.id)}
                                disabled={isUpdating || editableOrder.items.length <= 1}
                                className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="md:hidden p-3 space-y-2">
                  {editableOrder.items.map((item, index) => (
                    <div key={item.id} className="border border-gray-200 rounded-lg p-3 space-y-2 bg-white">
                      <div className="flex justify-between items-start">
                        <div className="text-right flex-1">
                          <div className="font-semibold text-gray-900 text-xs mb-0.5">{item.productName}</div>
                          <div className="text-xs text-gray-600">المنتج #{index + 1}</div>
                        </div>
                        {isProductsEditable && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteItem(item.id)}
                            disabled={isUpdating || editableOrder.items.length <= 1}
                            className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="text-right">
                          <div className="text-gray-600 mb-0.5">الكمية</div>
                          {isProductsEditable ? (
                            <EditableNumberInput
                              initialValue={item.quantity}
                              onValueChange={(newQuantity) => handleQuantityChange(item.id, newQuantity)}
                              min={1}
                              className="w-full text-center h-7 text-xs"
                              disabled={isUpdating}
                            />
                          ) : (
                            <div className="font-medium text-gray-900">{item.quantity}</div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-gray-600 mb-0.5">سعر الوحدة</div>
                          <div className="font-medium text-gray-900 text-xs">{item.unitPrice} د.ع</div>
                        </div>
                      </div>
                      <Separator />
                      <div className="flex justify-between items-center">
                        <div className="font-bold text-gray-800 text-xs">{item.subtotal} د.ع</div>
                        <div className="text-xs text-gray-600">الإجمالي الفرعي</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white p-3 rounded-lg shadow-sm">
                <h3 className="text-sm font-bold text-gray-900 mb-2 text-right">ملخص الطلب</h3>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>المجموع الفرعي</span>
                    <span className="font-semibold text-gray-900">{editableOrder.summary.subtotal} د.ع</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>أجور التوصيل</span>
                    {isShippingFeeEditable ? (
                      <div className="flex items-center gap-1.5" dir="rtl">
                        <EditableNumberInput
                          initialValue={editableOrder.summary.shippingFee}
                          onValueChange={handleShippingFeeChange}
                          min={0}
                          step={0.01}
                          className="w-20 text-right h-6 text-xs"
                          disabled={isUpdating}
                        />
                        <span className="text-xs">د.ع</span>
                      </div>
                    ) : (
                      <span className="font-semibold text-gray-900">{editableOrder.summary.shippingFee} د.ع</span>
                    )}
                  </div>
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>إجمالي عدد المنتجات</span>
                    <span className="font-semibold text-gray-900">{editableOrder.summary.totalItems}</span>
                  </div>
                  <div className="border-t border-gray-200 my-1.5"></div>
                  <div className="flex justify-between text-sm font-bold text-gray-900">
                    <span>المبلغ الإجمالي</span>
                    <span>{editableOrder.summary.total} د.ع</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center px-3 py-2 border-t border-gray-200 bg-gray-50 shrink-0 justify-end gap-2">
            <Button
              variant="default"
              onClick={handlePrint}
              className="text-white bg-blue-600 hover:bg-blue-700 text-xs font-semibold px-3 py-1.5 h-8"
            >
              <Printer className="ml-1.5 h-3.5 w-3.5" />
              طباعة الوصل
            </Button>
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
    </>
  )
}
