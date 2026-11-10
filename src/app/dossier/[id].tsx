import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { DetailScreen } from '../../screens/DetailScreen';
import { useMaintenant, useSession } from '../../session/SessionProvider';
import { useTheme } from '../../theme';

export default function DetailVoeu() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { dossier } = useSession();
  const maintenant = useMaintenant();
  const router = useRouter();
  const t = useTheme();
  const retour = () => (router.canGoBack() ? router.back() : router.replace('/dossier'));

  const voeu = dossier?.voeux.find((v) => v.id === id);
  if (!voeu) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 }}>
        <Text style={{ color: t.text, fontSize: 16 }}>Ce vœu n’existe pas ou plus dans votre dossier.</Text>
        <Pressable onPress={retour} accessibilityRole="button">
          <Text style={{ color: t.primary, fontWeight: '700' }}>Retour à mes vœux</Text>
        </Pressable>
      </View>
    );
  }
  return <DetailScreen voeu={voeu} maintenant={maintenant} onRetour={retour} />;
}
