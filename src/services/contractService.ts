import apiClient from './apiClient';
import { Config } from '../constants/Config';
import {
  ApiResponse,
  ContractIntegrityResultDto,
  ContractOtpSendResultDto,
  ContractPreviewDto,
  ContractSignResultDto,
} from '../types';

export const contractService = {
  // Preview 3-party contract content and signature status
  async preview(tradeId: string): Promise<ApiResponse<ContractPreviewDto>> {
    const res = await apiClient.get<ApiResponse<ContractPreviewDto>>(`/contracts/${tradeId}/preview`);
    return res.data;
  },

  // Request Email OTP for contract signing
  async sendOtp(tradeId: string): Promise<ApiResponse<ContractOtpSendResultDto>> {
    const res = await apiClient.post<ApiResponse<ContractOtpSendResultDto>>(`/contracts/${tradeId}/send-otp`, {});
    return res.data;
  },

  // Sign e-Contract with OTP and optional handwritten signature / biometric auth
  async sign(
    tradeId: string,
    otpCode: string,
    handwrittenSignatureBase64?: string,
    authMethod: 'OTP' | 'BIOMETRIC' | 'BIOMETRIC_AND_OTP' = 'OTP'
  ): Promise<ApiResponse<ContractSignResultDto>> {
    const payload: any = { otpCode, authMethod };
    if (handwrittenSignatureBase64) {
      payload.signatureImageBase64 = handwrittenSignatureBase64;
    }
    const res = await apiClient.post<ApiResponse<ContractSignResultDto>>(`/contracts/${tradeId}/sign`, payload);
    return res.data;
  },

  // Get direct CDN or streaming URL for downloading signed PAdES PDF
  getDownloadUrl(tradeId: string): string {
    return `${Config.API_BASE_URL}/contracts/${tradeId}/download`;
  },

  // Verify contract document integrity & PAdES X.509 digital seal
  async verifyIntegrity(tradeId: string, clientSha256: string): Promise<ApiResponse<ContractIntegrityResultDto>> {
    const res = await apiClient.post<ApiResponse<ContractIntegrityResultDto>>(`/contracts/${tradeId}/verify-integrity`, {
      clientSha256,
    });
    return res.data;
  },
};
