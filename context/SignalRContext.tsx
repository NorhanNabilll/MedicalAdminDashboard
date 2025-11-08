'use client';

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import * as signalR from '@microsoft/signalr';

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
    // ✅ بدون فحص tokens أو permissions - يبدأ مباشرة
    if (hasAttemptedRef.current) {
      return;
    }

    hasAttemptedRef.current = true;
    startSignalR();
  }, []);

  const startSignalR = () => {
    if (connectionRef.current) {
      return;
    }

    // ✅ بناء الاتصال بدون token
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(`${process.env.NEXT_PUBLIC_API_HOST}/notificationHub`, {
        // ✅ شيلنا accessTokenFactory خالص
        transport: signalR.HttpTransportType.WebSockets | 
                   signalR.HttpTransportType.ServerSentEvents | 
                   signalR.HttpTransportType.LongPolling
      })
      .withAutomaticReconnect([0, 2000, 10000, 30000])
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    connection.onreconnecting(() => {
      setIsConnected(false);
    });

    connection.onreconnected(() => {
      setIsConnected(true);
    });

    connection.onclose(() => {
      setIsConnected(false);
    });

    connection.on('ReceiveOrderNotification', (notification: OrderNotification) => {
      setLatestNotification(notification);

      try {
        new Audio('/notification-sound.mp3').play().catch(() => {});
      } catch (e) {}

      window.dispatchEvent(new CustomEvent('ordersUpdated', { detail: notification }));

      setTimeout(() => setLatestNotification(null), 5000);
    });

    connectionRef.current = connection;

    connection.start()
      .then(() => {
        setIsConnected(true);
      })
      .catch((err) => {
        console.error('Connection failed:', err.message);
        setIsConnected(false);
      });
  };

  // ✅ Page Visibility: لما المستخدم يرجع للصفحة، اعمل reconnect
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        const connection = connectionRef.current;
        
        if (connection && connection.state !== signalR.HubConnectionState.Connected) {
          try {
            if (connection.state !== signalR.HubConnectionState.Disconnected) {
              await connection.stop();
            }
            
            await new Promise(resolve => setTimeout(resolve, 500));
            
            await connection.start();
            setIsConnected(true);
          } catch (err) {
            console.error('Manual reconnect failed:', err);
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

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