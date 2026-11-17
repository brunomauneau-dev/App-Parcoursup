import {
  Figtree_400Regular,
  Figtree_500Medium,
  Figtree_600SemiBold,
  Figtree_700Bold,
  Figtree_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/figtree';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform, ScrollView, Text, View } from 'react-native';
import type { ErrorBoundaryProps } from 'expo-router';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { modeDemo } from '../api';
import { BandeauPrototype, Notification } from '../components/ui';
import { DemoAutoProvider } from '../demo/DemoAuto';
import { SessionProvider, useSession } from '../session/SessionProvider';
import { useTheme } from '../theme';

function Cadre() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { notification, fermerNotification } = useSession();
  return (
    <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: insets.top }}>
      <StatusBar style="dark" />
      {modeDemo && <BandeauPrototype />}
      <DemoAutoProvider>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.bg } }} />
        {/* La notification passe au-dessus du reste */}
        <Notification visible={notification} onClose={fermerNotification} top={insets.top + 8} />
      </DemoAutoProvider>
    </View>
  );
}

export default function RootLayout() {
  // Sur le web, Figtree est servie par Google Fonts (balise <link> de la page).
  const [policesChargees] = useFonts(
    Platform.OS === 'web'
      ? {}
      : { Figtree_400Regular, Figtree_500Medium, Figtree_600SemiBold, Figtree_700Bold, Figtree_800ExtraBold },
  );
  if (!policesChargees && Platform.OS !== 'web') return null;
  return (
    <SafeAreaProvider>
      <SessionProvider>
        <Cadre />
      </SessionProvider>
    </SafeAreaProvider>
  );
}

/** Affiche la cause d'une erreur au lieu d'un écran blanc, pour pouvoir la signaler. */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 64, gap: 12 }} style={{ backgroundColor: '#FFFFFF' }}>
      <Text style={{ fontSize: 20, fontWeight: '800', color: '#C23B3B' }}>Une erreur est survenue</Text>
      <Text style={{ fontSize: 15, color: '#16181D' }}>Faites une capture de cet écran et envoyez-la.</Text>
      <Text selectable style={{ fontSize: 14, color: '#16181D', fontWeight: '700' }}>
        {error.name} : {error.message}
      </Text>
      <Text selectable style={{ fontSize: 12, color: '#5B6170' }}>
        {(error.stack ?? '').split('\n').slice(0, 12).join('\n')}
      </Text>
      <Text onPress={retry} style={{ fontSize: 16, color: '#2F4BD8', fontWeight: '700', paddingVertical: 12 }}>
        Réessayer
      </Text>
    </ScrollView>
  );
}
