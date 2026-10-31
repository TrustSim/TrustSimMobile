import apiClient from './apiClient';
import { ApiResponse, SimValuationDto } from '../types';

export const aiValuationService = {
  /**
   * Thẩm định & định giá SIM bằng AI (Mô hình Toán học + RAG + NVIDIA LLM)
   */
  async estimatePrice(params: {
    phoneNumber?: string;
    simNumberId?: string;
  }): Promise<ApiResponse<SimValuationDto>> {
    const isGuid = (id?: string) =>
      Boolean(id && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id));

    const body: { phoneNumber?: string; simNumberId?: string } = {};
    if (params.phoneNumber) {
      body.phoneNumber = params.phoneNumber.replace(/\D/g, '');
    }
    if (isGuid(params.simNumberId)) {
      body.simNumberId = params.simNumberId;
    }

    const res = await apiClient.post<ApiResponse<SimValuationDto>>('/ai/valuation/estimate', body);
    return res.data;
  },

  /**
   * Áp dụng mức giá do AI định giá trực tiếp vào số SIM
   */
  async applyValuation(valuationId: string): Promise<ApiResponse<boolean>> {
    const res = await apiClient.post<ApiResponse<boolean>>(`/ai/valuation/apply/${valuationId}`, {});
    return res.data;
  },
};

