"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { useTokenRefresh } from '@/hooks/useTokenRefresh'; 

interface AdminData {
  fullName: string;
  email: string;
  roles: string[];
  permissions: string[];
}

interface AuthContextType {
  admin: AdminData | null;
  hasPermission: (permission: string) => boolean;
  isLoading: boolean;
  getDefaultRoute: () => string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [admin, setAdmin] = useState<AdminData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingTimeout, setLoadingTimeout] = useState(false); // ✅ timeout state

  // ✅ استخدم الـ Hook للـ Silent Token Refresh
  useTokenRefresh();

  useEffect(() => {
    // ✅ Timeout للـ loading (5 ثوانٍ max)
    const timeoutId = setTimeout(() => {
      if (isLoading) {
        console.warn('⚠️ Loading timeout reached');
        setLoadingTimeout(true);
        setIsLoading(false);
      }
    }, 5000);

    try {
      const adminDataString = localStorage.getItem('admin');
      if (adminDataString) {
        setAdmin(JSON.parse(adminDataString));
      }
    } catch (error) {
      console.error("Failed to parse admin data from localStorage", error);
    } finally {
      setIsLoading(false);
      clearTimeout(timeoutId); // ✅ إلغاء الـ timeout
    }

    return () => clearTimeout(timeoutId);
  }, []);

  const hasPermission = (permission: string): boolean => {
    if (admin?.roles?.includes("SuperAdmin")) {
      return true;
    }
    return admin?.permissions?.includes(permission) || false;
  };

  const getDefaultRoute = () => {
    if (!admin) return "/login"
    
    if (admin.roles?.includes("SuperAdmin")) return "/"

    if (admin.permissions?.includes("Users.View")) return "/users"
    if (admin.permissions?.includes("Categories.View")) return "/categories"
    if (admin.permissions?.includes("Products.View")) return "/products"
    if (admin.permissions?.includes("Orders.View")) return "/orders"
    if (admin.permissions?.includes("Prescriptions.View")) return "/prescriptions"

    return "/unauthorized"
  }

  // ✅ عرض رسالة خطأ إذا حدث timeout
  if (loadingTimeout) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <p className="text-lg text-muted-foreground">حدث خطأ في تحميل التطبيق</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ admin, hasPermission, isLoading, getDefaultRoute }}>
      {isLoading ? (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center space-y-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
            <p className="text-sm text-muted-foreground">جاري التحميل...</p>
          </div>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};