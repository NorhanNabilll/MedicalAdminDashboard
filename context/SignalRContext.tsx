'use client';

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import * as signalR from '@microsoft/signalr';
import { getAccessToken } from '@/lib/api/tokenService';

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
  const isConnectingRef = useRef(false);

  const registerOrderCallback = (callback: () => void) => {
    orderCallbackRef.current = callback;
  };

  useEffect(() => {
    if (connectionRef.current || isConnectingRef.current) {
      console.log('⏭️ Connection already exists or connecting, skipping...');
      return;
    }

    const adminData = localStorage.getItem('admin');
    if (!adminData) {
      console.log('⏳ No admin data found');
      return;
    }

    try {
      const admin = JSON.parse(adminData);
      const permissions = admin.permissions || [];
      
      if (!permissions.includes('Orders.View')) {
        console.log('❌ Admin does not have Orders.View permission - skipping SignalR connection');
        return;
      }

      console.log('✅ Admin has Orders.View permission - connecting to SignalR...');

    } catch (error) {
      console.error('Error parsing admin data:', error);
      return;
    }

    isConnectingRef.current = true;

    const newConnection = new signalR.HubConnectionBuilder()
      .withUrl('https://localhost:7292/notificationHub', {
        accessTokenFactory: () => {
          // ✅ دايماً يجيب الـ token الحالي من localStorage
          const token = getAccessToken();
          if (!token) {
            console.error('❌ No token available');
            return '';
          }
          return token;
        },
        transport: signalR.HttpTransportType.WebSockets | 
                   signalR.HttpTransportType.ServerSentEvents | 
                   signalR.HttpTransportType.LongPolling
      })
      .withAutomaticReconnect({
        nextRetryDelayInMilliseconds: (retryContext) => {
          if (retryContext.previousRetryCount === 0) return 0;
          if (retryContext.previousRetryCount === 1) return 2000;
          if (retryContext.previousRetryCount === 2) return 10000;
          return 30000;
        }
      })
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    newConnection.onreconnecting((error) => {
      console.log('🔄 SignalR reconnecting...', error?.message);
      setIsConnected(false);
    });

    newConnection.onreconnected((connectionId) => {
      console.log('✅ SignalR reconnected:', connectionId);
      setIsConnected(true);
    });

    newConnection.onclose((error) => {
      console.log('🔌 SignalR connection closed:', error?.message);
      setIsConnected(false);
      isConnectingRef.current = false;
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
        await newConnection.start();
        console.log('✅ SignalR Connected successfully!');
        setIsConnected(true);
        isConnectingRef.current = false;
      } catch (err: any) {
        console.error('❌ SignalR Connection Error:', err);
        isConnectingRef.current = false;
      }
    };

    connectionRef.current = newConnection;
    startConnection();

    // ✅ التغيير الوحيد هنا: مش بنعمل reconnect فوراً
    const handleTokenRefresh = async () => {
      console.log('🔑 Token refreshed in background');
      
      if (!connectionRef.current) return;

      const currentState = connectionRef.current.state;
      
      // ✅ لو الـ connection شغالة، مش محتاج نعمل حاجة
      if (currentState === signalR.HubConnectionState.Connected) {
        console.log('ℹ️ Connection is active, will use new token on next auto-reconnect');
        return; // ← هنا التغيير: مش بنعمل reconnect!
      }
      
      // ✅ لو الـ connection مقطوعة، حاول تتصل بالـ token الجديد
      if (currentState === signalR.HubConnectionState.Disconnected) {
        console.log('🔄 Connection was disconnected, reconnecting with new token...');
        try {
          await connectionRef.current.start();
          console.log('✅ Reconnected successfully with new token');
          setIsConnected(true);
        } catch (err) {
          console.error('❌ Failed to reconnect:', err);
          setIsConnected(false);
        }
      }
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