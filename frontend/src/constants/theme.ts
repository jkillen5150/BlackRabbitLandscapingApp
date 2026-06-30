/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#1F2E23',
    background: '#F8F4EC',
    backgroundElement: '#F0EBE0',
    backgroundSelected: '#E6DFD0',
    textSecondary: '#5C6B5E',
    primary: '#2D5A3D',
    primaryLight: '#4A7C59',
    accent: '#D97706',
    card: '#FFFFFF',
    success: '#166534',
    border: '#D4CBB8',
  },
  dark: {
    text: '#F8F4EC',
    background: '#1A211C',
    backgroundElement: '#242C26',
    backgroundSelected: '#2F3A32',
    textSecondary: '#A3AFA5',
    primary: '#4A7C59',
    primaryLight: '#6A9A75',
    accent: '#D97706',
    card: '#242C26',
    success: '#4ADE80',
    border: '#3F4A40',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
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
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
