import { useColorScheme } from 'react-native';

const light = {
  bg: '#F4F5F7',
  surface: '#FFFFFF',
  surfaceAlt: '#EEF0F4',
  text: '#16181D',
  textMuted: '#5B6170',
  border: '#DDE1E8',
  primary: '#2F4BD8',
  primaryText: '#FFFFFF',
  success: '#1E8E5A',
  successBg: '#E3F5EC',
  warning: '#B25E09',
  warningBg: '#FDF0DF',
  danger: '#C23B3B',
  dangerBg: '#FBE6E6',
  waiting: '#4C5BD4',
  waitingBg: '#E8EAFB',
  chartLine: '#2F4BD8',
  chartRef: '#B25E09',
};

const dark: typeof light = {
  bg: '#0F1115',
  surface: '#191C22',
  surfaceAlt: '#232731',
  text: '#ECEEF2',
  textMuted: '#9AA1AF',
  border: '#2C313C',
  primary: '#7D93FF',
  primaryText: '#0F1115',
  success: '#5BD198',
  successBg: '#16301F',
  warning: '#F2A75B',
  warningBg: '#35260F',
  danger: '#F08080',
  dangerBg: '#3A1A1A',
  waiting: '#9CA7FF',
  waitingBg: '#1F2340',
  chartLine: '#7D93FF',
  chartRef: '#F2A75B',
};

export type Theme = typeof light;

export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? dark : light;
}
