import { Platform } from 'react-native';

// Trust Ledger Design System — Swiss Fintech Minimal
export const Colors = {
  // Brand
  navy: '#0B1F3A',         // Primary trust color — headers, key text
  blue: '#1666C5',         // Action blue — CTAs, interactive elements
  amber: '#D99216',        // Trust ID / verification badges ONLY
  amberLight: '#FEF3C7',

  // Status — only for state indication
  success: '#16A34A',
  successLight: '#DCFCE7',
  danger: '#DC2626',
  dangerLight: '#FEE2E2',
  warning: '#D97706',
  warningLight: '#FEF3C7',

  // Surfaces
  background: '#F6F8FB',   // App background
  surface: '#FFFFFF',      // Cards, sheets
  surfaceAlt: '#F0F4F8',   // Alternate surface, pressed state

  // Borders
  border: '#E4E9F0',
  borderLight: '#EEF2F7',

  // Text
  text: '#0B1F3A',         // Primary text (= navy)
  textSecondary: '#4B5768',
  textMuted: '#8C9DB5',
  textInverse: '#FFFFFF',

  // Shadows
  cardShadow: 'rgba(11, 31, 58, 0.06)',
  overlay: 'rgba(11, 31, 58, 0.55)',

  // Legacy aliases (keep for backward compat with existing components)
  primary: '#0B1F3A',
  primaryDark: '#060F1E',
  primaryLight: '#1666C5',
  accent: '#D99216',
  accentLight: '#FEF3C7',

  light: {
    text: '#0B1F3A',
    background: '#F6F8FB',
    surface: '#FFFFFF',
    border: '#E4E9F0',
    primary: '#0B1F3A',
    accent: '#D99216',
    backgroundElement: '#F0F4F8',
    backgroundSelected: '#E4E9F0',
    textSecondary: '#4B5768',
  },
  dark: {
    text: '#F6F8FB',
    background: '#060F1E',
    surface: '#0F1E30',
    border: '#1E3048',
    primary: '#1666C5',
    accent: '#D99216',
    backgroundElement: '#162030',
    backgroundSelected: '#1E304A',
    textSecondary: '#8C9DB5',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

// IBM Plex Sans — system fallback until expo-google-fonts installed
export const Fonts = Platform.select({
  ios: {
    sans: 'System',
    mono: 'Courier',
  },
  android: {
    sans: 'sans-serif',
    mono: 'monospace',
  },
  default: {
    sans: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "'IBM Plex Sans', system-ui, sans-serif",
    mono: "'IBM Plex Mono', monospace",
  },
});

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  // Legacy aliases
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BorderRadius = {
  xs: 6,
  sm: 8,
  md: 12,
  lg: 14,
  xl: 16,
  full: 9999,
} as const;

export const Shadows = {
  card: {
    shadowColor: '#0B1F3A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  modal: {
    shadowColor: '#0B1F3A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 10,
  },
  elevated: {
    shadowColor: '#0B1F3A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
};

// Touch target minimum — 44dp per HIG / Material
export const MinTouchTarget = 44;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;

// Motion timing — 180–240ms, state feedback only
export const Motion = {
  fast: 180,
  normal: 220,
  slow: 300,
};
