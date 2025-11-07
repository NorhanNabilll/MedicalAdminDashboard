'use client';

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import * as signalR from '@microsoft/signalr';
import { getAccessToken, getRefreshToken } from '@/lib/api/tokenService';

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
  
  const orderCallbackRef = useRef<(() => void) | null>(null);
  const connectionRef = useRef<signalR.HubConnection | null>(null);
  const hasAttemptedRef = useRef(false);

  const registerOrderCallback = (callback: () => void) => {
    orderCallbackRef.current = callback;
  };

  useEffect(() => {
    //  لو جربنا نتصل قبل كده، متجربش تاني
    if (hasAttemptedRef.current) {
      return;
    }

    //  انتظر شوية عشان الـ useTokenRefresh يخلص
    const initTimer = setTimeout(() => {
      //  فحص بسيط: في tokens؟
      const token = getAccessToken();
      const refreshToken = getRefreshToken();
      
      if (!token || !refreshToken) {
        console.log(' No tokens - skipping SignalR');
        hasAttemptedRef.current = true;
        return;
      }

      // ✅ فحص الـ permissions
      const adminData = localStorage.getItem('admin');
      if (!adminData) {
        console.log('ℹ️ No admin data');
        hasAttemptedRef.current = true;
        return;
      }

      try {
        const admin = JSON.parse(adminData);
        if (!admin.permissions?.includes('Orders.View')) {
          console.log('ℹ️ No Orders.View permission');
          hasAttemptedRef.current = true;
          return;
        }
      } catch (error) {
        console.error('Error parsing admin:', error);
        hasAttemptedRef.current = true;
        return;
      }

      // ✅ كل حاجة تمام - نبدأ الاتصال
      hasAttemptedRef.current = true;
      startSignalR();
    }, 1000); // ✅ انتظار ثانية واحدة

    return () => clearTimeout(initTimer);
  }, []);

  const startSignalR = () => {
    if (connectionRef.current) {
      return;
    }

    console.log('🔌 Starting SignalR...');

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(`${process.env.NEXT_PUBLIC_API_HOST}/notificationHub`, {
        accessTokenFactory: () => getAccessToken() || '',
        transport: signalR.HttpTransportType.WebSockets | 
                   signalR.HttpTransportType.ServerSentEvents | 
                   signalR.HttpTransportType.LongPolling
      })
      .withAutomaticReconnect([0, 2000, 10000, 30000]) // ✅ 4 محاولات بس
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    connection.onreconnecting(() => {
      console.log('🔄 Reconnecting...');
      setIsConnected(false);
    });

    connection.onreconnected(() => {
      console.log('✅ Reconnected');
      setIsConnected(true);
    });

    connection.onclose((error) => {
      console.log('🔌 Connection closed');
      setIsConnected(false);
      
      // ✅ لو 401، استنى tokenRefreshed
      if (error?.message?.includes('401')) {
        console.log('🔒 Waiting for token refresh...');
      }
    });

    connection.on('ReceiveOrderNotification', (notification: OrderNotification) => {
      console.log('🔔 Notification:', notification);
      setLatestNotification(notification);

      try {
        new Audio('/notification-sound.mp3').play().catch(() => {});
      } catch (e) {}

    //  if (orderCallbackRef.current) {
     //   orderCallbackRef.current();
    //  }

    window.dispatchEvent(new CustomEvent('ordersUpdated', { detail: notification }));

      setTimeout(() => setLatestNotification(null), 5000);
    });

    connectionRef.current = connection;

    // ✅ محاولة الاتصال
    connection.start()
      .then(() => {
        console.log('✅ SignalR Connected');
        setIsConnected(true);
      })
      .catch((err) => {
        console.error('❌ Connection failed:', err.message);
        setIsConnected(false);
      });
  };
/*
  // ✅ لما الـ token يتحدث، اعمل reconnect
  useEffect(() => {
    const handleTokenRefresh = async () => {
      console.log('🔄 Token refreshed');
      
      const connection = connectionRef.current;
      if (!connection) return;

      if (connection.state === signalR.HubConnectionState.Connected) {
        try {
          await connection.stop();
          await new Promise(resolve => setTimeout(resolve, 100));
          await connection.start();
          console.log('✅ Reconnected with new token');
          setIsConnected(true);
        } catch (err) {
          console.error('❌ Reconnect failed:', err);
        }
      }
    };

    window.addEventListener('tokenRefreshed', handleTokenRefresh);
    return () => window.removeEventListener('tokenRefreshed', handleTokenRefresh);
  }, []);
*/
  // ✅ Cleanup
  useEffect(() => {
    return () => {
      if (connectionRef.current) {
        connectionRef.current.stop();
      }
    };
  }, []);

  return (
    <SignalRContext.Provider 
      value={{ 
        isConnected, 
        latestNotification, 
        registerOrderCallback
      }}
    >
      {children}
    </SignalRContext.Provider>
  );
};