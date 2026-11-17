import { Platform, TextStyle } from 'react-native';

/**
 * Couleurs et typographie reprises de la maquette Claude Design
 * « Parcoursup Dossier » (direction « service public »).
 * Mode clair uniquement pendant la phase de test.
 */
const palette = {
  bg: '#F3F5F9',
  surface: '#FFFFFF',
  surfaceAlt: '#F3F5F9',
  text: '#181F2E',
  textMuted: '#5B6375',
  border: '#E1E5EC',

  /** Bleu « service public » : carte d'accueil, onglet actif, boutons */
  primary: '#005D84',
  primaryDark: '#004E71',
  primaryText: '#FFFFFF',
  /** Orange : pastilles de notification, points d'alerte */
  accent: '#D73817',

  success: '#07562F',
  successBg: '#D2F6DD',
  successDot: '#14874E',
  warning: '#7A4D00',
  warningBg: '#FFEBC2',
  warningDot: '#D49838',
  danger: '#B42318',
  dangerBg: '#FDE7E4',
  neutralBg: '#ECEEF2',
  neutralDot: '#A1A8B3',

  info: '#DDE7FB',
  gaugeTrack: '#E4E8EF',
  gaugeZone: '#ADDFBD',

  // Compatibilité avec les composants existants
  waiting: '#7A4D00',
  waitingBg: '#FFEBC2',
  chartLine: '#005D84',
  chartRef: '#14874E',
};

export type Theme = typeof palette;

export function useTheme(): Theme {
  return palette;
}

type Graisse = '400' | '500' | '600' | '700' | '800';

const NOMS: Record<Graisse, string> = {
  '400': 'Figtree_400Regular',
  '500': 'Figtree_500Medium',
  '600': 'Figtree_600SemiBold',
  '700': 'Figtree_700Bold',
  '800': 'Figtree_800ExtraBold',
};

/**
 * Police Figtree à la graisse demandée.
 * Sur téléphone, chaque graisse est un fichier distinct (chargé dans _layout) ;
 * sur le web, la police est servie par Google Fonts et la graisse s'applique normalement.
 */
export function police(graisse: Graisse = '400'): TextStyle {
  if (Platform.OS === 'web') return { fontFamily: 'Figtree, system-ui, sans-serif', fontWeight: graisse };
  return { fontFamily: NOMS[graisse] };
}
