import { useEffect, useRef } from 'react';
import { jwtDecode } from 'jwt-decode';
import { getAccessToken, getRefreshToken, saveTokens, clearTokens } from '@/lib/api/tokenService';
import axios from 'axios';

export const useTokenRefresh = () => {
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isInitializedRef = useRef(false);

  useEffect(() => {
    if (isInitializedRef.current) {
      return;
    }
    isInitializedRef.current = true;

    const initializeTokenRefresh = async () => {
      const token = getAccessToken();
      const refreshToken = getRefreshToken();
      
      // ✅ لو مفيش tokens، بس نظف ومتعملش redirect
      if (!token || !refreshToken) {
        //console.log('ℹ️ No tokens found');
        clearTokens();
        return; // ✅ بس كده! مفيش redirect
      }

      try {
        const decoded: any = jwtDecode(token);
        const expiryTime = decoded.exp * 1000;
        const now = Date.now();
        const timeUntilExpiry = expiryTime - now;

        if (timeUntilExpiry <= 120000) {
          //console.log('⚠️ Token expiring soon, refreshing...');
          await performTokenRefresh();
        } else {
          //console.log('✅ Token valid, scheduling refresh');
          scheduleTokenRefresh();
        }
      } catch (error) {
        //console.error('❌ Error validating token');
        clearTokens();
        // ✅ مفيش redirect هنا برضو
      }
    };

    const scheduleTokenRefresh = () => {
      const token = getAccessToken();
      if (!token) return;

      try {
        const decoded: any = jwtDecode(token);
        const expiryTime = decoded.exp * 1000;
        const now = Date.now();
        const timeUntilExpiry = expiryTime - now;
        const refreshTime = timeUntilExpiry - 120000;

        if (refreshTime <= 0) {
          performTokenRefresh();
          return;
        }

        if (refreshTimerRef.current) {
          clearTimeout(refreshTimerRef.current);
        }

        refreshTimerRef.current = setTimeout(() => {
          performTokenRefresh();
        }, refreshTime);
      } catch (error) {
        //console.error('❌ Error scheduling refresh');
      }
    };

    const performTokenRefresh = async () => {
      const refreshToken = getRefreshToken();
      
      if (!refreshToken) {
        //console.log('❌ No refresh token');
        clearTokens();
        return; // ✅ مفيش redirect
      }

      try {
        const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL;
        const response = await axios.post(`${baseURL}/v1/Auth/refresh`, {
          refreshToken
        });

        if (response.data.success) {
          const { accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data;
          
          saveTokens(newAccessToken, newRefreshToken);
          //console.log('✅ Token refreshed');
          
          window.dispatchEvent(new CustomEvent('tokenRefreshed', { 
            detail: { accessToken: newAccessToken } 
          }));

          scheduleTokenRefresh();
        }
      } catch (error) {
        //console.error('❌ Token refresh failed');
        clearTokens();
        // ✅ مفيش redirect
      }
    };

    initializeTokenRefresh();

    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
      isInitializedRef.current = false;
    };
  }, []);
};