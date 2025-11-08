"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Eye, EyeOff, Check, AlertCircle } from "lucide-react"
import DashboardLayout from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/context/AuthContext"
import { apiClient } from "@/lib/api/axios-config"
import { logout, logoutFromAllDevices } from "@/lib/api/authApi";

interface ProfileData {
  fullName: string
  email: string
}

interface PasswordChangeData {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

export default function ProfilePage() {
  const router = useRouter()
  const { admin, isLoading: authLoading } = useAuth()
  const { toast } = useToast()

  // Profile Edit State
  const [profileData, setProfileData] = useState<ProfileData>({
    fullName: "",
    email: "",
  })
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileChanged, setProfileChanged] = useState(false)

  // Password Change State
  const [passwordData, setPasswordData] = useState<PasswordChangeData>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  })
  const [passwordStrength, setPasswordStrength] = useState(0)

  // Initialize profile data
// Initialize profile data
useEffect(() => {
  // ✅ اقرأ من localStorage مباشرة بدل admin
  try {
    const adminDataString = localStorage.getItem('admin');
    if (adminDataString) {
      const adminData = JSON.parse(adminDataString);
      setProfileData({
        fullName: adminData.fullName || "",
        email: adminData.email || "",
      });
    }
  } catch (error) {
    //console.error("Failed to load profile data", error);
  }
}, []); // ✅ شيل admin من الـ dependencies

  // ✅ استمع لتحديثات البروفايل
