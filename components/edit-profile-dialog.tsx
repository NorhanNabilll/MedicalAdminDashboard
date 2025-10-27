"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface EditProfileDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  admin: { fullName: string; email: string } | null
  onSave: (data: { fullName: string; email: string }) => void
}

export default function EditProfileDialog({ open, onOpenChange, admin, onSave }: EditProfileDialogProps) {
  const [fullName, setFullName] = useState(admin?.fullName || "")
  const [email, setEmail] = useState(admin?.email || "")
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    if (!fullName.trim() || !email.trim()) {
      return
    }

    setIsSaving(true)
    try {
      onSave({ fullName, email })
      onOpenChange(false)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]" dir="rtl">
        <DialogHeader>
          <DialogTitle>تعديل بيانات الملف الشخصي</DialogTitle>
          <DialogDescription>قم بتحديث معلومات ملفك الشخصي</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="fullName">الاسم الكامل</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="أدخل اسمك الكامل"
              dir="rtl"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="email">البريد الإلكتروني</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="أدخل بريدك الإلكتروني"
              dir="rtl"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            إلغاء
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !fullName.trim() || !email.trim()}>
            {isSaving ? "جاري الحفظ..." : "حفظ التغييرات"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
