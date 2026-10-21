import React, { createContext, useContext, useEffect, useState } from 'react';
import { Config } from '../constants/Config';
import { apiClient, setOnSessionExpired } from '../services/apiClient';
import { authService } from '../services/authService';
import { appStorage } from '../services/storage';
import { walletService } from '../services/walletService';
import {
  AuthResponseDto,
  LoginRequestDto,
  RegisterInitiatedDto,
  RegisterRequestDto,
  UserProfileDto,
  VerifyEmailRequestDto,
  WalletDto,
} from '../types';

interface AuthContextType {
  user: AuthResponseDto | null;
  profile: UserProfileDto | null;
  wallet: WalletDto | null;
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
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadProfileAndWallet = React.useCallback(async () => {
    try {
      const [profileRes, walletRes] = await Promise.allSettled([
        authService.getProfile(),
        walletService.getWallet(),
      ]);

      if (profileRes.status === 'fulfilled' && profileRes.value.success) {
        setProfile(profileRes.value.data);
      }
      if (walletRes.status === 'fulfilled' && walletRes.value.success) {
        setWallet(walletRes.value.data);
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
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          apiClient.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
          // Silently fetch fresh profile and wallet
          loadProfileAndWallet();
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
    });
  }, [loadProfileAndWallet]);

  const login = React.useCallback(async (data: LoginRequestDto) => {
    setIsLoading(true);
    try {
      const res = await authService.login(data);
      if (res.success && res.data) {
        const authData = res.data;
        setUser(authData);
        await appStorage.setItem(Config.TOKEN_STORAGE_KEY, authData.token);
        await appStorage.setItem(Config.USER_STORAGE_KEY, JSON.stringify(authData));
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${authData.token}`;
        await loadProfileAndWallet();
      } else {
        throw new Error(res.message || 'Đăng nhập không thành công');
      }
    } finally {
      setIsLoading(false);
    }
  }, [loadProfileAndWallet]);

  const register = React.useCallback(async (data: RegisterRequestDto): Promise<RegisterInitiatedDto> => {
    const res = await authService.register(data);
    if (res.success && res.data) {
      return res.data;
    }
    throw new Error(res.message || 'Khởi tạo đăng ký thất bại');
  }, []);

  const verifyEmail = React.useCallback(async (data: VerifyEmailRequestDto) => {
    setIsLoading(true);
    try {
      const res = await authService.verifyEmail(data);
      if (res.success && res.data) {
        const authData = res.data;
        setUser(authData);
        await appStorage.setItem(Config.TOKEN_STORAGE_KEY, authData.token);
        await appStorage.setItem(Config.USER_STORAGE_KEY, JSON.stringify(authData));
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${authData.token}`;
        await loadProfileAndWallet();
      } else {
        throw new Error(res.message || 'Xác thực OTP email thất bại');
      }
    } finally {
      setIsLoading(false);
    }
  }, [loadProfileAndWallet]);

  const logout = React.useCallback(async () => {
    setUser(null);
    setProfile(null);
    setWallet(null);
    delete apiClient.defaults.headers.common['Authorization'];
    try {
      await appStorage.removeItem(Config.TOKEN_STORAGE_KEY);
      await appStorage.removeItem(Config.USER_STORAGE_KEY);
    } catch (err) {
      console.warn('Error clearing storage:', err);
    }
    // Fire logout API to backend in background (non-blocking)
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
      const res = await walletService.getWallet();
      if (res.success) {
        setWallet(res.data);
      }
    } catch {
      // Silently ignore if offline
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        wallet,
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
