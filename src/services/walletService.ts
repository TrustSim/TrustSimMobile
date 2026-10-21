import apiClient from './apiClient';
import {
  ApiResponse,
  DepositRequestDto,
  DepositResponseDto,
  PagedResult,
  StatementItemDto,
  WalletDto,
  WalletTransactionDto,
  WithdrawRequestDto,
} from '../types';

export const walletService = {
  // Get current user's wallet overview
  async getWallet(): Promise<ApiResponse<WalletDto>> {
    const res = await apiClient.get<ApiResponse<WalletDto>>('/wallets/me');
    return res.data;
  },

  // Get deposit/withdraw transaction history
  async getTransactions(params?: {
    type?: string;
    status?: string;
    fromDate?: string;
    toDate?: string;
    pageIndex?: number;
    pageSize?: number;
  }): Promise<ApiResponse<PagedResult<WalletTransactionDto>>> {
    const res = await apiClient.get<ApiResponse<PagedResult<WalletTransactionDto>>>('/wallets/transactions', {
      params,
    });
    return res.data;
  },

  // Get single transaction details (used for VietQR payment polling)
  async getTransactionById(id: string): Promise<ApiResponse<WalletTransactionDto>> {
    const res = await apiClient.get<ApiResponse<WalletTransactionDto>>(`/wallets/transactions/${id}`);
    return res.data;
  },

  // Get unified financial statement (topup, withdraw, escrow, deposits)
  async getStatement(params?: {
    type?: string;
    search?: string;
    fromDate?: string;
    toDate?: string;
    pageIndex?: number;
    pageSize?: number;
  }): Promise<ApiResponse<PagedResult<StatementItemDto>>> {
    const res = await apiClient.get<ApiResponse<PagedResult<StatementItemDto>>>('/wallets/statement', {
      params,
    });
    return res.data;
  },

  // Create VietQR SePay Deposit request with Idempotency Key
  async deposit(data: DepositRequestDto): Promise<ApiResponse<DepositResponseDto>> {
    const idempotencyKey = data.idempotencyKey || `DEP_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const res = await apiClient.post<ApiResponse<DepositResponseDto>>('/wallets/deposit', data, {
      headers: {
        'Idempotency-Key': idempotencyKey,
      },
    });
    return res.data;
  },

  // Request bank withdrawal with Idempotency Key
  async withdraw(data: WithdrawRequestDto): Promise<ApiResponse<any>> {
    const idempotencyKey = data.idempotencyKey || `WTH_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const res = await apiClient.post<ApiResponse<any>>('/wallets/withdraw', data, {
      headers: {
        'Idempotency-Key': idempotencyKey,
      },
    });
    return res.data;
  },

  // Create Idempotent Deposit Intent
  async createDepositIntent(amount: number, idempotencyKey?: string): Promise<ApiResponse<any>> {
    const key = idempotencyKey || `INT_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const res = await apiClient.post<ApiResponse<any>>('/wallets/deposit-intent', {
      amount,
      idempotencyKey: key,
    });
    return res.data;
  },
};
