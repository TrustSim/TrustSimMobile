import { Platform } from 'react-native';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { Config } from '../constants/Config';
import apiClient, { extractErrorMessage } from './apiClient';
import { appStorage } from './storage';
import { ApiResponse, EkycSubmitResultDto, KycStatusDto, UserKycHistoryQueryFilter } from '../types';

export const normalizeImageUri = (uri: string): string => {
  if (!uri) return '';
  let clean = uri.trim();

  // Only decode if the URI scheme itself was percent-encoded (e.g. "file%3A%2F%2F...").
  // Do NOT decode "%2540anonymous" or "%40anonymous" inside a valid "file:///" URI,
  // because Expo Go on Android literally names the cache directory "%40anonymous" on disk!
  while (/^file%3A/i.test(clean)) {
    try {
      clean = decodeURIComponent(clean);
    } catch {
      break;
    }
  }

  if (
    clean.startsWith('content://') ||
    clean.startsWith('http://') ||
    clean.startsWith('https://') ||
    clean.startsWith('data:')
  ) {
    return clean;
  }

  // Strip any combination of leading file: or slashes and ensure 3-slash file:/// URI
  clean = clean.replace(/^(file:\/+)+/i, '');
  clean = clean.replace(/^\/+/, '');

  return `file:///${clean}`;
};

const prepareImageForUpload = async (rawUri: string): Promise<string> => {
  const normalized = normalizeImageUri(rawUri);
  if (!normalized || Platform.OS === 'web') {
    return normalized;
  }
  try {
    const result = await manipulateAsync(
      normalized,
      [{ resize: { width: 1280 } }],
      { compress: 0.82, format: SaveFormat.JPEG }
    );
    // Return result.uri directly without decoding any % characters in the path
    return result?.uri || normalized;
  } catch (err) {
    console.log('[eKYC] manipulateAsync fallback to original URI:', err);
    return normalized;
  }
};

export const kycService = {
  // Submit 3-step live camera captured photos for AI AWS Rekognition eKYC
  async submitEkyc(
    frontCardUri: string,
    backCardUri: string,
    selfieUri: string
  ): Promise<ApiResponse<EkycSubmitResultDto>> {
    const [cleanFront, cleanBack, cleanSelfie] = await Promise.all([
      prepareImageForUpload(frontCardUri),
      backCardUri ? prepareImageForUpload(backCardUri) : Promise.resolve(''),
      prepareImageForUpload(selfieUri),
    ]);

    console.log('[eKYC] Uploading prepared URIs:', {
      baseUrl: Config.API_BASE_URL,
      cleanFront,
      cleanBack,
      cleanSelfie,
    });

    const buildFormData = () => {
      const formData = new FormData();

      // Front CCCD Card
      formData.append('FrontCardImage', {
        uri: cleanFront,
        name: 'front_cccd.jpg',
        type: 'image/jpeg',
      } as any);

      // Back CCCD Card
      if (cleanBack) {
        formData.append('BackCardImage', {
          uri: cleanBack,
          name: 'back_cccd.jpg',
          type: 'image/jpeg',
        } as any);
      }

      // Live Front Selfie
      formData.append('SelfieImage', {
        uri: cleanSelfie,
        name: 'selfie_face.jpg',
        type: 'image/jpeg',
      } as any);

      return formData;
    };

    const sendMultipartWithFetch = async (token: string | null) => {
      const headers: Record<string, string> = {
        Accept: 'application/json',
        'ngrok-skip-browser-warning': 'true',
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      return fetch(`${Config.API_BASE_URL}/users/kyc/submit-ekyc`, {
        method: 'POST',
        headers,
        body: buildFormData(),
      });
    };

    try {
      let token = await appStorage.getItem(Config.TOKEN_STORAGE_KEY);
      let response = await sendMultipartWithFetch(token);

      // If access token expired while capturing photos, refresh token and retry once
      if (response.status === 401) {
        try {
          const refreshRes = await apiClient.post<ApiResponse<{ token: string }>>(
            '/auth/refresh-token',
            {}
          );
          const newToken = refreshRes.data?.data?.token;
          if (newToken) {
            await appStorage.setItem(Config.TOKEN_STORAGE_KEY, newToken);
            token = newToken;
            response = await sendMultipartWithFetch(token);
          }
        } catch {
          // Ignore refresh failure, handle response below
        }
      }

      const rawText = await response.text();
      let parsed: ApiResponse<EkycSubmitResultDto> | null = null;
      try {
        parsed = rawText ? JSON.parse(rawText) : null;
      } catch {
        parsed = null;
      }

      if (!response.ok) {
        const serverMessage =
          parsed?.message && parsed?.errors?.length
            ? `${parsed.message}: ${parsed.errors.join(', ')}`
            : parsed?.message || `Máy chủ trả về mã lỗi ${response.status}. Vui lòng thử lại.`;
        throw new Error(serverMessage);
      }

      if (!parsed) {
        throw new Error('Phản hồi từ máy chủ không hợp lệ. Vui lòng thử lại.');
      }

      return parsed;
    } catch (err: any) {
      console.warn('[eKYC Upload Warning]', err?.message || err);
      const userMessage = extractErrorMessage(
        err,
        'Xác thực eKYC không thành công. Vui lòng thử lại.'
      );
      throw new Error(userMessage);
    }
  },

  // Get current user eKYC status and PKI key issuance state
  async getKycStatus(): Promise<ApiResponse<KycStatusDto>> {
    const res = await apiClient.get<ApiResponse<KycStatusDto>>('/users/kyc/status');
    return res.data;
  },

  // Confirm eKYC analysis intent (Phase 2 confirmation)
  async confirmEkyc(verificationId: string): Promise<ApiResponse<any>> {
    const res = await apiClient.post<ApiResponse<any>>('/users/kyc/confirm-ekyc', {
      verificationId,
    });
    return res.data;
  },

  // Get user's KYC verification submission history
  async getKycHistory(params?: UserKycHistoryQueryFilter): Promise<ApiResponse<any>> {
    const res = await apiClient.get<ApiResponse<any>>('/users/kyc/history', {
      params,
    });
    return res.data;
  },
};
