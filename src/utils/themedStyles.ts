/**
 * Theme-aware style utilities
 * Provides consistent colors for dark and light mode across the app
 */

export interface ThemedColors {
  // Backgrounds
  background: string;
  backgroundGradient: string[];
  backgroundSecondary: string;
  card: string;
  cardElevated: string;

  // Text
  text: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;

  // Primary (brand)
  primary: string;
  primaryLight: string;
  primaryDark: string;

  // Borders
  border: string;
  borderLight: string;

  // Input
  inputBackground: string;
  inputBorder: string;
  inputText: string;
  inputPlaceholder: string;

  // Status
  error: string;
  errorBackground: string;
  success: string;
  successBackground: string;
  warning: string;
  warningBackground: string;

  // Modal
  modalOverlay: string;
  modalBackground: string;
}

export const lightColors: ThemedColors = {
  // Backgrounds
  background: '#f8fbff',
  backgroundGradient: ['#e0f2fe', '#f0f9ff', '#ffffff'],
  backgroundSecondary: '#eaf6ff',
  card: '#ffffff',
  cardElevated: '#f8fbff',

  // Text
  text: '#0f172a',            // softer than pure black
  textSecondary: '#475569',   // blue-gray, not neutral gray
  textMuted: '#94a3b8',
  textInverse: '#ffffff',

  // Primary (brand)
  primary: '#3b82f6',
  primaryLight: '#e0f2fe',
  primaryDark: '#1e40af',

  // Borders
  border: '#dbeafe',
  borderLight: '#eff6ff',

  // Input
  inputBackground: '#ffffff',
  inputBorder: '#c7ddff',
  inputText: '#0f172a',
  inputPlaceholder: '#94a3b8',

  // Status
  error: '#ef4444',
  errorBackground: '#fff1f2',

  success: '#2563eb',          // blue success = clean & on-brand
  successBackground: '#e0f2fe',

  warning: '#f59e0b',
  warningBackground: '#fffbeb',

  // Modal
  modalOverlay: 'rgba(15, 23, 42, 0.45)',
  modalBackground: '#ffffff',
};

export const darkColors: ThemedColors = {
  // Backgrounds
  background: '#02061b',
  backgroundGradient: ['#02061bff', '#052037ff', '#052b66dd'],
  backgroundSecondary: '#04152b',
  card: 'rgba(10, 35, 78, 1)',          // glass-friendly
  cardElevated: 'rgba(10, 35, 78, 0.8)',

  // Text
  text: '#e5e7eb',
  textSecondary: '#c7d2fe',
  textMuted: '#94a3b8',
  textInverse: '#02061b',

  // Primary (brand)
  primary: '#3b82f6',
  primaryLight: '#93c5fd',
  primaryDark: '#1e40af',

  // Borders
  border: 'rgba(148, 163, 184, 0.18)',
  borderLight: 'rgba(148, 163, 184, 0.28)',

  // Input
  inputBackground: 'rgba(6, 24, 54, 0.7)',
  inputBorder: 'rgba(148, 163, 184, 0.3)',
  inputText: '#e5e7eb',
  inputPlaceholder: '#94a3b8',

  // Status
  error: '#f87171',
  errorBackground: 'rgba(127, 29, 29, 0.45)',

  success: '#60a5fa',                   // blue success (on-brand)
  successBackground: 'rgba(30, 64, 175, 0.35)',

  warning: '#fbbf24',
  warningBackground: 'rgba(120, 53, 15, 0.45)',

  // Modal
  modalOverlay: 'rgba(2, 6, 27, 0.75)',
  modalBackground: '#04152b',
};

export const getThemedColors = (isDark: boolean): ThemedColors => {
  return isDark ? darkColors : lightColors;
};
