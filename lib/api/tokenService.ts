/**
 * يحفظ توكن الوصول وتوكن التجديد في التخزين المحلي.
 * @param {string} accessToken - توكن الوصول.
 * @param {string} refreshToken - توكن التجديد.
 */
export const saveTokens = (accessToken: string, refreshToken: string): void => {
  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('refreshToken', refreshToken);
};

/**
 * يسترجع توكن الوصول من التخزين المحلي.
 * @returns {string|null} توكن الوصول أو null إذا لم يتم العثور عليه.
 */
export const getAccessToken = (): string | null => {
  return localStorage.getItem('accessToken');
};

/**
 * يسترجع توكن التجديد من التخزين المحلي.
 * @returns {string|null} توكن التجديد أو null إذا لم يتم العثور عليه.
 */
export const getRefreshToken = (): string | null => {
  return localStorage.getItem('refreshToken');
};

/**
 * يحذف كل توكنات المصادقة وبيانات المستخدم من التخزين المحلي.
 */
export const clearTokens = (): void => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('admin'); // حذف بيانات الأدمن المخزنة أيضًا
};
