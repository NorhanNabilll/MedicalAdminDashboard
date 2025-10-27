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
  getDefaultRoute: () => string
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [admin, setAdmin] = useState<AdminData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // ✅ استخدم الـ Hook للـ Silent Token Refresh
  useTokenRefresh();

  useEffect(() => {
    try {
      const adminDataString = localStorage.getItem('admin');
      if (adminDataString) {
        setAdmin(JSON.parse(adminDataString));
      }
    } catch (error) {
      console.error("Failed to parse admin data from localStorage", error);
    } finally {
      setIsLoading(false);
    }
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

  return (
    <AuthContext.Provider value={{ admin, hasPermission, isLoading , getDefaultRoute }}>
      {isLoading ? (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
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