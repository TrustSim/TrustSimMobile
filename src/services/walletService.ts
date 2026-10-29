import apiClient from './apiClient';
import {
  ApiResponse,
  DepositRequestDto,
  DepositResponseDto,
  PagedResult,
  StatementItemDto,
  UnifiedStatementQueryFilter,
  WalletDto,
  WalletTransactionDto,
  WalletTransactionQueryFilter,
  WithdrawRequestDto,
} from '../types';

export const walletService = {
  // Get current user's wallet overview
  async getWallet(): Promise<ApiResponse<WalletDto>> {
    const res = await apiClient.get<ApiResponse<WalletDto>>('/wallets/me');
    return res.data;
  },

  // Get deposit/withdraw transaction history
  async getTransactions(
    params?: WalletTransactionQueryFilter
  ): Promise<ApiResponse<PagedResult<WalletTransactionDto>>> {
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
  async getStatement(
    params?: UnifiedStatementQueryFilter & { search?: string; type?: string }
  ): Promise<ApiResponse<PagedResult<StatementItemDto>>> {
    const cleanParams: Record<string, any> = {};
    if (params) {
      if (params.pageIndex !== undefined) cleanParams.pageIndex = params.pageIndex;
      if (params.pageSize !== undefined) cleanParams.pageSize = params.pageSize;
      const kw = params.keyword || params.search;
      if (kw) cleanParams.keyword = kw.trim();
      if (params.sourceType) cleanParams.sourceType = params.sourceType;
      if (params.direction) cleanParams.direction = params.direction;
      if (params.status) cleanParams.status = params.status;
      const txType = params.transactionType || params.type;
      if (txType) cleanParams.transactionType = txType;
      if (params.minAmount !== undefined) cleanParams.minAmount = params.minAmount;
      if (params.maxAmount !== undefined) cleanParams.maxAmount = params.maxAmount;
      if (params.fromDate) cleanParams.fromDate = params.fromDate;
      if (params.toDate) cleanParams.toDate = params.toDate;
      if (params.sortBy !== undefined) cleanParams.sortBy = params.sortBy;
      if (params.sortOrder !== undefined) cleanParams.sortOrder = params.sortOrder;
    }
    const res = await apiClient.get<ApiResponse<PagedResult<StatementItemDto>>>('/wallets/statement', {
      params: cleanParams,
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
