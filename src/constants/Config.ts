import Constants from 'expo-constants';
import { Platform } from 'react-native';

const getDefaultApiUrl = () => {
  // If running via Expo Go / Metro Bundler, auto-detect computer's LAN IP
  const hostUri = Constants.expoConfig?.hostUri ?? (Constants as unknown as { manifest2?: { extra?: { expoClient?: { hostUri?: string } } } })?.manifest2?.extra?.expoClient?.hostUri;
  const hostIp = hostUri?.split(':')[0];

  if (hostIp && !hostIp.includes('localhost') && !hostIp.includes('127.0.0.1')) {
    return `http://${hostIp}:5130/api`;
  }

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
