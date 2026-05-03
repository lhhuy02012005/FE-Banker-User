import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { v4 as uuidv4 } from 'uuid';

/**
 * 1. QUẢN LÝ DEVICE ID
 * Đảm bảo mỗi thiết bị có một ID duy nhất để khớp với UserDevice trong DB.
 */
export const getDeviceId = (): string => {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem('device_id');
  if (!id) {
    id = uuidv4();
    localStorage.setItem('device_id', id);
  }
  return id;
};

/**
 * 2. CẤU HÌNH INSTANCE CHÍNH
 */
const axiosClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_GATEWAY_URL || 'http://localhost',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Biến điều hướng hàng đợi refresh
let isRefreshing = false;
type FailedQueueItem = {
  resolve: (token: string | null) => void;
  reject: (error?: unknown) => void;
};

type RetryableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

let failedQueue: FailedQueueItem[] = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

/**
 * 3. REQUEST INTERCEPTOR
 * Tự động đính kèm Bearer Token và X-Device-Id vào mọi request.
 */
axiosClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const gatewayUrl = process.env.NEXT_PUBLIC_API_GATEWAY_URL || 'http://localhost';
    if (config.url && /^\d/.test(config.url)) {
       config.url = `${gatewayUrl}:${config.url}`;
    } else if (config.url && config.url.startsWith(':')) {
       config.url = `${gatewayUrl}${config.url}`;
    } else if (config.url && config.url.startsWith('/')) {
       config.url = `${gatewayUrl}${config.url}`;
    }

    const requestUrl = String(config.url || '');
    const isPublicAuthRequest =
      requestUrl.includes('/v1/auth/login') ||
      requestUrl.includes('/v1/auth/register') ||
      requestUrl.includes('/v1/auth/biometric-login') ||
      requestUrl.includes('/v1/auth/refresh');
    
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token && !isPublicAuthRequest) {
        config.headers.Authorization = `Bearer ${token}`;
      } else if (config.headers.Authorization) {
        delete config.headers.Authorization;
      }
      // Gửi Device ID qua Header (chuẩn Gateway)
      config.headers['X-Device-Id'] = getDeviceId();
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * 4. RESPONSE INTERCEPTOR
 * Xử lý tự động Refresh Token khi nhận lỗi 401.
 */
axiosClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableRequestConfig;
    const requestUrl = originalRequest.url || '';

    // --- CHỐT CHẶN 1: TRÁNH VÒNG LẶP CHO LUỒNG AUTH/ACTIVATE ---
    // Nếu lỗi 401 xảy ra tại các API login, refresh, activate, verify 
    // thì không thực hiện Refresh Token nữa mà trả lỗi thẳng cho UI xử lý.
    const isAuthFlow = 
      requestUrl.includes('/v1/auth/login') ||
      requestUrl.includes('/v1/auth/refresh') ||
      requestUrl.includes('/v1/auth/activate') ||
      requestUrl.includes('/v1/auth/verify');

    if (error.response?.status === 401 && isAuthFlow) {
      return Promise.reject(error);
    }

    // --- CHỐT CHẶN 2: LOGIC REFRESH TOKEN TỰ ĐỘNG ---
    if (error.response?.status === 401 && !originalRequest._retry) {
      
      // Nếu đang có một request khác thực hiện refresh rồi, thì đưa request này vào hàng đợi
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return axiosClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        const fcmToken = localStorage.getItem('fcmToken') || '';
        const deviceId = getDeviceId();
        
        // Cấu hình URL cho Refresh (Giữ nguyên logic URL của Huy)
        const identityPrefix = process.env.NEXT_PUBLIC_IDENTITY_SERVICE_PREFIX || '8080/api';
        const identityPort = process.env.NEXT_PUBLIC_IDENTITY_PORT || '8080';
        const gatewayUrl = process.env.NEXT_PUBLIC_API_GATEWAY_URL || 'http://localhost';

        const hasEnvPlaceholder = identityPrefix.includes('${') || identityPrefix.includes('$');
        const effectiveIdentityPrefix = hasEnvPlaceholder ? `:${identityPort}/api` : identityPrefix;

        const refreshUrl = effectiveIdentityPrefix.startsWith(':')
          ? `${gatewayUrl}${effectiveIdentityPrefix}/v1/auth/refresh`
          : effectiveIdentityPrefix.startsWith('/') 
            ? `${gatewayUrl}${effectiveIdentityPrefix}/v1/auth/refresh`
            : `${gatewayUrl}:${effectiveIdentityPrefix}/v1/auth/refresh`;

        // Gọi API Refresh Token
        const res = await axios.post(refreshUrl, {
          refreshToken,
          deviceId: deviceId,
          fcmToken: fcmToken
        });

        const { accessToken, refreshToken: newRefreshToken } = res.data.data;

        // Lưu thông tin mới vào Storage
        localStorage.setItem('token', accessToken);
        localStorage.setItem('refreshToken', newRefreshToken);

        // Cập nhật Authorization cho instance và giải phóng hàng đợi
        axiosClient.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
        processQueue(null, accessToken);

        // Thực hiện lại request ban đầu với token mới vừa lấy được
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return axiosClient(originalRequest);

      } catch (refreshError) {
        // Nếu refresh thất bại (VD: Refresh token hết hạn) -> Xóa sạch session
        processQueue(refreshError, null);
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        
        // Huy có thể mở dòng dưới nếu muốn đá user về trang login ngay lập tức
        // if (typeof window !== 'undefined') window.location.href = '/auth/login';
        
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default axiosClient;