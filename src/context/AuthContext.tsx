import React, { createContext, useContext, useEffect, useState } from 'react';
import { Config } from '../constants/Config';
import { apiClient, setOnSessionExpired } from '../services/apiClient';
import { authService } from '../services/authService';
import { contractService } from '../services/contractService';
import { appStorage } from '../services/storage';
import { walletService } from '../services/walletService';
import {
  AuthResponseDto,
  LoginRequestDto,
  RegisterInitiatedDto,
  RegisterRequestDto,
  TradeTransactionDto,
  UserProfileDto,
  VerifyEmailRequestDto,
  WalletDto,
} from '../types';

function isTradeEscrowHeld(t: TradeTransactionDto): boolean {
  const es = String(t.escrowStatus || '').toUpperCase();
  if (es === 'HELD' || es === 'FROZEN') return true;
  if (
    es === 'RELEASED' ||
    es === 'REFUNDED' ||
    es === 'CANCELLED' ||
    es === 'PENDING_FUNDING'
  ) {
    return false;
  }
  const st = String(t.status || '').trim();
  return (
    st === 'PendingSignature' ||
    st === 'PendingContractSigning' ||
    st === 'PendingTransfer' ||
    st === 'PendingVerification' ||
    st === 'Disputed'
  );
}

function computeEscrowBalance(trades: TradeTransactionDto[], currentUserId?: string): number {
  const heldTrades = trades.filter(isTradeEscrowHeld);
  if (heldTrades.length === 0) return 0;

  if (currentUserId) {
    const uid = currentUserId.toLowerCase();
    const buyerHeld = heldTrades.filter((t) => (t.buyerId || '').toLowerCase() === uid);
    if (buyerHeld.length > 0) {
      return buyerHeld.reduce((sum, t) => sum + (t.escrowAmount ?? 0), 0);
    }
  }

  return heldTrades.reduce((sum, t) => sum + (t.escrowAmount ?? 0), 0);
}

interface AuthContextType {
  user: AuthResponseDto | null;
  profile: UserProfileDto | null;
  wallet: WalletDto | null;
  escrowBalance: number;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (data: LoginRequestDto) => Promise<void>;
  register: (data: RegisterRequestDto) => Promise<RegisterInitiatedDto>;
  verifyEmail: (data: VerifyEmailRequestDto) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshWallet: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthResponseDto | null>(null);
  const [profile, setProfile] = useState<UserProfileDto | null>(null);
  const [wallet, setWallet] = useState<WalletDto | null>(null);
  const [escrowBalance, setEscrowBalance] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadProfileAndWallet = React.useCallback(async (knownUserId?: string) => {
    try {
      const [profileRes, walletRes, tradesRes] = await Promise.allSettled([
        authService.getProfile(),
        walletService.getWallet(),
        contractService.getMyContracts({ pageIndex: 1, pageSize: 50 }),
      ]);

      let resolvedUserId = knownUserId;
      if (profileRes.status === 'fulfilled' && profileRes.value.success && profileRes.value.data) {
        setProfile(profileRes.value.data);
        resolvedUserId = resolvedUserId || profileRes.value.data.userId;
      }

      let computedEscrow = 0;
      if (
        tradesRes.status === 'fulfilled' &&
        tradesRes.value.success &&
        tradesRes.value.data?.items
      ) {
        computedEscrow = computeEscrowBalance(tradesRes.value.data.items, resolvedUserId);
        setEscrowBalance(computedEscrow);
      }

      if (walletRes.status === 'fulfilled' && walletRes.value.success && walletRes.value.data) {
        const w = walletRes.value.data;
        const avail = w.availableBalance ?? 0;
        const locked = w.lockedBalance ?? 0;
        const escrow = w.escrowBalance ?? computedEscrow;
        setWallet({
          ...w,
          escrowBalance: escrow,
          totalBalance: avail + locked + escrow,
        });
      }
    } catch {
      // Silently ignore if offline
    }
  }, []);

