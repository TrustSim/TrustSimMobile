import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { Config } from '../constants/Config';
import { appStorage } from './storage';
import { ApiResponse } from '../types';

export const apiClient = axios.create({
  baseURL: Config.API_BASE_URL,
  timeout: Config.TIMEOUT_MS,
  withCredentials: true, // Required to transmit HttpOnly refreshToken cookie
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  },
});

// Mutex & Promise Queue for safe Token Refresh without kick-out
let isRefreshing = false;
let failedQueue: {
  resolve: (token: string) => void;
  reject: (error: any) => void;
}[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((promise) => {
    if (token) {
      promise.resolve(token);
    } else {
      promise.reject(error);
    }
  });
  failedQueue = [];
};

// Event emitter callback for when session is terminated
let onSessionExpiredCallback: (() => void) | null = null;
export const setOnSessionExpired = (cb: () => void) => {
  onSessionExpiredCallback = cb;
};

// Request Interceptor: Attach Access Token & handle FormData
apiClient.interceptors.request.use(async (config) => {
  const token = await appStorage.getItem(Config.TOKEN_STORAGE_KEY);
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Handle FormData in React Native:
  // 1. Prevent Axios default transformRequest from serializing FormData into JSON string
  // 2. Strip 'Content-Type' so native networking layer (OkHttp / NSURLSession) automatically
  //    generates 'multipart/form-data; boundary=...'
  const isFormData =
    config.data instanceof FormData ||
    (config.data && typeof config.data === 'object' && '_parts' in config.data);

  if (isFormData) {
    config.transformRequest = [(data) => data];
    if (config.headers) {
      delete config.headers['Content-Type'];
      delete config.headers['content-type'];
      if (typeof (config.headers as any).delete === 'function') {
        (config.headers as any).delete('Content-Type');
        (config.headers as any).delete('content-type');
      }
    }
  }

  return config;
});

// Response Interceptor: Mutex Refresh Queue
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiResponse>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Check if error is 401 and request has not been retried yet
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/refresh-token') &&
      !originalRequest.url?.includes('/auth/login') &&
      !originalRequest.url?.includes('/auth/logout')
    ) {
      if (isRefreshing) {
        // Another request is already refreshing token -> Queue this request
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((newToken) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
            }
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      return new Promise(async (resolve, reject) => {
        try {
          // Send isolated refresh-token request
          const res = await axios.post<ApiResponse<{ token: string; expiresAt: string }>>(
            `${Config.API_BASE_URL}/auth/refresh-token`,
            {},
            {
              withCredentials: true,
              headers: { 'ngrok-skip-browser-warning': 'true' },
            }
          );

          const newToken = res.data?.data?.token;
          if (!newToken) {
            throw new Error('Không nhận được token mới từ server');
          }

          await appStorage.setItem(Config.TOKEN_STORAGE_KEY, newToken);
          apiClient.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;

          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
          }

          processQueue(null, newToken);
          resolve(apiClient(originalRequest));
        } catch (refreshErr) {
          processQueue(refreshErr, null);
          await appStorage.removeItem(Config.TOKEN_STORAGE_KEY);
          await appStorage.removeItem(Config.USER_STORAGE_KEY);
          if (onSessionExpiredCallback) {
            onSessionExpiredCallback();
          }
          reject(refreshErr);
        } finally {
          isRefreshing = false;
        }
      });
    }

    return Promise.reject(error);
  }
);

// Utility helper to extract user-friendly error messages from API response
export const extractErrorMessage = (error: any, fallback = 'Đã có lỗi xảy ra. Vui lòng thử lại.'): string => {
  if (axios.isAxiosError(error)) {
    const apiError = error.response?.data as ApiResponse | undefined;
    if (apiError?.message) {
      if (apiError.errors && apiError.errors.length > 0) {
        return `${apiError.message}: ${apiError.errors.join(', ')}`;
      }
      return apiError.message;
    }
    if (error.message === 'Network Error') {
      return 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra mạng hoặc địa chỉ máy chủ.';
    }
  }
  return error?.message || fallback;
};

export default apiClient;
