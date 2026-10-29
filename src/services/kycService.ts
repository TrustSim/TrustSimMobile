import apiClient, { extractErrorMessage } from './apiClient';
import { ApiResponse, EkycSubmitResultDto, KycStatusDto, UserKycHistoryQueryFilter } from '../types';

export const normalizeImageUri = (uri: string): string => {
  if (!uri) return '';
  let clean = uri.trim();

  // Iteratively unwrap multi-level URL encoding (e.g. from nested navigation route params)
  for (let i = 0; i < 5; i++) {
    try {
      if (!clean.includes('%')) break;
      const decoded = decodeURIComponent(clean);
      if (decoded === clean) break;
      clean = decoded;
    } catch {
      break;
    }
  }

  // Remove redundant duplicated file:// prefixes
  clean = clean.replace(/^(file:\/\/)+/, 'file://');
  clean = clean.replace(/^file:\/\/file:\/?\/?/, 'file:///');

  // Ensure valid scheme for React Native native network stack
  if (
    !clean.startsWith('file://') &&
    !clean.startsWith('content://') &&
    !clean.startsWith('http://') &&
    !clean.startsWith('https://')
  ) {
    clean = `file://${clean}`;
  }

  return clean;
};

export const kycService = {
  // Submit 3-step live camera captured photos for AI AWS Rekognition eKYC
  async submitEkyc(
    frontCardUri: string,
    backCardUri: string,
    selfieUri: string
  ): Promise<ApiResponse<EkycSubmitResultDto>> {
    const cleanFront = normalizeImageUri(frontCardUri);
    const cleanBack = normalizeImageUri(backCardUri);
    const cleanSelfie = normalizeImageUri(selfieUri);

    console.log('[eKYC] Uploading normalized URIs:', { cleanFront, cleanBack, cleanSelfie });

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

    try {
      const res = await apiClient.post<ApiResponse<EkycSubmitResultDto>>(
        '/users/kyc/submit-ekyc',
        formData,
        {
          timeout: 90000, // 90s timeout for network upload + AWS AI processing
          transformRequest: (data) => data,
        }
      );

      return res.data;
    } catch (err: any) {
      console.error('[eKYC Network Error]', err?.response?.data || err?.message || err);
      const userMessage = extractErrorMessage(err, 'Xác thực eKYC không thành công. Vui lòng thử lại.');
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
