import { Text } from 'react-native';
import { police, useTheme } from '../theme';

/** Mention des droits d'auteur, affichée dans l'application. */
export const MENTION_DROITS = '© 2026 Bruno Mauneau – tous droits réservés';

export function Droits({ clair = false }: { clair?: boolean }) {
  const t = useTheme();
  return (
    <Text style={{ color: clair ? 'rgba(24,31,46,0.55)' : t.textMuted, fontSize: 12, textAlign: 'center', ...police('400') }}>
      {MENTION_DROITS}
    </Text>
  );
}
