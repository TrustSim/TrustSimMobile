import { Platform } from 'react-native';

export const Colors = {
  // Primary TrustSim Identity (Synced with Web Frontend #001743 + #E4011E + Gold)
  primary: '#001743',
  primaryDark: '#000F2E',
  primaryLight: '#1E3A8A',
  accent: '#1D4ED8',
  accentLight: '#EFF6FF',
  crimson: '#E4011E',
  crimsonSoft: '#FFF1F2',

  // Collector & Auction Gold
  gold: '#D97706',
  goldBright: '#F59E0B',
  goldSoft: '#FFFBEB',
  goldBorder: '#FDE68A',

  // Soft-Cloud Navy design system tokens (TRUSTSIM_DESIGN_SYSTEM.md)
  navy2: '#0B2A6B',
  indigo: '#4C5FD5',
  periwinkle: '#8C9CFF',
  ink: '#0B1630',
  cloud1: '#F1F3FF',
  cloud2: '#DFE5FF',
  cloud3: '#C7D0FF',
  chipBg: '#EEF1FF',
  glass: 'rgba(255, 255, 255, 0.82)',
  line: 'rgba(0, 23, 67, 0.08)',

  // Semantic aliases
  navy: '#001743',
  navyMid: '#0A2558',
  navyLight: '#173775',
  blue: '#1D4ED8',
  blueSoft: '#EFF6FF',
  blueBorder: '#BFDBFE',
  amber: '#D97706',
  amberLight: '#FEF3C7',

  // Backgrounds & Surfaces (Warm-Cool Alabaster & Pure White Cards)
  background: '#F7F8FD',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  surfaceAlt: '#F8FAFC',
  surfaceMuted: '#EEF2F7',
  cardBg: '#FFFFFF',

  // Text Hierarchy
  text: '#09152B',
  textPrimary: '#0B1630',
  textSecondary: '#5B6477',
  textMuted: '#7A8499',
  textLight: '#98A1B3',
  textInverse: '#FFFFFF',

  // Status & Trust Indicators
  success: '#059669',
  successLight: '#ECFDF5',
  successBorder: '#A7F3D0',
  warning: '#D97706',
  warningLight: '#FFFBEB',
  warningBorder: '#FDE68A',
  danger: '#E11D48',
  dangerLight: '#FFF1F2',
  dangerBorder: '#FECDD3',
  info: '#1D4ED8',
  infoLight: '#EFF6FF',
  infoBorder: '#BFDBFE',

  // Borders & Dividers
  border: 'rgba(0, 23, 67, 0.08)',
  borderLight: 'rgba(0, 23, 67, 0.05)',
  divider: 'rgba(0, 23, 67, 0.08)',

  // Overlays
  overlay: 'rgba(0, 23, 67, 0.55)',
  glassFill: 'rgba(255, 255, 255, 0.08)',
  glassBorder: 'rgba(255, 255, 255, 0.14)',

  // Carrier Colors
  viettel: '#EE0033',
  viettelSoft: '#FFF0F3',
  vinaphone: '#0066CC',
  vinaphoneSoft: '#EFF6FF',
  mobifone: '#005BAA',
  mobifoneSoft: '#F0F7FF',

  // Legacy theme hook compatibility
  light: {
    text: '#09152B',
    background: '#F7F8FD',
    tint: '#001743',
    icon: '#475569',
    tabIconDefault: '#64748B',
    tabIconSelected: '#001743',
  },
  dark: {
    text: '#F8FAFC',
    background: '#001743',
    tint: '#FFFFFF',
    icon: '#94A3B8',
    tabIconDefault: '#94A3B8',
    tabIconSelected: '#FFFFFF',
  },
};

export const Fonts = {
  sans: Platform.select({
    ios: 'System',
    android: 'sans-serif',
    default: 'System',
  }),
  medium: Platform.select({
    ios: 'System',
    android: 'sans-serif-medium',
    default: 'System',
  }),
  mono: Platform.select({
    ios: 'Menlo',
    android: 'monospace',
    default: 'monospace',
  }),
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 36,
};

export const BorderRadius = {
  xs: 10,
  sm: 14,
  md: 20,
  lg: 24,
  xl: 30,
  xxl: 36,
  full: 9999,
};

/** Chiều cao vùng nav nổi — dùng làm paddingBottom cho ScrollView của các tab. */
export const FLOATING_NAV_SPACE = 104;

export const Shadows = {
  sm: {
    shadowColor: '#001743',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  md: {
    shadowColor: '#001743',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 14,
    elevation: 4,
  },
  lg: {
    shadowColor: '#001743',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 7,
  },
  card: {
    shadowColor: '#001743',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  modal: {
    shadowColor: '#001743',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 8,
  },
  button: {
    shadowColor: '#001743',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
};

