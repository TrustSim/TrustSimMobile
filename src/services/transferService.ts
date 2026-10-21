import apiClient from './apiClient';
import {
  ApiResponse,
  SimTransferConfirmResultDto,
  SimTransferProgressDto,
} from '../types';

export const transferService = {
  // Check progress of SIM handover and Escrow lock status
  async getProgress(tradeId: string): Promise<ApiResponse<SimTransferProgressDto>> {
    const res = await apiClient.get<ApiResponse<SimTransferProgressDto>>(`/simtransfers/${tradeId}`);
    return res.data;
  },

  // Seller uploads telco point-of-sale handover certificate/proof
  async submitProof(tradeId: string, imageUrl: string, description: string): Promise<ApiResponse<any>> {
    const res = await apiClient.post<ApiResponse<any>>(`/simtransfers/${tradeId}/proof`, {
      imageUrl,
      description,
    });
    return res.data;
  },

  // Buyer confirms SIM has network signal -> releases Escrow funds to seller and triggers PAdES liquidation
  async confirmTransfer(tradeId: string): Promise<ApiResponse<SimTransferConfirmResultDto>> {
    const res = await apiClient.post<ApiResponse<SimTransferConfirmResultDto>>(`/simtransfers/${tradeId}/confirm`, {});
    return res.data;
  },
};
