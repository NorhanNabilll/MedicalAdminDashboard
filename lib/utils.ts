import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatNumberEnglish(num: number | string): string {
  const numStr = num.toString()
  // Replace Arabic-Indic digits (٠-٩) with Western Arabic numerals (0-9)
  return numStr.replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d).toString())
}
/*
export function formatDateArabic(dateString: string): string {
  // The API sends dates in Iraq local time without timezone indicator
  // We need to parse it as Iraq timezone (UTC+3)
 
  // Parse the date string and treat it as Iraq timezone
  const date = new Date(dateString)

  // Get current time in Iraq timezone
  const now = new Date()
  const iraqOffset = 3 * 60 * 60 * 1000 // Iraq is UTC+3 (3 hours in milliseconds)

  // Convert both dates to Iraq timezone for comparison
  // The API date is already in Iraq time, so we add the offset to treat it correctly
  const iraqDate = new Date(date.getTime() + iraqOffset)
  const iraqNow = new Date(now.getTime() + now.getTimezoneOffset() * 60 * 1000 + iraqOffset)

  // Calculate difference in milliseconds
  const diffInMs = iraqNow.getTime() - iraqDate.getTime()
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60))
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60))

  // If less than 24 hours, show relative time
  if (diffInHours < 24 && diffInHours >= 0) {
    if (diffInMinutes < 1) {
      return "الآن"
    } else if (diffInMinutes < 60) {
      return `منذ ${formatNumberEnglish(diffInMinutes)} ${diffInMinutes === 1 ? "دقيقة" : diffInMinutes === 2 ? "دقيقتين" : "دقائق"}`
    } else {
      return `منذ ${formatNumberEnglish(diffInHours)} ${diffInHours === 1 ? "ساعة" : diffInHours === 2 ? "ساعتين" : "ساعات"}`
    }
  }

  // Otherwise, show full date in Arabic with English numbers using Iraq timezone
  const formattedDate = iraqDate.toLocaleDateString("ar-EG", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Baghdad",
  })

  // Ensure numbers in the formatted date are in English
  return formatNumberEnglish(formattedDate)
}
*/
export function formatDateArabic(utcDateString: string): string {
  // 1. قم بإنشاء كائن تاريخ من النص القادم من الـ API
  const date = new Date(utcDateString);
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
export function formatCurrencyEnglish(amount: number): string {
  return formatNumberEnglish(amount.toString())
}
