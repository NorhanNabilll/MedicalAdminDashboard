"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Save } from "lucide-react"
import DashboardLayout from "@/components/dashboard-layout"
import { getAllSettings, updateSetting, findSettingByKey } from "@/lib/api/settings"
import { withPermission } from "@/components/with-permission";
 function SettingsPage() {
  const [shippingFee, setShippingFee] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [shippingFeeId, setShippingFeeId] = useState<number | null>(null)
  const { toast } = useToast()

  // Fetch current shipping fee on mount
  useEffect(() => {
    fetchShippingFee()
  }, [])

  const fetchShippingFee = async () => {
    try {
      setFetching(true)
      const result = await getAllSettings()

      if (result.success && result.data) {
        const shippingFeeSetting = findSettingByKey(result.data, "ShippingFee")
        if (shippingFeeSetting) {
          setShippingFee(shippingFeeSetting.value)
          setShippingFeeId(shippingFeeSetting.id)
        } else {
          toast({
            title: "تحذير",
            description: "لم يتم العثور على إعداد رسوم الشحن",
            variant: "destructive",
          })
        }
      } else {
        throw new Error(result.error || "فشل في تحميل الإعدادات")
      }
    } catch (error) {
      //console.error("[] Error fetching shipping fee:", error)
      toast({
        title: "خطأ",
        description: "فشل في تحميل رسوم الشحن",
        variant: "destructive",
      })
    } finally {
      setFetching(false)
    }
  }

  const handleSave = async () => {
    // Validate input
    const feeValue = Number.parseFloat(shippingFee)
    if (isNaN(feeValue) || feeValue < 0) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال قيمة صحيحة لرسوم الشحن",
        variant: "destructive",
      })
      return
    }

    if (shippingFeeId === null) {
      toast({
        title: "خطأ",
        description: "معرف رسوم الشحن غير متاح",
        variant: "destructive",
      })
      return
    }

    try {
      setLoading(true)
      //console.log("[] Updating shipping fee to:", feeValue)

      const result = await updateSetting(shippingFeeId, shippingFee)

      if (result.success) {
        toast({
          title: "تم الحفظ",
          description: "تم تحديث رسوم الشحن الافتراضية بنجاح",
        })
      } else {
        throw new Error(result.error || "فشل في تحديث الإعدادات")
      }
    } catch (error) {
      //console.error("[] Error updating shipping fee:", error)
      toast({
        title: "خطأ",
        description: "فشل في تحديث رسوم الشحن",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">الإعدادات</h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1 md:mt-2">إدارة إعدادات النظام </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>رسوم الشحن</CardTitle>
            <CardDescription>تعيين رسوم الشحن الافتراضية للطلبات</CardDescription>
          </CardHeader>
          <CardContent>
            {fetching ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2 px-5">
                  <Label htmlFor="shipping-fee">رسوم الشحن الافتراضية (د.ع)</Label>
                  <Input
                    id="shipping-fee"
                    type="number"
                    min="0"
                    step="0.01"
                    value={shippingFee}
                    onChange={(e) => setShippingFee(e.target.value)}
                    placeholder="أدخل رسوم الشحن"
                    className="max-w-xs"
                    disabled={loading}
                  />
                  <p className="text-xs md:text-sm text-muted-foreground">
                    سيتم تطبيق هذه القيمة على جميع الطلبات الجديدة
                  </p>
                </div>
                <div className="flex justify-center pt-4">
                  <Button onClick={handleSave} disabled={loading || !shippingFee} className="gap-2">
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        جاري الحفظ...
                      </>
                    ) : (
                      <>
                        
                        حفظ التغييرات
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
export default withPermission(SettingsPage,  { superAdminOnly: true });
