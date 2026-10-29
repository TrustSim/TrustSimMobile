import { apiClient } from './apiClient';
import {
  ApiResponse,
  FormatRhythmDto,
  PagedResult,
  SimOwnershipDto,
  SimOwnershipQueryFilter,
  SimRegisterRequestDto,
} from '../types';

export const simService = {
  // Phase 1: Send SMS OTP to phone number (Proof of Possession)
  async sendSimOtp(phoneNumber: string): Promise<ApiResponse<any>> {
    const res = await apiClient.post<ApiResponse<any>>('/sims/ownership-verification/send-otp', {
      phoneNumber,
    });
    return res.data;
  },

  // Phase 2: Verify SMS OTP & audit against Telco Carrier gateway (Proof of Legal Ownership)
  async verifySimOtp(phoneNumber: string, otpCode: string): Promise<ApiResponse<any>> {
    const res = await apiClient.post<ApiResponse<any>>('/sims/ownership-verification/verify', {
      phoneNumber,
      otpCode,
    });
    return res.data;
  },

  // Get user's verified SIM inventory with search and sorting
  async getMyOwnerships(
    params?: SimOwnershipQueryFilter & { search?: string }
  ): Promise<ApiResponse<PagedResult<SimOwnershipDto>>> {
    const cleanParams: Record<string, any> = {};
    if (params) {
      if (params.pageIndex !== undefined) cleanParams.pageIndex = params.pageIndex;
      if (params.pageSize !== undefined) cleanParams.pageSize = params.pageSize;
      const kw = params.keyword || params.search;
      if (kw) cleanParams.keyword = kw.trim();
      if (params.status) cleanParams.status = params.status;
      if (params.simId) cleanParams.simId = params.simId;
      if (params.sortBy !== undefined) cleanParams.sortBy = params.sortBy;
      if (params.sortOrder !== undefined) cleanParams.sortOrder = params.sortOrder;
      if (params.fromDate) cleanParams.fromDate = params.fromDate;
      if (params.toDate) cleanParams.toDate = params.toDate;
    }
    const res = await apiClient.get<ApiResponse<PagedResult<SimOwnershipDto>>>('/sims/my-ownerships', {
      params: cleanParams,
    });
    return res.data;
  },

  // Get list of Format Rhythms (Sảnh tiến, Lặp đôi, Tứ quý,...)
  async getFormatRhythms(): Promise<ApiResponse<FormatRhythmDto[]>> {
    const res = await apiClient.get<ApiResponse<FormatRhythmDto[]>>('/format-rhythms');
    return res.data;
  },

  // Register new SIM for sale/auction
  async registerSim(data: SimRegisterRequestDto): Promise<ApiResponse<any>> {
    const res = await apiClient.post<ApiResponse<any>>('/sims/register', {
      phoneNumber: data.phoneNumber,
      formatRhythmId: data.formatRhythmId,
      categoryIds: data.categoryIds,
      phonePrefixId: data.phonePrefixId,
    });
    return res.data;
  },

  // Browse public SIM inventory on marketplace
  async getSims(params?: {
    keyword?: string;
    carrierId?: string;
    categoryId?: string;
    prefixId?: string;
    pageIndex?: number;
    pageSize?: number;
    minPrice?: number;
    maxPrice?: number;
  }): Promise<ApiResponse<PagedResult<any>>> {
    const res = await apiClient.get<ApiResponse<PagedResult<any>>>('/sims', {
      params,
    });
    return res.data;
  },

  // Get details of a single SIM by ID
  async getSimById(id: string): Promise<ApiResponse<any>> {
    const res = await apiClient.get<ApiResponse<any>>(`/sims/${id}`);
    return res.data;
  },

  // Get user's own SIM listings
  async getMySims(params?: {
    keyword?: string;
    pageIndex?: number;
    pageSize?: number;
  }): Promise<ApiResponse<PagedResult<any>>> {
    const res = await apiClient.get<ApiResponse<PagedResult<any>>>('/sims/my-sims', {
      params,
    });
    return res.data;
  },
};