  // Initialize session from persistent storage
  useEffect(() => {
    const initAuth = async () => {
      try {
        const storedToken = await appStorage.getItem(Config.TOKEN_STORAGE_KEY);
        const storedUser = await appStorage.getItem(Config.USER_STORAGE_KEY);

        if (storedToken && storedUser) {
          const parsedUser: AuthResponseDto = JSON.parse(storedUser);
          setUser(parsedUser);
          apiClient.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
          loadProfileAndWallet(parsedUser?.userId);
        }
      } catch (err) {
        console.warn('Init auth failed:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();

    // Register session expired handler
    setOnSessionExpired(() => {
      setUser(null);
      setProfile(null);
      setWallet(null);
      setEscrowBalance(0);
    });
  }, [loadProfileAndWallet]);

  const login = React.useCallback(
    async (data: LoginRequestDto) => {
      setIsLoading(true);
      try {
        const res = await authService.login(data);
        if (res.success && res.data) {
          const authData = res.data;
          setUser(authData);
          await appStorage.setItem(Config.TOKEN_STORAGE_KEY, authData.token);
          await appStorage.setItem(Config.USER_STORAGE_KEY, JSON.stringify(authData));
          apiClient.defaults.headers.common['Authorization'] = `Bearer ${authData.token}`;
          await loadProfileAndWallet(authData.userId);
        } else {
          throw new Error(res.message || 'Đăng nhập không thành công');
        }
      } finally {
        setIsLoading(false);
      }
    },
    [loadProfileAndWallet]
  );

  const register = React.useCallback(
    async (data: RegisterRequestDto): Promise<RegisterInitiatedDto> => {
      const res = await authService.register(data);
      if (res.success && res.data) {
        return res.data;
      }
      throw new Error(res.message || 'Khởi tạo đăng ký thất bại');
    },
    []
  );

  const verifyEmail = React.useCallback(
    async (data: VerifyEmailRequestDto) => {
      setIsLoading(true);
      try {
        const res = await authService.verifyEmail(data);
        if (res.success && res.data) {
          const authData = res.data;
          setUser(authData);
          await appStorage.setItem(Config.TOKEN_STORAGE_KEY, authData.token);
          await appStorage.setItem(Config.USER_STORAGE_KEY, JSON.stringify(authData));
          apiClient.defaults.headers.common['Authorization'] = `Bearer ${authData.token}`;
          await loadProfileAndWallet(authData.userId);
        } else {
          throw new Error(res.message || 'Xác thực OTP email thất bại');
        }
      } finally {
        setIsLoading(false);
      }
    },
    [loadProfileAndWallet]
  );

  const logout = React.useCallback(async () => {
    setUser(null);
    setProfile(null);
    setWallet(null);
    setEscrowBalance(0);
    delete apiClient.defaults.headers.common['Authorization'];
    try {
      await appStorage.removeItem(Config.TOKEN_STORAGE_KEY);
      await appStorage.removeItem(Config.USER_STORAGE_KEY);
    } catch (err) {
      console.warn('Error clearing storage:', err);
    }
    authService.logout().catch(() => {});
  }, []);

  const refreshProfile = React.useCallback(async () => {
    try {
      const res = await authService.getProfile();
      if (res.success) {
        setProfile(res.data);
      }
    } catch {
      // Silently ignore if offline
    }
  }, []);

  const refreshWallet = React.useCallback(async () => {
    try {
      const [walletRes, tradesRes] = await Promise.allSettled([
        walletService.getWallet(),
        contractService.getMyContracts({ pageIndex: 1, pageSize: 50 }),
      ]);

      let computedEscrow = escrowBalance;
      if (
        tradesRes.status === 'fulfilled' &&
        tradesRes.value.success &&
        tradesRes.value.data?.items
      ) {
        computedEscrow = computeEscrowBalance(
          tradesRes.value.data.items,
          user?.userId || profile?.userId
        );
        setEscrowBalance(computedEscrow);
      }

      if (walletRes.status === 'fulfilled' && walletRes.value.success && walletRes.value.data) {
        const w = walletRes.value.data;
        const avail = w.availableBalance ?? 0;
        const locked = w.lockedBalance ?? 0;
        const escrow = w.escrowBalance ?? computedEscrow;
        setWallet({
          ...w,
          escrowBalance: escrow,
          totalBalance: avail + locked + escrow,
        });
      }
    } catch {
      // Silently ignore if offline
    }
  }, [escrowBalance, user?.userId, profile?.userId]);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        wallet,
        escrowBalance,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        verifyEmail,
        logout,
        refreshProfile,
        refreshWallet,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
