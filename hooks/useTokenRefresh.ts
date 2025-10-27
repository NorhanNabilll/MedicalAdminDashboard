import { useEffect, useRef } from 'react';
import { jwtDecode } from 'jwt-decode';
import { getAccessToken, getRefreshToken, saveTokens, clearTokens } from '@/lib/api/tokenService';
import axios from 'axios';

export const useTokenRefresh = () => {
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const scheduleTokenRefresh = () => {
      const token = getAccessToken();
      
      if (!token) {
        console.log('⏳ No token found, skipping refresh schedule');
        return;
      }

      try {
        const decoded: any = jwtDecode(token);
        const expiryTime = decoded.exp * 1000; // Convert to milliseconds
        const now = Date.now();
        const timeUntilExpiry = expiryTime - now;

        // ✅ Refresh قبل الانتهاء بـ 2 دقيقة (120000 ms)
        const refreshTime = timeUntilExpiry - 120000;

        console.log('⏰ Token expires in:', Math.round(timeUntilExpiry / 1000), 'seconds');
        console.log('⏰ Will refresh in:', Math.round(refreshTime / 1000), 'seconds');

        // لو الوقت المتبقي أقل من 2 دقيقة، اعمل refresh فوراً
        if (refreshTime <= 0) {
          console.log('⚠️ Token expired or expiring soon, refreshing now...');
          performTokenRefresh();
          return;
        }

        // Schedule refresh
        if (refreshTimerRef.current) {
          clearTimeout(refreshTimerRef.current);
        }

        refreshTimerRef.current = setTimeout(() => {
          console.log('🔄 Auto-refreshing token (scheduled)...');
          performTokenRefresh();
        }, refreshTime);

      } catch (error) {
        console.error('❌ Error decoding token:', error);
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
        const response = await axios.post('https://localhost:7292/api/v1/Auth/refresh', {
          refreshToken
        });

        if (response.data.success) {
          const { accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data;
          
          saveTokens(newAccessToken, newRefreshToken);
          
          console.log('✅ Token refreshed successfully (silent refresh)');
          
          // ✅ أرسل event لإعلام SignalR
          window.dispatchEvent(new CustomEvent('tokenRefreshed', { 
            detail: { accessToken: newAccessToken } 
          }));

          // Schedule next refresh
          scheduleTokenRefresh();
        } else {
          throw new Error('Token refresh failed');
        }
      } catch (error) {
        console.error('❌ Silent token refresh failed:', error);
        clearTokens();
        window.location.href = '/login';
      }
    };

    // Schedule initial refresh
    scheduleTokenRefresh();

    // Cleanup
    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
    };
  }, []);
};