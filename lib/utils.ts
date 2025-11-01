import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


export function formatDateArabic(utcDateString: string): string {
  // 1. قم بإنشاء كائن تاريخ من النص القادم من الـ API
  //const date = new Date(utcDateString);
  // أضيفي Z في الآخر عشان JavaScript يفهم إنه UTC
  const date = new Date(utcDateString.endsWith('Z') ? utcDateString : utcDateString + 'Z');
  const now = new Date();

  // 2. احسب الفرق بالمللي ثانية مباشرة. كائنات التاريخ في JS تعرف أنها UTC.
  const diffInMs = now.getTime() - date.getTime();
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));

  // 3. منطق العرض النسبي (يبقى كما هو لأنه صحيح)
  if (diffInHours < 24 && diffInHours >= 0) {
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    if (diffInMinutes < 1) {
      return "الآن";
    } else if (diffInMinutes < 60) {
      return `منذ ${diffInMinutes} ${diffInMinutes === 1 ? "دقيقة" : diffInMinutes === 2 ? "دقيقتين" : "دقائق"}`;
    } else {
      return `منذ ${diffInHours} ${diffInHours === 1 ? "ساعة" : diffInHours === 2 ? "ساعتين" : "ساعات"}`;
    }
  }

  // 4. منطق العرض المطلق (الآن أصبح بسيطًا وصحيحًا)
  // نحن نمرر التاريخ الأصلي، و toLocaleDateString تقوم بكل التحويلات
  return date.toLocaleDateString("ar-EG", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Baghdad", // هي التي ستقوم بالتحويل لتوقيت العراق
    numberingSystem: 'latn' // لعرض الأرقام 1, 2, 3
  });
}



