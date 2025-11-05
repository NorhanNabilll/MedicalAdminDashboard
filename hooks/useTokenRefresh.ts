import { useEffect, useRef } from 'react';
import { jwtDecode } from 'jwt-decode';
import { getAccessToken, getRefreshToken, saveTokens, clearTokens } from '@/lib/api/tokenService';
import axios from 'axios';

export const useTokenRefresh = () => {
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isInitializedRef = useRef(false); // ✅ منع التنفيذ المتكرر

  useEffect(() => {
    // ✅ منع التنفيذ المتكرر
    if (isInitializedRef.current) {
      console.log('⏭️ Token refresh already initialized, skipping...');
      return;
    }
    isInitializedRef.current = true;

    // ✅ دالة للتحقق من صلاحية الـ token عند بداية التطبيق
    const initializeTokenRefresh = async () => {
      const token = getAccessToken();
      const refreshToken = getRefreshToken();
      
      console.log('🔍 Initializing token refresh system...');

      // لو مفيش tokens خالص → Login
      if (!token || !refreshToken) {
        console.log('❌ No tokens found, redirecting to login');
        clearTokens();
        window.location.href = '/login';
        return;
      }

      try {
        const decoded: any = jwtDecode(token);
        const expiryTime = decoded.exp * 1000;
        const now = Date.now();
        const timeUntilExpiry = expiryTime - now;

        console.log('🔍 Token validation on startup:', {
          expiresIn: Math.round(timeUntilExpiry / 1000) + ' seconds',
          isExpired: timeUntilExpiry <= 0
        });

        // ✅ لو الـ token expired أو هينتهي خلال 2 دقيقة → refresh فوراً
        if (timeUntilExpiry <= 120000) {
          console.log('⚠️ Token expired or expiring soon, refreshing immediately...');
          await performTokenRefresh();
        } else {
          // Token لسه صالح → اضبط الـ timer
          console.log('✅ Token is valid, scheduling refresh');
          scheduleTokenRefresh();
        }
      } catch (error) {
        console.error('❌ Error validating token:', error);
        clearTokens();
        window.location.href = '/login';
      }
    };

    const scheduleTokenRefresh = () => {
      const token = getAccessToken();
      
      if (!token) {
        console.log('⏳ No token found, skipping refresh schedule');
        return;
      }

      try {
        const decoded: any = jwtDecode(token);
        const expiryTime = decoded.exp * 1000;
        const now = Date.now();
        const timeUntilExpiry = expiryTime - now;

        // Refresh قبل الانتهاء بـ 2 دقيقة (120000 ms)
        const refreshTime = timeUntilExpiry - 120000;

        console.log('⏰ Scheduling token refresh:', {
          expiresIn: Math.round(timeUntilExpiry / 1000) + ' seconds',
          willRefreshIn: Math.round(Math.max(0, refreshTime) / 1000) + ' seconds'
        });

        // لو الوقت المتبقي أقل من 2 دقيقة، اعمل refresh فوراً
        if (refreshTime <= 0) {
          console.log('⚡ Refreshing immediately');
          performTokenRefresh();
          return;
        }

        // Schedule refresh
        if (refreshTimerRef.current) {
          clearTimeout(refreshTimerRef.current);
        }

        refreshTimerRef.current = setTimeout(() => {
          console.log('⏰ Auto-refreshing token (scheduled)...');
          performTokenRefresh();
        }, refreshTime);

      } catch (error) {
        console.error('❌ Error scheduling refresh:', error);
      }
    };

    const performTokenRefresh = async () => {
      const refreshToken = getRefreshToken();
      
      if (!refreshToken) {
        console.error('❌ No refresh token available');
        clearTokens();
        window.location.href = '/login';
        return;
      }

      try {
        const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL;
        const response = await axios.post(`${baseURL}/v1/Auth/refresh`, {
          refreshToken
        });

        if (response.data.success) {
          const { accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data;
          
          saveTokens(newAccessToken, newRefreshToken);
          
          console.log('✅ Token refreshed successfully');
          
          // أرسل event لإعلام SignalR
          window.dispatchEvent(new CustomEvent('tokenRefreshed', { 
            detail: { accessToken: newAccessToken } 
          }));

          // Schedule next refresh
          scheduleTokenRefresh();
        } else {
          throw new Error('Token refresh failed');
        }
      } catch (error) {
        console.error('❌ Token refresh failed:', error);
        clearTokens();
        window.location.href = '/login';
      }
    };

    // ✅ استدعاء الدالة الجديدة
    initializeTokenRefresh();

    // Cleanup
    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
      isInitializedRef.current = false;
    };
  }, []);
};