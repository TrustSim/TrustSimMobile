import apiClient from './apiClient';
import {
  ApiResponse,
  AuthResponseDto,
  LoginRequestDto,
  RegisterInitiatedDto,
  RegisterRequestDto,
  UserProfileDto,
  VerifyEmailRequestDto,
} from '../types';

export const authService = {
  // Step 1: Request account registration & send email OTP
  async register(data: RegisterRequestDto): Promise<ApiResponse<RegisterInitiatedDto>> {
    const res = await apiClient.post<ApiResponse<RegisterInitiatedDto>>('/auth/register', data);
    return res.data;
  },

  // Step 2: Verify email OTP & activate account
  async verifyEmail(data: VerifyEmailRequestDto): Promise<ApiResponse<AuthResponseDto>> {
    const res = await apiClient.post<ApiResponse<AuthResponseDto>>('/auth/verify-email', data);
    return res.data;
  },

  // Login with UserName/Email & Password
  async login(data: LoginRequestDto): Promise<ApiResponse<AuthResponseDto>> {
    const res = await apiClient.post<ApiResponse<AuthResponseDto>>('/auth/login', data);
    return res.data;
  },

  // Manually refresh access token
  async refreshToken(): Promise<ApiResponse<AuthResponseDto>> {
    const res = await apiClient.post<ApiResponse<AuthResponseDto>>('/auth/refresh-token', {});
    return res.data;
  },

  // Logout current session
  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout', {});
    } catch (e) {
      console.warn('Logout API failed:', e);
    }
  },

  // Get current user profile details
  async getProfile(): Promise<ApiResponse<UserProfileDto>> {
    const res = await apiClient.get<ApiResponse<UserProfileDto>>('/auth/profile');
    return res.data;
  },

  // Update profile information (Full Name, Phone, Address, Identity Number, Date of Birth)
  async updateProfile(data: {
    fullName?: string;
    phoneNumber?: string;
    address?: string;
    identityNumber?: string;
    dateOfBirth?: string;
  }): Promise<ApiResponse<UserProfileDto>> {
    const res = await apiClient.put<ApiResponse<UserProfileDto>>('/auth/profile', data);
    return res.data;
  },

  // Change password for logged-in user
  async changePassword(data: {
    currentPassword: string;
    newPassword: string;
    confirmNewPassword?: string;
  }): Promise<ApiResponse<boolean>> {
    const res = await apiClient.put<ApiResponse<boolean>>('/auth/change-password', {
      currentPassword: data.currentPassword,
      newPassword: data.newPassword,
      confirmNewPassword: data.confirmNewPassword || data.newPassword,
    });
    return res.data;
  },

  // Send OTP for forgot password flow
  async forgotPassword(email: string): Promise<ApiResponse<string>> {
    const res = await apiClient.post<ApiResponse<string>>('/auth/forgot-password', { email });
    return res.data;
  },

  // Reset password using OTP
  async resetPassword(data: {
    email: string;
    resetCode?: string;
    otpCode?: string;
    newPassword: string;
    confirmNewPassword?: string;
  }): Promise<ApiResponse<boolean>> {
    const res = await apiClient.post<ApiResponse<boolean>>('/auth/reset-password', {
      email: data.email,
      resetCode: data.resetCode || data.otpCode || '',
      newPassword: data.newPassword,
      confirmNewPassword: data.confirmNewPassword || data.newPassword,
    });
    return res.data;
  },
};
