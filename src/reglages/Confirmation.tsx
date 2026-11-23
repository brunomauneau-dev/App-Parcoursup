import { Modal, Pressable, Text, View } from 'react-native';
import { police, useTheme } from '../theme';

/**
 * Fenêtre de confirmation, identique sur téléphone et sur le web
 * (Alert.alert ne fonctionne pas dans un navigateur).
 */
export function Confirmation({
  visible,
  titre,
  message,
  confirmer,
  annuler = 'Annuler',
  danger = false,
  onConfirmer,
  onAnnuler,
}: {
  visible: boolean;
  titre: string;
  message: string;
  confirmer: string;
  annuler?: string;
  danger?: boolean;
  onConfirmer: () => void;
  onAnnuler: () => void;
}) {
  const t = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onAnnuler}>
      <Pressable
        onPress={onAnnuler}
        accessibilityLabel="Fermer"
        style={{ flex: 1, backgroundColor: 'rgba(12,18,32,0.55)', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      >
        <Pressable
          onPress={() => {}}
          accessibilityRole="alert"
          style={{ backgroundColor: t.surface, borderRadius: 22, padding: 22, gap: 12, width: '100%', maxWidth: 380 }}
        >
          <Text style={{ color: t.text, fontSize: 19, ...police('800') }}>{titre}</Text>
          <Text style={{ color: t.textMuted, fontSize: 15, lineHeight: 22, ...police('400') }}>{message}</Text>
          <View style={{ gap: 10, marginTop: 6 }}>
            <Pressable
              onPress={onConfirmer}
              accessibilityRole="button"
              style={({ pressed }) => ({
                backgroundColor: danger ? t.danger : t.primary,
                borderRadius: 14,
                paddingVertical: 14,
                alignItems: 'center',
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 16, ...police('700') }}>{confirmer}</Text>
            </Pressable>
            <Pressable
              onPress={onAnnuler}
              accessibilityRole="button"
              style={({ pressed }) => ({ borderRadius: 14, paddingVertical: 12, alignItems: 'center', opacity: pressed ? 0.6 : 1 })}
            >
              <Text style={{ color: t.primary, fontSize: 16, ...police('700') }}>{annuler}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