useEffect(() => {
  const handleProfileUpdate = () => {
    try {
      const adminDataString = localStorage.getItem('admin');
      if (adminDataString) {
        const updatedAdmin = JSON.parse(adminDataString);
        setProfileData({
          fullName: updatedAdmin.fullName || "",
          email: updatedAdmin.email || "",
        });
      }
    } catch (error) {
      //console.error("Failed to update profile data", error);
    }
  };

  window.addEventListener('profileUpdated', handleProfileUpdate);

  return () => {
    window.removeEventListener('profileUpdated', handleProfileUpdate);
  };
}, []);

  // Calculate password strength
  useEffect(() => {
    const password = passwordData.newPassword
    let strength = 0

    if (password.length >= 8) strength++
    if (password.length >= 12) strength++
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++
    if (/\d/.test(password)) strength++
    if (/[^a-zA-Z\d]/.test(password)) strength++

    setPasswordStrength(Math.min(strength, 4))
  }, [passwordData.newPassword])

  // Handle profile data change
  const handleProfileChange = (field: keyof ProfileData, value: string) => {
    setProfileData((prev) => ({ ...prev, [field]: value }))
    setProfileChanged(true)
  }

  // Handle password data change
  const handlePasswordChange = (field: keyof PasswordChangeData, value: string) => {
    setPasswordData((prev) => ({ ...prev, [field]: value }))
  }

  // Save profile changes
  const handleSaveProfile = async () => {
    if (!profileData.fullName.trim() || !profileData.email.trim()) {
      toast({
        title: "خطأ",
        description: "يرجى ملء جميع الحقول المطلوبة",
        variant: "destructive",
      })
      return
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(profileData.email)) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال بريد إلكتروني صحيح",
        variant: "destructive",
      })
      return
    }

    try {
      const oldEmail = admin?.email;
      setProfileLoading(true)
      const response = await apiClient.put("/v1/AdminAuth/profile", {
        fullName: profileData.fullName,
        email: profileData.email,
        currentPassword: "",
        newPassword: "",
      })


      if (response.data.success) {
          // 1. Update localStorage with all new profile data first
          const updatedAdmin = { ...admin, ...profileData };
          localStorage.setItem("admin", JSON.stringify(updatedAdmin));

         // window.dispatchEvent(new Event('adminDataUpdated'));

          // 2. Now, check if the email was changed
          if (oldEmail && oldEmail.toLowerCase() !== profileData.email.toLowerCase()) {
              // --- Email Changed Case ---
              toast({
                  title: "تم تحديث البريد الإلكتروني بنجاح",
                  description: "لأسباب أمنية، سيتم الآن تسجيل خروجك.",
              });

              setTimeout(() => {
                   logoutFromAllDevices(); // Call the logout function
              }, 2000);

          } else {
              // --- Name Only Changed Case ---
              toast({
                  title: "تم بنجاح",
                  description: "تم تحديث بيانات الملف الشخصي بنجاح",
              });
              setProfileChanged(false);

              // ✅ إطلاق event لتحديث ProfileMenu
               window.dispatchEvent(new Event('profileUpdated'));
          }
      }
        

        else {
        throw new Error(response.data.message || "فشل تحديث البيانات")
      }
    } catch (error: any) {
      //console.error("[] Profile update error:", error)
      toast({
        title: "خطأ",
        description: error.response?.data?.message || "فشل تحديث بيانات الملف الشخصي",
        variant: "destructive",
      })
    } finally {
      setProfileLoading(false)
    }
  }

  // Change password
  const handleChangePassword = async () => {
    // Validation
    if (!passwordData.currentPassword.trim()) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال كلمة المرور الحالية",
        variant: "destructive",
      })
      return
    }

    if (!passwordData.newPassword.trim()) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال كلمة المرور الجديدة",
        variant: "destructive",
      })
      return
    }

    if (passwordData.newPassword.length < 8) {
      toast({
        title: "خطأ",
        description: "يجب أن تكون كلمة المرور الجديدة 8 أحرف على الأقل",
        variant: "destructive",
      })
      return
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: "خطأ",
        description: "كلمات المرور الجديدة غير متطابقة",
        variant: "destructive",
      })
      return
    }

    if (passwordData.currentPassword === passwordData.newPassword) {
      toast({
        title: "خطأ",
        description: "كلمة المرور الجديدة يجب أن تكون مختلفة عن الحالية",
        variant: "destructive",
      })
      return
    }

    try {
      setPasswordLoading(true)
      const response = await apiClient.put("/v1/AdminAuth/profile", {
        fullName: "",
        email: "",
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      })




    if (response.data.success) {
        // تم حذف الـ toast الأول من هنا

        setPasswordData({
            currentPassword: "",
            newPassword: "",
            confirmPassword: "",
        });

        try {
            //console.log("Attempting to log out from all other devices...");
            await logoutFromAllDevices();
            //console.log("Successfully logged out from all other devices.");
            
            // ✅ أبقِ على هذه الرسالة فقط
            toast({
                title: "تم تحديث كلمة المرور بنجاح",
                description: "لأسباب أمنية، سيتم الآن تسجيل خروجك. يرجى تسجيل الدخول مرة أخرى.",
            });

            setTimeout(() => {
                logoutFromAllDevices();
            }, 3000);

        } catch (e) {
            //console.error("Could not log out from all devices, but this will not affect the user.", e);
            // في حالة فشل تسجيل الخروج من كل الأجهزة، لا يزال يجب تسجيل الخروج من الجهاز الحالي
            // لذا، نعرض نفس الرسالة ونكمل
            toast({
                title: "تم تحديث كلمة المرور بنجاح",
                description: "لأسباب أمنية، سيتم الآن تسجيل خروجك. يرجى تسجيل الدخول مرة أخرى.",
            });
            setTimeout(() => {
                logout();
            }, 2000);
        }
    }
      
      
      else {
        throw new Error(response.data.message || "فشل تغيير كلمة المرور")
      }
    } catch (error: any) {
      //console.error("[] Password change error:", error)
      toast({
        title: "خطأ",
        description: error.response?.data?.message || "فشل تغيير كلمة المرور",
        variant: "destructive",
      })
    } finally {
      setPasswordLoading(false)
    }
  }

  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="w-full flex px-4 py-6 text-right sm:px-0.5 sm:py-2" dir="rtl">
        <div className="w-full max-w-3xl space-y-6 sm:space-y-8">
          {/* Page Header */}
          <div className="text-right space-y-2">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">تعديل الملف الشخصي</h1>
            <p className="text-sm md:text-base text-muted-foreground">إدارة بيانات حسابك وكلمة المرور</p>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="grid w-full grid-cols-2 h-11 sm:h-12">
              <TabsTrigger value="profile" className="text-sm sm:text-base">البيانات الشخصية</TabsTrigger>
              <TabsTrigger value="password" className="text-sm sm:text-base">تغيير كلمة المرور</TabsTrigger>
            </TabsList>

            {/* Profile Tab */}
            <TabsContent value="profile" className="space-y-4 mt-6">
              <Card>
                <CardHeader className="text-center space-y-1.5 pb-6">
                  <CardTitle className="text-lg justify-center sm:text-xl">بيانات الملف الشخصي</CardTitle>
                  <CardDescription className="text-sm justify-center sm:text-base">قم بتحديث معلومات حسابك الشخصية</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 px-4 sm:px-6 pb-6 sm:pb-8">
                  {/* Full Name Field */}
                  <div className="space-y-2">
                    <Label htmlFor="fullName" className="text-base font-medium block text-right">
                      الاسم الكامل
                    </Label>
                    <Input
                      id="fullName"
                      type="text"
                      value={profileData.fullName}
                      onChange={(e) => handleProfileChange("fullName", e.target.value)}
                      placeholder="أدخل اسمك الكامل"
                      disabled={profileLoading}
                      className="text-base text-right h-11"
                      aria-label="الاسم الكامل"
                      dir="rtl"
                    />
                    <p className="text-sm text-muted-foreground text-right">هذا هو الاسم الذي سيظهر في النظام</p>
                  </div>

                  {/* Email Field */}
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-base font-medium block text-right">
                      البريد الإلكتروني
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={profileData.email}
                      onChange={(e) => handleProfileChange("email", e.target.value)}
                      placeholder="أدخل بريدك الإلكتروني"
                      disabled={profileLoading}
                      className="text-base text-right h-11"
                      aria-label="البريد الإلكتروني"
                      dir="rtl"
                    />
                    <p className="text-sm text-muted-foreground text-right">سيتم استخدام هذا البريد للتواصل </p>
                  </div>

                  {/* Save Button */}
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
                    <Button 
                      onClick={handleSaveProfile} 
                      disabled={profileLoading || !profileChanged} 
                      className="gap-2 h-11 text-sm sm:text-base w-full sm:w-auto px-8"
                    >
                      {profileLoading ? (
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
                    {profileChanged && (
                      <div className="flex items-center gap-2 text-amber-600">
                        <span className="text-sm">لديك تغييرات غير محفوظة</span>
                        <AlertCircle className="h-4 w-4 flex-shrink-0" />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Password Tab */}
            <TabsContent value="password" className="space-y-4 mt-6">
              <Card>
                <CardHeader className="text-center space-y-1.5 pb-6">
                  <CardTitle className="text-lg sm:text-xl">تغيير كلمة المرور</CardTitle>
                  <CardDescription className="text-sm sm:text-base">قم بتحديث كلمة المرور الخاصة بك بانتظام للحفاظ على أمان حسابك</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 px-4 sm:px-6 pb-6 sm:pb-8">

                  {/* Current Password */}
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword" className="text-base font-medium block text-right">
                      كلمة المرور الحالية
                    </Label>
                    <div className="relative">
                      <Input
                        id="currentPassword"
                        type={showPasswords.current ? "text" : "password"}
                        value={passwordData.currentPassword}
                        onChange={(e) => handlePasswordChange("currentPassword", e.target.value)}
                        placeholder="أدخل كلمة المرور الحالية"
                        disabled={passwordLoading}
                        className="text-base text-right pr-3 pl-11 h-11"
                        aria-label="كلمة المرور الحالية"
                        dir="rtl"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowPasswords((prev) => ({
                            ...prev,
                            current: !prev.current,
                          }))
                        }
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        aria-label={showPasswords.current ? "إخفاء كلمة المرور" : "عرض كلمة المرور"}
                      >
                        {showPasswords.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* New Password */}
                  <div className="space-y-2">
                    <Label htmlFor="newPassword" className="text-base font-medium block text-right">
                      كلمة المرور الجديدة
                    </Label>
                    <div className="relative">
                      <Input
                        id="newPassword"
                        type={showPasswords.new ? "text" : "password"}
                        value={passwordData.newPassword}
                        onChange={(e) => handlePasswordChange("newPassword", e.target.value)}
                        placeholder="أدخل كلمة المرور الجديدة"
                        disabled={passwordLoading}
                        className="text-base text-right pr-3 pl-11 h-11"
                        aria-label="كلمة المرور الجديدة"
                        dir="rtl"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowPasswords((prev) => ({
                            ...prev,
                            new: !prev.new,
                          }))
                        }
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        aria-label={showPasswords.new ? "إخفاء كلمة المرور" : "عرض كلمة المرور"}
                      >
                        {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>

                    {/* Password Strength Indicator */}
                    {passwordData.newPassword && (
                      <div className="space-y-2">
                        <div className="flex gap-1.5" dir="ltr">
                          {[0, 1, 2, 3].map((i) => (
                            <div
                              key={i}
                              className={`h-1.5 flex-1 rounded-full transition-colors ${
                                i < passwordStrength
                                  ? i < 2
                                    ? "bg-red-500"
                                    : i < 3
                                      ? "bg-yellow-500"
                                      : "bg-green-500"
                                  : "bg-muted"
                              }`}
                            />
                          ))}
                        </div>
                        <p className="text-sm text-muted-foreground text-right font-medium">
                          قوة كلمة المرور:{" "}
                          <span className={`${
                            passwordStrength < 2 ? "text-red-600" : 
                            passwordStrength < 3 ? "text-yellow-600" : 
                            "text-green-600"
                          }`}>
                            {passwordStrength === 0 && "ضعيفة جداً"}
                            {passwordStrength === 1 && "ضعيفة"}
                            {passwordStrength === 2 && "متوسطة"}
                            {passwordStrength === 3 && "قوية"}
                            {passwordStrength === 4 && "قوية جداً"}
                          </span>
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-base font-medium block text-right">
                      تأكيد كلمة المرور الجديدة
                    </Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showPasswords.confirm ? "text" : "password"}
                        value={passwordData.confirmPassword}
                        onChange={(e) => handlePasswordChange("confirmPassword", e.target.value)}
                        placeholder="أعد إدخال كلمة المرور الجديدة"
                        disabled={passwordLoading}
                        className={`text-base text-right pr-3 pl-11 h-11 ${
                          passwordData.confirmPassword && passwordData.newPassword !== passwordData.confirmPassword
                            ? "border-red-500 focus-visible:ring-red-500"
                            : ""
                        }`}
                        aria-label="تأكيد كلمة المرور الجديدة"
                        dir="rtl"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowPasswords((prev) => ({
                            ...prev,
                            confirm: !prev.confirm,
                          }))
                        }
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        aria-label={showPasswords.confirm ? "إخفاء كلمة المرور" : "عرض كلمة المرور"}
                      >
                        {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {passwordData.confirmPassword && passwordData.newPassword !== passwordData.confirmPassword && (
                      <p className="text-sm text-red-600 text-right font-medium">كلمات المرور غير متطابقة</p>
                    )}
                  </div>

                  {/* Change Password Button */}
                  <div className="flex justify-center pt-4">
                    <Button
                      onClick={handleChangePassword}
                      disabled={
                        passwordLoading ||
                        !passwordData.currentPassword ||
                        !passwordData.newPassword ||
                        !passwordData.confirmPassword ||
                        passwordData.newPassword !== passwordData.confirmPassword
                      }
                      className="gap-2 h-11 text-sm sm:text-base w-full sm:w-auto px-8"
                    >
                      {passwordLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          جاري التحديث...
                        </>
                      ) : (
                        <>
                         
                          تحديث كلمة المرور
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </DashboardLayout>
  )
}