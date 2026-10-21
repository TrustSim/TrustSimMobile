import apiClient from './apiClient';
import { ApiResponse, EkycSubmitResultDto, KycStatusDto } from '../types';

export const kycService = {
  // Submit 3-step live camera captured photos for AI AWS Rekognition eKYC
  async submitEkyc(
    frontCardUri: string,
    backCardUri: string,
    selfieUri: string
  ): Promise<ApiResponse<EkycSubmitResultDto>> {
    const formData = new FormData();

    // Front CCCD Card
    formData.append('FrontCardImage', {
      uri: frontCardUri,
      name: 'front_cccd.jpg',
      type: 'image/jpeg',
    } as any);

    // Back CCCD Card
    formData.append('BackCardImage', {
      uri: backCardUri,
      name: 'back_cccd.jpg',
      type: 'image/jpeg',
    } as any);

    // Live Front Selfie
    formData.append('SelfieImage', {
      uri: selfieUri,
      name: 'selfie_face.jpg',
      type: 'image/jpeg',
    } as any);

    const res = await apiClient.post<ApiResponse<EkycSubmitResultDto>>('/users/kyc/submit-ekyc', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return res.data;
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
  async getKycHistory(params?: {
    pageIndex?: number;
    pageSize?: number;
    sortBy?: string;
  }): Promise<ApiResponse<any>> {
    const res = await apiClient.get<ApiResponse<any>>('/users/kyc/history', {
      params,
    });
    return res.data;
  },
};
