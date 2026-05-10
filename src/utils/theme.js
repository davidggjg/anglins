export const COLORS = {
  // Primary palette - deep navy with electric accents
  bg: '#0A0E1A',
  bgCard: '#131929',
  bgCardLight: '#1A2235',
  bgCardMed: '#1E2A40',

  // Accent colors
  primary: '#6C63FF',     // Electric purple
  primaryLight: '#8B84FF',
  primaryDark: '#4A43CC',

  secondary: '#00D4AA',   // Mint green
  secondaryLight: '#33DFB9',
  secondaryDark: '#00A882',

  accent: '#FF6B35',      // Warm orange
  accentLight: '#FF8B5E',
  accentDark: '#CC4F1A',

  gold: '#FFD700',
  goldLight: '#FFE44D',

  // Status
  success: '#00D4AA',
  error: '#FF4757',
  warning: '#FF9F43',
  info: '#54A0FF',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#A8B2D0',
  textMuted: '#5A6484',
  textOnPrimary: '#FFFFFF',

  // UI
  border: '#1E2A40',
  borderLight: '#2A3A55',
  overlay: 'rgba(0,0,0,0.7)',

  // Level colors
  A1: '#00D4AA',
  A2: '#54A0FF',
  B1: '#6C63FF',
  B2: '#FF9F43',
  C1: '#FF6B35',
  C2: '#FFD700',
};

export const FONTS = {
  // Using Expo built-in system fonts with fallbacks
  heading: 'System',
  body: 'System',
};

export const SIZES = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,

  // Border radius
  radiusSm: 8,
  radiusMd: 16,
  radiusLg: 24,
  radiusFull: 999,

  // Text sizes
  textXs: 11,
  textSm: 13,
  textMd: 15,
  textLg: 18,
  textXl: 22,
  textXxl: 28,
  textXxxl: 36,
};

export const SHADOWS = {
  sm: {
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  md: {
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  lg: {
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  glow: {
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 15,
  },
};

export const LEVEL_INFO = {
  A1: { label: 'מתחיל', emoji: '🌱', color: '#00D4AA', xpRequired: 0 },
  A2: { label: 'בסיסי', emoji: '🌿', color: '#54A0FF', xpRequired: 500 },
  B1: { label: 'בינוני', emoji: '🌳', color: '#6C63FF', xpRequired: 1500 },
  B2: { label: 'מתקדם', emoji: '🏅', color: '#FF9F43', xpRequired: 3000 },
  C1: { label: 'מצטיין', emoji: '🏆', color: '#FF6B35', xpRequired: 6000 },
  C2: { label: 'מומחה', emoji: '👑', color: '#FFD700', xpRequired: 10000 },
};
