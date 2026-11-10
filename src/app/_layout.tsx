import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { modeDemo } from '../api';
import { BandeauPrototype, Notification } from '../components/ui';
import { SessionProvider, useSession } from '../session/SessionProvider';
import { useTheme } from '../theme';

function Cadre() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { notification, fermerNotification } = useSession();
  return (
    <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: insets.top }}>
      <StatusBar style="auto" />
      {modeDemo && <BandeauPrototype />}
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.bg } }} />
      {/* Dernier enfant : la notification passe au-dessus du reste */}
      <Notification visible={notification} onClose={fermerNotification} top={insets.top + 8} />
    </View>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SessionProvider>
        <Cadre />
      </SessionProvider>
    </SafeAreaProvider>
  );
}
