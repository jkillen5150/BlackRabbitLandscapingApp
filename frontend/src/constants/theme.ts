/**
 * Black Rabbit — Apple-zen design system.
 * Eggshell canvas, white cards, deep forest ink, one clear action.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#1A1A1A',
    background: '#F7F4EF', // eggshell
    backgroundElement: '#F0EBE3',
    backgroundSelected: '#E8F0EB',
    textSecondary: '#6B6B6B',
    primary: '#1E3932',
    primaryLight: '#2F6B4F',
    accent: '#8A7355',
    card: '#FFFFFF',
    success: '#2F6B4F',
    border: '#E8E4DC',
    muted: '#9A9A9A',
    danger: '#B42318',
    onPrimary: '#FFFFFF',
    softGreen: '#EEF5F1',
    softGold: '#F5F0E8',
  },
  dark: {
    text: '#F7F4EF',
    background: '#0F1210',
    backgroundElement: '#1A1F1C',
    backgroundSelected: '#24332B',
    textSecondary: '#A3AFA6',
    primary: '#3D9B6E',
    primaryLight: '#5BB88A',
    accent: '#C4A882',
    card: '#1A1F1C',
    success: '#4ADE80',
    border: '#2A322C',
    muted: '#7A877E',
    danger: '#F97066',
    onPrimary: '#0B120F',
    softGreen: '#1A2E24',
    softGold: '#2A2618',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 12,
  four: 16,
  five: 24,
  six: 32,
  seven: 48,
  eight: 64,
} as const;

export const Radius = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

export const Type = {
  hero: 32,
  title: 24,
  section: 17,
  body: 16,
  label: 12,
  caption: 12,
} as const;

export const Shadows = {
  card: {
    shadowColor: '#1A1A1A',
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  soft: {
    shadowColor: '#1A1A1A',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 520;
export const APP_NAV_HEIGHT = 56;

/** Routes hidden from the dock (still reachable via router) */
export const HIDDEN_TAB_ROUTES = new Set(['pros', 'leads']);
