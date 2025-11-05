'use client';

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import * as signalR from '@microsoft/signalr';
import { getAccessToken } from '@/lib/api/tokenService';
import { jwtDecode } from 'jwt-decode';

interface OrderNotification {
  orderId: number;
  orderNumber: string;
  customerName: string;
  totalAmount: number;
  itemCount: number;
  timestamp: string;
  message: string;
}

interface SignalRContextType {
  isConnected: boolean;
  latestNotification: OrderNotification | null;
  registerOrderCallback: (callback: () => void) => void;
  connectionError: string | null; // ✅ إضافة error state
}

const SignalRContext = createContext<SignalRContextType | undefined>(undefined);

export const useSignalR = () => {
  const context = useContext(SignalRContext);
  if (!context) {
    throw new Error('useSignalR must be used within SignalRProvider');
  }
  return context;
};

export const SignalRProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [latestNotification, setLatestNotification] = useState<OrderNotification | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null); // ✅ حالة الأخطاء
  
  const orderCallbackRef = useRef<(() => void) | null>(null);
  const connectionRef = useRef<signalR.HubConnection | null>(null);
  const isConnectingRef = useRef(false);
  const connectionAttemptsRef = useRef(0); // ✅ عدد محاولات الاتصال
  const maxConnectionAttempts = 3; // ✅ أقصى عدد محاولات

  const registerOrderCallback = (callback: () => void) => {
    orderCallbackRef.current = callback;
  };

  useEffect(() => {
    if (connectionRef.current || isConnectingRef.current) {
      console.log('⏭️ Connection already exists or connecting, skipping...');
      return;
    }

    // ✅ فحص الـ token قبل محاولة الاتصال
    const token = getAccessToken();
    if (!token) {
      console.log('❌ No access token found, skipping SignalR connection');
      setConnectionError('لا يوجد توكن وصول. يرجى تسجيل الدخول مرة أخرى.');
      return;
    }

    // ✅ فحص صلاحية الـ token
    try {
      const decoded: any = jwtDecode(token);
      const expiryTime = decoded.exp * 1000;
      const now = Date.now();
      
      if (expiryTime <= now) {
        console.log('⚠️ Access token expired, waiting for refresh...');
        setConnectionError('جاري تحديث الجلسة...');
        
        // ✅ انتظار حدث tokenRefreshed
        const handleTokenRefreshed = () => {
          console.log('✅ Token refreshed, retrying SignalR connection...');
          setConnectionError(null);
          window.removeEventListener('tokenRefreshed', handleTokenRefreshed);
          // إعادة تشغيل الـ effect
          window.location.reload();
        };
        
        window.addEventListener('tokenRefreshed', handleTokenRefreshed);
        return;
      }
    } catch (error) {
      console.error('❌ Error validating token:', error);
      setConnectionError('خطأ في التحقق من الجلسة');
      return;
    }

    const adminData = localStorage.getItem('admin');
    if (!adminData) {
      console.log('⏳ No admin data found');
      setConnectionError(null); // ✅ مش خطأ، المستخدم ببساطة مش مسجل دخول
      return;
    }

    try {
      const admin = JSON.parse(adminData);
      const permissions = admin.permissions || [];
      
      if (!permissions.includes('Orders.View')) {
        console.log('ℹ️ Admin does not have Orders.View permission - skipping SignalR connection');
        setConnectionError(null); // ✅ مش خطأ، المستخدم مش محتاج SignalR
        return;
      }

      console.log('✅ Admin has Orders.View permission - connecting to SignalR...');

    } catch (error) {
      console.error('❌ Error parsing admin data:', error);
      setConnectionError('خطأ في قراءة بيانات المستخدم');
      return;
    }

    isConnectingRef.current = true;
    setConnectionError(null); // ✅ إعادة تعيين الخطأ قبل المحاولة

    const newConnection = new signalR.HubConnectionBuilder()
      .withUrl(`${process.env.NEXT_PUBLIC_API_HOST}/notificationHub`, {
        accessTokenFactory: () => {
          const token = getAccessToken();
          if (!token) {
            console.error('❌ No token available in accessTokenFactory');
            return '';
          }
          console.log('🔑 Providing access token to SignalR');
          return token;
        },
        transport: signalR.HttpTransportType.WebSockets | 
                   signalR.HttpTransportType.ServerSentEvents | 
                   signalR.HttpTransportType.LongPolling
      })
      .withAutomaticReconnect({
        nextRetryDelayInMilliseconds: (retryContext) => {
          console.log(`🔄 SignalR auto-reconnect attempt ${retryContext.previousRetryCount + 1}`);
          
          if (retryContext.previousRetryCount === 0) return 0;
          if (retryContext.previousRetryCount === 1) return 2000;
          if (retryContext.previousRetryCount === 2) return 10000;
          
          // ✅ إيقاف المحاولات بعد 3 محاولات
          if (retryContext.previousRetryCount >= maxConnectionAttempts) {
            console.log('❌ Max reconnection attempts reached');
            setConnectionError('فشل الاتصال بالخادم بعد عدة محاولات');
            return null; // إيقاف المحاولات
          }
          
          return 30000;
        }
      })
      .configureLogging(signalR.LogLevel.Information)
      .build();

    newConnection.onreconnecting((error) => {
      console.log('🔄 SignalR reconnecting...', error?.message);
      setIsConnected(false);
      setConnectionError('جاري إعادة الاتصال...');
      connectionAttemptsRef.current += 1;
    });

    newConnection.onreconnected((connectionId) => {
      console.log('✅ SignalR reconnected:', connectionId);
      setIsConnected(true);
      setConnectionError(null);
      connectionAttemptsRef.current = 0; // ✅ إعادة تعيين العداد
    });

    newConnection.onclose((error) => {
      console.log('🔌 SignalR connection closed:', error?.message);
      setIsConnected(false);
      isConnectingRef.current = false;
      
      // ✅ فحص السبب وإظهار رسالة مناسبة
      if (error) {
        console.error('❌ Connection closed with error:', error);
        
        // ✅ فحص نوع الخطأ
        if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
          setConnectionError('انتهت صلاحية الجلسة. جاري التحديث...');
          
          // ✅ محاولة refresh
          const token = getAccessToken();
          if (token) {
            try {
              const decoded: any = jwtDecode(token);
              const isExpired = (decoded.exp * 1000) <= Date.now();
              
              if (isExpired) {
                console.log('⚠️ Token expired, waiting for refresh...');
                // الـ useTokenRefresh Hook هيتولى الموضوع
              }
            } catch (e) {
              console.error('Error checking token:', e);
            }
          }
        } else if (connectionAttemptsRef.current >= maxConnectionAttempts) {
          setConnectionError('فشل الاتصال. يرجى التحقق من اتصال الإنترنت والمحاولة لاحقاً.');
        } else {
          setConnectionError('انقطع الاتصال بالخادم');
        }
      } else {
        console.log('ℹ️ Connection closed normally');
        setConnectionError(null);
      }
    });

    newConnection.on('ReceiveOrderNotification', (notification: OrderNotification) => {
      console.log('🔔 New order notification received:', notification);
      
      setLatestNotification(notification);

      try {
        const audio = new Audio('/notification-sound.mp3');
        audio.play().catch(e => console.log('Could not play sound:', e));
      } catch (e) {
        console.log('Audio error:', e);
      }

      if (orderCallbackRef.current) {
        orderCallbackRef.current();
      }

      setTimeout(() => {
        setLatestNotification(null);
      }, 5000);
    });

    const startConnection = async () => {
      try {
        console.log('🔌 Attempting to connect to SignalR...');
        await newConnection.start();
        console.log('✅ SignalR Connected successfully!');
        setIsConnected(true);
        setConnectionError(null);
        connectionAttemptsRef.current = 0;
        isConnectingRef.current = false;
      } catch (err: any) {
        console.error('❌ SignalR Connection Error:', err);
        connectionAttemptsRef.current += 1;
        isConnectingRef.current = false;
        
        // ✅ تحليل نوع الخطأ
        if (err.message?.includes('401') || err.message?.includes('Unauthorized')) {
          setConnectionError('خطأ في المصادقة. جاري تحديث الجلسة...');
        } else if (err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')) {
          setConnectionError('خطأ في الاتصال بالشبكة. يرجى التحقق من اتصال الإنترنت.');
        } else if (connectionAttemptsRef.current >= maxConnectionAttempts) {
          setConnectionError('فشل الاتصال بالخادم بعد عدة محاولات. يرجى المحاولة لاحقاً.');
        } else {
          setConnectionError(`فشل الاتصال: ${err.message}`);
        }
      }
    };

    connectionRef.current = newConnection;
    startConnection();

    // ✅ معالج حدث tokenRefreshed
    const handleTokenRefresh = async () => {
      console.log('🔄 Token refreshed, updating SignalR connection...');
      
      if (!connectionRef.current) {
        console.log('⚠️ No connection reference found');
        return;
      }

      const currentState = connectionRef.current.state;
      console.log('📊 Current connection state:', signalR.HubConnectionState[currentState]);
      
      // ✅ حتى لو الـ connection شغالة، لازم نعمل reconnect عشان نستخدم الـ token الجديد
      if (currentState === signalR.HubConnectionState.Connected) {
        console.log('🔌 Active connection detected, performing graceful reconnect...');
        setConnectionError('جاري تحديث الاتصال...');
        
        try {
          await connectionRef.current.stop();
          console.log('✅ Connection stopped successfully');
          
          await new Promise(resolve => setTimeout(resolve, 100));
          
          console.log('🔄 Reconnecting with new token...');
          await connectionRef.current.start();
          console.log('✅ Reconnected successfully with new token');
          setIsConnected(true);
          setConnectionError(null);
          connectionAttemptsRef.current = 0;
        } catch (err: any) {
          console.error('❌ Failed to reconnect:', err);
          setIsConnected(false);
          setConnectionError('فشل إعادة الاتصال');
          
          // ✅ محاولة إعادة الاتصال بعد 5 ثوانٍ
          setTimeout(async () => {
            if (connectionAttemptsRef.current < maxConnectionAttempts) {
              console.log('🔄 Retrying connection...');
              connectionAttemptsRef.current += 1;
              setConnectionError('جاري إعادة المحاولة...');
              
              try {
                await connectionRef.current?.start();
                setIsConnected(true);
                setConnectionError(null);
                connectionAttemptsRef.current = 0;
                console.log('✅ Retry successful');
              } catch (retryErr) {
                console.error('❌ Retry failed:', retryErr);
                setConnectionError('فشل إعادة الاتصال');
              }
            } else {
              setConnectionError('فشل الاتصال بعد عدة محاولات');
            }
          }, 5000);
        }
        return;
      }
      
      // لو الـ connection مقطوعة، حاول تعيد الاتصال
      if (currentState === signalR.HubConnectionState.Disconnected) {
        console.log('🔄 Connection was disconnected, reconnecting with new token...');
        setConnectionError('جاري إعادة الاتصال...');
        
        try {
          await connectionRef.current.start();
          console.log('✅ Reconnected successfully');
          setIsConnected(true);
          setConnectionError(null);
          connectionAttemptsRef.current = 0;
        } catch (err: any) {
          console.error('❌ Failed to reconnect:', err);
          setIsConnected(false);
          setConnectionError('فشل إعادة الاتصال');
        }
        return;
      }
      
      console.log('ℹ️ Connection is in transition state, waiting for it to stabilize...');
    };

    window.addEventListener('tokenRefreshed', handleTokenRefresh);

    return () => {
      console.log('🧹 Cleaning up SignalR connection...');
      window.removeEventListener('tokenRefreshed', handleTokenRefresh);
      
      if (connectionRef.current) {
        connectionRef.current.stop();
        connectionRef.current = null;
      }
      isConnectingRef.current = false;
      connectionAttemptsRef.current = 0;
    };
  }, []);

  return (
    <SignalRContext.Provider 
      value={{ 
        isConnected, 
        latestNotification, 
        registerOrderCallback,
        connectionError // ✅ إضافة error للـ context
      }}
    >
      {children}
    </SignalRContext.Provider>
  );
};