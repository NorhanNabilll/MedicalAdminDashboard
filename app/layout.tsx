import type { Metadata } from "next"
import { Inter as FontSans } from "next/font/google"
import { cn } from "@/lib/utils"
import { Toaster } from "@/components/ui/toaster"
import { AuthProvider } from "@/context/AuthContext"
import { Suspense } from "react"
import "./globals.css"
import { SignalRProvider } from "@/context/SignalRContext"
import NotificationDisplay from "@/components/NotificationDisplay"
import { AuthNavigationHandler } from "@/components/AuthNavigationHandler" // ✅ أضف هذا السطر

const fontSans = FontSans({
  subsets: ["latin"],
  variable: "--font-sans",
})

export const metadata: Metadata = {
  title: "صيدليه السكري",
  description: "لوحه تحكم صيدليه السكرى",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased",
          fontSans.variable
        )}
      >
        <AuthProvider>
          <SignalRProvider>
            <AuthNavigationHandler /> {/* ✅ أضف هذا السطر */}
            <NotificationDisplay />
            <Suspense fallback={null}>{children}</Suspense>
            <Toaster />
          </SignalRProvider>
        </AuthProvider>
      </body>
    </html>
  )
}