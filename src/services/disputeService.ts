import apiClient from './apiClient';
import {
  ApiResponse,
  CreateDisputeRequestDto,
  DisputeTicketDto,
  PagedResult,
} from '../types';

export const disputeService = {
  // Lấy danh sách khiếu nại của người dùng hiện tại
  async getMyDisputes(filter?: {
    pageIndex?: number;
    pageSize?: number;
    status?: string;
  }): Promise<ApiResponse<PagedResult<DisputeTicketDto>>> {
    const res = await apiClient.get<ApiResponse<PagedResult<DisputeTicketDto>>>('/disputes', {
      params: filter,
    });
    return res.data;
  },

  // Lấy chi tiết một hồ sơ khiếu nại
  async getById(id: string): Promise<ApiResponse<DisputeTicketDto>> {
    const res = await apiClient.get<ApiResponse<DisputeTicketDto>>(`/disputes/${id}`);
    return res.data;
  },

  // Mở hồ sơ khiếu nại mới kèm lý do và bằng chứng
  async createDispute(payload: CreateDisputeRequestDto): Promise<ApiResponse<DisputeTicketDto>> {
    const res = await apiClient.post<ApiResponse<DisputeTicketDto>>('/disputes', payload);
    return res.data;
  },
};

