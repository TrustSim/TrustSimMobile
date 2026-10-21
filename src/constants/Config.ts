import { Platform } from 'react-native';

const getDefaultApiUrl = () => {
  if (Platform.OS === 'android') {
    // Android emulator alias for host machine
    return 'http://10.0.2.2:5130/api';
  }
  // iOS simulator, macOS, or Web
  return 'http://localhost:5130/api';
};

export const Config = {
  API_BASE_URL: process.env.EXPO_PUBLIC_API_URL || getDefaultApiUrl(),
  TIMEOUT_MS: 15000,
  APP_NAME: 'TrustSim',
  APP_VERSION: '1.0.0',
  DEFAULT_PAGE_SIZE: 15,
  SEPAY_POLL_INTERVAL_MS: 2500,
  TOKEN_STORAGE_KEY: 'trustsim_access_token',
  USER_STORAGE_KEY: 'trustsim_user_data',
};
