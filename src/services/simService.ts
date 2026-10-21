import apiClient from './apiClient';
import {
  ApiResponse,
  PagedResult,
  SimOwnershipDto,
  SimOwnershipSortBy,
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
  async getMyOwnerships(params?: {
    search?: string;
    sortBy?: SimOwnershipSortBy;
    pageIndex?: number;
    pageSize?: number;
  }): Promise<ApiResponse<PagedResult<SimOwnershipDto>>> {
    const res = await apiClient.get<ApiResponse<PagedResult<SimOwnershipDto>>>('/sims/my-ownerships', {
      params,
    });
    return res.data;
  },

  // Register new SIM for sale/auction
  async registerSim(data: SimRegisterRequestDto): Promise<ApiResponse<any>> {
    const res = await apiClient.post<ApiResponse<any>>('/sims/register', data);
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
