import { Redirect, Stack } from 'expo-router';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useSession } from '../../session/SessionProvider';
import { useTheme } from '../../theme';

/** Toutes les pages du dossier exigent une session ouverte. */
export default function DossierLayout() {
  const { statut, dossier, erreur, rafraichir } = useSession();
  const t = useTheme();

  if (statut === 'deconnecte') return <Redirect href="/connexion" />;

  if (!dossier) {
    // Session restaurée mais premier chargement impossible (réseau, service saturé)
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 }}>
        {erreur ? (
          <>
            <Text style={{ color: t.text, fontSize: 16, textAlign: 'center' }}>{erreur}</Text>
            <Pressable onPress={rafraichir} accessibilityRole="button" style={{ padding: 12 }}>
              <Text style={{ color: t.primary, fontWeight: '700', fontSize: 16 }}>Réessayer</Text>
            </Pressable>
          </>
        ) : (
          <ActivityIndicator color={t.primary} />
        )}
      </View>
    );
  }

  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.bg } }} />;
}
