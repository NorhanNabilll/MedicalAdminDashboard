import Link from 'next/link'
import { Button } from '@/components/ui/button' 

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="text-center px-6" dir="rtl">
        <div className="mb-8">
         
          <h1 className="text-9xl font-bold text-primary mb-4">404</h1>
          <div className="h-1 w-32 bg-primary mx-auto mb-8"></div>
        </div>
        
    
        <h2 className="text-3xl font-semibold text-foreground mb-4">
          الصفحة غير موجودة
        </h2>
        
       
        <p className="text-muted-foreground mb-8 max-w-md mx-auto">
          عذراً، الصفحة التي تبحث عنها غير موجودة أو تم نقلها إلى موقع آخر.
        </p>
        
        
        <Button asChild>
          <Link href="/">
            العودة للصفحة الرئيسية
          </Link>
        </Button>
      </div>
    </div>
  )
}