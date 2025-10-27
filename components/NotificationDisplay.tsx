'use client';

import { useSignalR } from '@/context/SignalRContext';
import { X, Package } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function NotificationDisplay() {
  const { latestNotification } = useSignalR();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (latestNotification) {
      setIsVisible(true);
    }
  }, [latestNotification]);

  if (!latestNotification || !isVisible) return null;

  return (
    // ١. تم تعديل الكلاسات هنا ليظهر المكون في المنتصف
   <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in-0 slide-in-from-top-10 w-[380px]">
      <div className="bg-card rounded-lg p-4 border shadow-2xl">
        <div className="flex items-start gap-4">
          {/* الأيقونة */}
          <div className="bg-primary/10 p-2 rounded-full flex-shrink-0 mt-1">
            <Package className="w-6 h-6 text-primary" />
          </div>

          {/* المحتوى */}
          <div className="flex-1">
            <h4 className="font-bold text-lg text-card-foreground">طلب جديد!</h4>
            <p className="text-sm text-muted-foreground mt-1">
              {latestNotification.message}
            </p>
            
            {/* ٢. تم تعديل هذا الجزء لعرض العناصر والسعر فوق بعضهما */}
            <div className="text-sm text-card-foreground mt-3 flex flex-col gap-1">
              <span>
                <strong>عدد العناصر:</strong> {latestNotification.itemCount}
              </span>
              <span>
                <strong>المبلغ الإجمالي:</strong> {latestNotification.totalAmount.toFixed(2)} د.ع
              </span>
            </div>
          </div>

          {/* ٣. زر الإغلاق */}
          <button 
            onClick={() => setIsVisible(false)} 
            className="text-muted-foreground hover:text-foreground absolute top-3 left-3"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}