import { apiClient } from "./axios-config";
import { saveTokens, clearTokens } from "./tokenService";
import { jwtDecode } from "jwt-decode";

// تعريف أنواع البيانات
export interface AdminData {
  id: string;
  fullName: string;
  email: string;
  roles: string[];
}

export interface LoginResponseData {
  accessToken: string;
  refreshToken: string;
  admin: AdminData;
}

export interface MfaRequiredResponse {
  requiresMFA: true;
  tempToken: string;
  email: string;
}

/**
 * دالة تسجيل الدخول.
 */
export async function login(email: string, password: string, recaptchaToken: string) {
  try {
    // (4) عدّلنا النوع المتوقع هنا لـ MfaRequiredResponse
    const response = await apiClient.post<{ success: boolean; message: string; data: MfaRequiredResponse }>(
        "/v1/AdminAuth/login", 
        { email, password, recaptchaToken }
    );
    
    if (response.data.success && response.data.data.requiresMFA) {
      // (5) مبقناش بنسجل توكنز هنا
      // (كل اللي بنعمله إننا بنرجع الداتا للـ UI عشان يعرض فورم الكود)
      return { 
        success: true, 
        requiresMFA: true, 
        data: response.data.data // (هنا الـ tempToken والإيميل)
      };
    } else {
      // لو الرد نجح بس مرجعش (requiresMFA)، يبقى فيه حاجة غلط
      throw new Error(response.data.message || 'Login response was not in the expected format.');
    }
  } catch (error) {
    throw error;
  }
};

export async function verifyMfa(tempToken: string, code: string) {
  try {
    // (بنكلم الـ Endpoint الجديد بتاع التحقق)
    const response = await apiClient.post<{ success: boolean; message: string; data: LoginResponseData }>(
      "/v1/AdminAuth/verify-mfa",
      { tempToken, code }
    );

    if (response.data.success) {
      // (7) هنا بقى بيحصل اللوجن الحقيقي
      // (ده الكود اللي "كان" جوه دالة اللوجن القديمة)
      const { accessToken, refreshToken, admin } = response.data.data;
      
      saveTokens(accessToken, refreshToken); // <-- حفظ التوكنز
      try {
        const decodedToken: { Permission: string[] } = jwtDecode(accessToken);
        const permissions = decodedToken.Permission || [];
        localStorage.setItem('admin', JSON.stringify({ ...admin, permissions })); // <-- حفظ بيانات الأدمن
      } catch (e) {
        console.error("Error decoding token:", e);
        localStorage.setItem('admin', JSON.stringify({ ...admin, permissions: [] }));
      }
      
      return { success: true, data: admin };
    } else {
      throw new Error(response.data.message || 'فشل التحقق من الكود');
    }

  } catch (error) {
    throw error;
  }
}

/**
 * Logs the user out by revoking the refresh token on the server
 * and then clearing local tokens.
 */
export const logout = async () => {
  const refreshToken =  localStorage.getItem('refreshToken');

  try {
    if (refreshToken) {
      // Call the backend endpoint to invalidate the refresh token
      await apiClient.post("/v1/Auth/logout", { refreshToken });
    }
  } catch (error) {
    console.error("Logout API call failed, but clearing tokens anyway.", error);
  } finally {
    // Always clear tokens from localStorage, even if the API call fails
    clearTokens();
    // Redirect to the login page
    window.location.href = '/login';
  }
};

/**
 * دالة طلب إعادة تعيين كلمة المرور.
 */
export async function forgotPassword(email: string) {
  try {
    const response = await apiClient.post("/v1/AdminAuth/forgot-password", { email });
    if (!response.data.success) {
      throw new Error(response.data.message || "فشل إرسال طلب إعادة التعيين.");
    }
    return response.data;
  } catch (error) {
    throw error;
  }
}
/**
 * يقوم بتسجيل خروج المستخدم من جميع الأجهزة.
 * يُستخدم هذا بعد تغيير كلمة المرور أو البريد الإلكتروني.
 */
export async function logoutFromAllDevices() {
  try {
    // هذا الطلب لا يحتاج إلى body، فقط يحتاج إلى توكن الوصول
    const response = await apiClient.post("/v1/Auth/logout-from-all-devices");
    
    if (!response.data.success) {
      throw new Error(response.data.message || "فشل تسجيل الخروج من جميع الأجهزة.");
    }
    
    console.log("Successfully logged out from all devices.");
    return response.data;

  } catch (error) {
    console.error("Logout from all devices failed:", error);
    // حتى لو فشل هذا الطلب، يجب أن نكمل عملية تسجيل الخروج الحالية
    throw error;
  }finally {
    // Always clear tokens from localStorage, even if the API call fails
    clearTokens();
    // Redirect to the login page
    window.location.href = '/login';
  }
}
/**
 * دالة إعادة تعيين كلمة المرور الجديدة.
 */
export async function resetPassword(data: { email: string; token: string; newPassword: string }) {
  try {
    const response = await apiClient.post("/v1/AdminAuth/reset-password", data);
    if (!response.data.success) {
      throw new Error(response.data.message || "فشل إعادة تعيين كلمة المرور.");
    }
    return response.data;
  } catch (error) {
    throw error;
  }
}
